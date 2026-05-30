import asyncio
import logging
import os
import shutil
import tempfile
import uuid
import zipfile
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

import fitz

from services.cleanup import JOB_TTL_SECONDS, mark_job
from services.analytics import popular_conversions, record_conversion
from services.converter import dispatch, is_supported_conversion, source_extension
from utils.security import sanitize_filename, validate_file
from utils.storage import delete_job

router = APIRouter()
logger = logging.getLogger("all_files_convertor.convert")
jobs: dict[str, dict] = {}
BATCH_CONCURRENCY = int(os.getenv("BATCH_CONCURRENCY", "3"))
MAX_BATCH_FILES = int(os.getenv("MAX_BATCH_FILES", "20"))
MAX_BATCH_SIZE_BYTES = int(os.getenv("MAX_BATCH_MB", "250")) * 1024 * 1024
MAX_OUTPUT_SIZE_BYTES = int(os.getenv("MAX_OUTPUT_MB", "500")) * 1024 * 1024


def _validate_supported_conversion(filename: str, target_format: str):
    if not is_supported_conversion(filename, target_format):
        source = Path(filename).suffix.lower().lstrip(".") or "unknown"
        raise HTTPException(status_code=400, detail=f"{source} to {target_format.lower()} is not supported")


@router.post("/convert", status_code=202)
async def start_conversion(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    targetFormat: str = Form(...),
    jobId: str = Form(...),
):
    try:
        uuid.UUID(jobId, version=4)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Job ID must be a valid UUID v4") from exc

    validate_file(file, targetFormat)
    content = await file.read()
    filename = sanitize_filename(file.filename or "upload")
    _validate_supported_conversion(filename, targetFormat)

    jobs[jobId] = mark_job("queued", 0, "uploading")
    logger.info("conversion_queued", extra={"job_id": jobId, "target": targetFormat.lower()})
    background_tasks.add_task(run_conversion, jobId, content, filename, targetFormat)
    return {"jobId": jobId, "status": "queued", "estimatedSeconds": 10}


@router.post("/convert-batch", status_code=202)
async def start_batch_conversion(
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    targetFormat: str = Form(...),
    jobId: str = Form(...),
    outputMode: str = Form(...),
):
    try:
        uuid.UUID(jobId, version=4)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Job ID must be a valid UUID v4") from exc

    if not files:
        raise HTTPException(status_code=400, detail="Select at least one file")
    if len(files) > MAX_BATCH_FILES:
        raise HTTPException(status_code=400, detail=f"Batch uploads can include up to {MAX_BATCH_FILES} files")
    if outputMode not in {"separate", "combined"}:
        raise HTTPException(status_code=400, detail="Output mode must be separate or combined")
    if outputMode == "combined" and targetFormat.lower() != "pdf":
        raise HTTPException(status_code=400, detail="Combined output is currently supported for PDF destinations only")

    uploads: list[tuple[bytes, str]] = []
    total_upload_size = 0
    for upload in files:
        validate_file(upload, targetFormat)
        filename = sanitize_filename(upload.filename or "upload")
        _validate_supported_conversion(filename, targetFormat)
        content = await upload.read()
        total_upload_size += len(content)
        if total_upload_size > MAX_BATCH_SIZE_BYTES:
            raise HTTPException(
                status_code=400,
                detail=f"Batch uploads can be up to {MAX_BATCH_SIZE_BYTES // 1024 // 1024}MB total",
            )
        uploads.append((content, filename))

    jobs[jobId] = mark_job("queued", 0, "uploading")
    logger.info(
        "batch_conversion_queued",
        extra={"job_id": jobId, "target": targetFormat.lower(), "file_count": len(uploads), "output_mode": outputMode},
    )
    background_tasks.add_task(run_batch_conversion, jobId, uploads, targetFormat, outputMode)
    return {"jobId": jobId, "status": "queued", "estimatedSeconds": max(10, len(uploads) * 5)}


async def run_conversion(job_id: str, content: bytes, filename: str, target_format: str):
    try:
        created_at = jobs.get(job_id, {}).get("createdAt")
        jobs[job_id] = mark_job("processing", 25, "Converting...", createdAt=created_at)
        result_path, result_name = await dispatch(content, filename, target_format)
        _ensure_output_limit([result_path])
        jobs[job_id] = mark_job(
            "complete",
            100,
            "Done",
            createdAt=created_at,
            resultPath=result_path,
            resultName=result_name,
        )
        record_conversion(source_extension(filename), target_format, "single")
        logger.info("conversion_complete", extra={"job_id": job_id, "target": target_format.lower()})
        asyncio.get_event_loop().call_later(JOB_TTL_SECONDS, delete_job, job_id, jobs)
    except Exception as exc:
        created_at = jobs.get(job_id, {}).get("createdAt")
        jobs[job_id] = mark_job("error", 0, "Failed", createdAt=created_at, errorMessage=str(exc))
        logger.warning("conversion_failed", extra={"job_id": job_id, "target": target_format.lower(), "error": str(exc)})


async def run_batch_conversion(
    job_id: str,
    uploads: list[tuple[bytes, str]],
    target_format: str,
    output_mode: str,
):
    converted_paths: list[str] = []
    try:
        total = len(uploads)
        completed = 0
        lock = asyncio.Lock()
        semaphore = asyncio.Semaphore(BATCH_CONCURRENCY)
        converted_paths = ["" for _ in uploads]
        file_statuses = [
            {"filename": filename, "status": "queued", "progress": 0}
            for _content, filename in uploads
        ]
        created_at = jobs.get(job_id, {}).get("createdAt")

        async def convert_one(index: int, content: bytes, filename: str):
            nonlocal completed
            async with semaphore:
                async with lock:
                    file_statuses[index] = {"filename": filename, "status": "processing", "progress": 20}
                    jobs[job_id] = mark_job(
                        "processing",
                        max(10, int(completed / total * 80)),
                        f"Converting {completed + 1} of {total}...",
                        createdAt=created_at,
                        files=file_statuses,
                    )

                try:
                    result_path, _result_name = await dispatch(content, filename, target_format)
                    converted_paths[index] = result_path
                except Exception as exc:
                    async with lock:
                        file_statuses[index] = {
                            "filename": filename,
                            "status": "error",
                            "progress": 0,
                            "errorMessage": str(exc),
                        }
                    raise RuntimeError(f"{filename}: {exc}") from exc

                async with lock:
                    completed += 1
                    file_statuses[index] = {"filename": filename, "status": "complete", "progress": 100}
                    jobs[job_id] = mark_job(
                        "processing",
                        max(10, int(completed / total * 80)),
                        f"Converted {completed} of {total}...",
                        createdAt=created_at,
                        files=file_statuses,
                    )

        await asyncio.gather(
            *(convert_one(index, content, filename) for index, (content, filename) in enumerate(uploads))
        )

        jobs[job_id] = mark_job("processing", 90, "Preparing download...", createdAt=created_at, files=file_statuses)

        completed_paths = [path for path in converted_paths if path]
        if len(completed_paths) != total:
            raise RuntimeError("One or more files did not finish converting")
        _ensure_output_limit(completed_paths)

        if output_mode == "combined":
            result_path, result_name = _merge_pdfs(completed_paths, "all-files-convertor-combined.pdf")
        else:
            result_path, result_name = _zip_results(completed_paths, "all-files-convertor-converted-files.zip")
        _ensure_output_limit([result_path])

        jobs[job_id] = mark_job(
            "complete",
            100,
            "Done",
            createdAt=created_at,
            resultPath=result_path,
            resultName=result_name,
            files=file_statuses,
        )
        for _content, filename in uploads:
            record_conversion(source_extension(filename), target_format, output_mode)
        logger.info(
            "batch_conversion_complete",
            extra={"job_id": job_id, "target": target_format.lower(), "file_count": len(uploads), "output_mode": output_mode},
        )
        _cleanup_intermediate_outputs(converted_paths, keep_path=result_path)
        asyncio.get_event_loop().call_later(JOB_TTL_SECONDS, delete_job, job_id, jobs)
    except Exception as exc:
        _cleanup_intermediate_outputs(converted_paths)
        created_at = jobs.get(job_id, {}).get("createdAt")
        current_files = jobs.get(job_id, {}).get("files", [])
        jobs[job_id] = mark_job(
            "error",
            0,
            "Failed",
            createdAt=created_at,
            errorMessage=str(exc),
            files=current_files,
        )
        logger.warning(
            "batch_conversion_failed",
            extra={"job_id": job_id, "target": target_format.lower(), "file_count": len(uploads), "error": str(exc)},
        )


def _zip_results(paths: list[str], result_name: str) -> tuple[str, str]:
    out_dir = Path(tempfile.mkdtemp(prefix="ff_batch_"))
    zip_path = out_dir / result_name
    used_names: set[str] = set()

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
        for index, path in enumerate(paths, start=1):
            source = Path(path)
            archive_name = source.name
            if archive_name in used_names:
                archive_name = f"{source.stem}_{index}{source.suffix}"
            used_names.add(archive_name)
            archive.write(source, archive_name)

    return str(zip_path), result_name


def _merge_pdfs(paths: list[str], result_name: str) -> tuple[str, str]:
    out_dir = Path(tempfile.mkdtemp(prefix="ff_batch_"))
    output_path = out_dir / result_name
    merged = fitz.open()

    try:
        for path in paths:
            with fitz.open(path) as source:
                merged.insert_pdf(source)
        merged.save(output_path)
    finally:
        merged.close()

    return str(output_path), result_name


def _cleanup_intermediate_outputs(paths: list[str], keep_path: str | None = None):
    keep_parent = Path(keep_path).parent if keep_path else None
    for path in paths:
        parent = Path(path).parent
        if keep_parent and parent == keep_parent:
            continue
        shutil.rmtree(parent, ignore_errors=True)


def _ensure_output_limit(paths: list[str]):
    total_size = sum(Path(path).stat().st_size for path in paths if path and Path(path).exists())
    if total_size > MAX_OUTPUT_SIZE_BYTES:
        raise RuntimeError(f"Converted output is over the {MAX_OUTPUT_SIZE_BYTES // 1024 // 1024}MB limit")


@router.get("/jobs/{job_id}/status")
def get_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    job = jobs[job_id]
    return {"jobId": job_id, **{key: value for key, value in job.items() if key != "resultPath"}}


@router.get("/jobs/{job_id}/download")
def download(job_id: str):
    if job_id not in jobs or jobs[job_id]["status"] != "complete":
        raise HTTPException(status_code=404, detail="File not ready")

    path = jobs[job_id]["resultPath"]
    name = jobs[job_id]["resultName"]

    def iterfile():
        with open(path, "rb") as output:
            yield from output
        delete_job(job_id, jobs)

    return StreamingResponse(
        iterfile(),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{name}"'},
    )


@router.delete("/jobs/{job_id}")
def manual_delete(job_id: str):
    delete_job(job_id, jobs)
    return {"deleted": True}


@router.get("/analytics/popular")
def get_popular_analytics():
    return {"conversions": popular_conversions()}
