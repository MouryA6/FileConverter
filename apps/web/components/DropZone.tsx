"use client";

import { ChangeEvent, PointerEvent, useCallback, useMemo, useRef, useState } from "react";
import { FileRejection, useDropzone } from "react-dropzone";
import { FileStack, FileUp, Lock, PackageOpen, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { ConversionProgress } from "@/components/ConversionProgress";
import { DownloadCard } from "@/components/DownloadCard";
import { FormatPicker } from "@/components/FormatPicker";
import { Conversion, CONVERSIONS, targetExtension } from "@/lib/formats";
import { JobFileStatus, downloadJob, getJobStatus, startBatchConversion, startConversion } from "@/lib/api";

const MAX_BYTES = 100 * 1024 * 1024;
const MAX_BATCH_FILES = 20;
const MAX_BATCH_BYTES = 250 * 1024 * 1024;
const SOURCE_ALIASES: Record<string, string[]> = {
  JPG: ["jpeg"],
  PPTX: ["ppt"]
};
const SUPPORTED_SOURCES = new Set(
  CONVERSIONS.flatMap((nextConversion) => [
    nextConversion.from.toLowerCase(),
    ...(SOURCE_ALIASES[nextConversion.from] ?? [])
  ])
);

function formatMegabytes(bytes: number) {
  return `${Math.round(bytes / 1024 / 1024)}MB`;
}

function fileExtension(filename: string) {
  return filename.includes(".") ? filename.split(".").pop()?.toLowerCase() ?? "" : "";
}

function supportedConversionForFile(file: File, conversion: Conversion) {
  const ext = fileExtension(file.name);
  return ext === conversion.from.toLowerCase() || (SOURCE_ALIASES[conversion.from] ?? []).includes(ext);
}

type DropZoneProps = {
  conversion?: Conversion;
};

function debugDropZone(event: string, details: Record<string, unknown> = {}) {
  console.info(`[DropZone] ${event}`, {
    at: new Date().toISOString(),
    ...details
  });
}

export function DropZone({ conversion }: DropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedConversion, setSelectedConversion] = useState<Conversion>(conversion ?? CONVERSIONS[0]);
  const [files, setFiles] = useState<File[]>([]);
  const [outputMode, setOutputMode] = useState<"separate" | "combined">("separate");
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("Waiting for file");
  const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "complete" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [resultName, setResultName] = useState<string | undefined>();
  const [downloadState, setDownloadState] = useState<"ready" | "downloading" | "downloaded">("ready");
  const [fileStatuses, setFileStatuses] = useState<JobFileStatus[]>([]);

  const validateSelectedFiles = useCallback((nextFiles: File[], conversionToCheck: Conversion, mode: "separate" | "combined") => {
    if (!nextFiles.length) {
      return "Choose at least one file.";
    }

    if (nextFiles.length > MAX_BATCH_FILES) {
      return `You can upload up to ${MAX_BATCH_FILES} files per batch.`;
    }

    const oversizedFile = nextFiles.find((nextFile) => nextFile.size > MAX_BYTES);
    if (oversizedFile) {
      return `${oversizedFile.name} is over the ${formatMegabytes(MAX_BYTES)} per-file limit.`;
    }

    const totalSize = nextFiles.reduce((sum, nextFile) => sum + nextFile.size, 0);
    if (totalSize > MAX_BATCH_BYTES) {
      return `Batch uploads can be up to ${formatMegabytes(MAX_BATCH_BYTES)} total.`;
    }

    const unsupportedFile = nextFiles.find((nextFile) => !SUPPORTED_SOURCES.has(fileExtension(nextFile.name)));
    if (unsupportedFile) {
      return `${unsupportedFile.name} is not a supported source file type.`;
    }

    const mismatchedFile = nextFiles.find((nextFile) => !supportedConversionForFile(nextFile, conversionToCheck));
    if (mismatchedFile) {
      return `${mismatchedFile.name} does not match ${conversionToCheck.from} to ${conversionToCheck.to}. Select ${conversionToCheck.from} files or choose a different conversion.`;
    }

    if (nextFiles.length > 1 && mode === "combined" && targetExtension(conversionToCheck.to) !== "pdf") {
      return "Combined output is currently available when the destination format is PDF. Choose separate files for this format.";
    }

    return null;
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    if (!acceptedFiles.length) {
      return;
    }

    const validationError = validateSelectedFiles(acceptedFiles, selectedConversion, outputMode);
    if (validationError) {
      setError(validationError);
      return;
    }

    setFiles(acceptedFiles);
    setFileStatuses([]);
  }, [outputMode, selectedConversion, validateSelectedFiles]);

  const onDropRejected = useCallback((fileRejections: FileRejection[]) => {
    const firstRejection = fileRejections[0];
    const firstError = firstRejection?.errors[0];
    if (firstError?.code === "file-too-large" && firstRejection.file) {
      setError(`${firstRejection.file.name} is over the ${formatMegabytes(MAX_BYTES)} per-file limit.`);
      return;
    }
    if (firstError?.code === "too-many-files") {
      setError(`You can upload up to ${MAX_BATCH_FILES} files per batch.`);
      return;
    }
    setError(firstError?.message ?? "One or more files could not be selected.");
  }, []);

  const { getRootProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    multiple: true,
    maxFiles: MAX_BATCH_FILES,
    maxSize: MAX_BYTES,
    noClick: true,
    noKeyboard: true
  });

  function openFilePicker(source: string) {
    const input = fileInputRef.current;
    debugDropZone("openFilePicker", {
      source,
      hasInput: Boolean(input),
      inputType: input?.type,
      inputMultiple: input?.multiple,
      inputDisabled: input?.disabled,
      inputConnected: input?.isConnected
    });
    input?.click();
  }

  function selectFilesFromInput(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    debugDropZone("inputChange", {
      count: selectedFiles.length,
      names: selectedFiles.map((file) => file.name)
    });
    onDrop(selectedFiles);
    event.target.value = "";
  }

  function logPointerDown(event: PointerEvent<HTMLDivElement>) {
    const target = event.target instanceof Element ? event.target : null;
    debugDropZone("pointerDown", {
      button: event.button,
      pointerType: event.pointerType,
      targetTag: target?.tagName,
      targetText: target?.textContent?.slice(0, 80)
    });
  }

  const targetFormat = targetExtension(selectedConversion.to);
  const canCombine = targetFormat === "pdf";
  const canConvert = useMemo(
    () => Boolean(files.length && selectedConversion && (outputMode === "separate" || canCombine)),
    [files.length, selectedConversion, outputMode, canCombine]
  );

  function selectConversion(nextConversion: Conversion) {
    setSelectedConversion(nextConversion);
    setFileStatuses([]);
    if (targetExtension(nextConversion.to) !== "pdf" && outputMode === "combined") {
      setOutputMode("separate");
    }
    if (files.length) {
      setError(validateSelectedFiles(files, nextConversion, targetExtension(nextConversion.to) === "pdf" ? outputMode : "separate"));
    }
  }

  async function convertFile() {
    if (!files.length || !selectedConversion) {
      return;
    }

    const validationError = validateSelectedFiles(files, selectedConversion, outputMode);
    if (validationError) {
      setError(validationError);
      return;
    }

    const nextJobId = crypto.randomUUID();
    setJobId(nextJobId);
    setStatus("uploading");
    setStage("Encrypting upload...");
    setProgress(12);
    setDownloadState("ready");
    setFileStatuses(files.map((file) => ({ filename: file.name, status: "queued", progress: 0 })));

    try {
      if (files.length > 1) {
        await startBatchConversion(files, targetFormat, nextJobId, outputMode);
      } else {
        await startConversion(files[0], targetFormat, nextJobId);
      }
      setStatus("processing");
      setStage("Processing in secure container...");
      setProgress(24);

      const interval = window.setInterval(async () => {
        try {
          const job = await getJobStatus(nextJobId);
          setProgress(job.progress);
          setStage(job.stage);
          setFileStatuses(job.files ?? []);

          if (job.status === "complete") {
            window.clearInterval(interval);
            setStatus("complete");
            setStage("Done");
            setProgress(100);
            setResultName(job.resultName);
          }

          if (job.status === "error") {
            window.clearInterval(interval);
            setStatus("error");
            setError(job.errorMessage ?? "Conversion failed.");
            setFileStatuses(job.files ?? []);
          }
        } catch (pollError) {
          window.clearInterval(interval);
          setStatus("error");
          setError(pollError instanceof Error ? pollError.message : "Unable to poll conversion status.");
        }
      }, 1500);
    } catch (conversionError) {
      setStatus("error");
      setError(conversionError instanceof Error ? conversionError.message : "Unable to start conversion.");
    }
  }

  async function downloadConvertedFile() {
    if (!jobId || downloadState !== "ready") {
      return;
    }

    setError(null);
    setDownloadState("downloading");

    try {
      const blob = await downloadJob(jobId);
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = resultName ?? `fileflux.${targetExtension(selectedConversion.to)}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
      setDownloadState("downloaded");
    } catch (downloadError) {
      setDownloadState("ready");
      setError(downloadError instanceof Error ? downloadError.message : "Download failed. Please convert the file again.");
    }
  }

  function resetConverter() {
    setFiles([]);
    setJobId(null);
    setProgress(0);
    setStage("Waiting for file");
    setStatus("idle");
    setError(null);
    setResultName(undefined);
    setDownloadState("ready");
    setOutputMode("separate");
    setFileStatuses([]);
  }

  return (
    <section className="space-y-6">
      <div
        {...getRootProps()}
        onPointerDownCapture={logPointerDown}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            debugDropZone("keyboardOpen", { key: event.key });
            openFilePicker("keyboard");
          }
        }}
        role="button"
        tabIndex={0}
        className={`relative mx-auto flex min-h-60 w-full max-w-3xl cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center transition ${
          isDragActive ? "border-accent bg-accent/10 animate-pulse-glow" : "border-border bg-surface/80 hover:border-accent"
        }`}
      >
        <input
          ref={fileInputRef}
          aria-label="Choose files to convert"
          className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0"
          multiple
          onClick={(event) => {
            debugDropZone("inputClick", {
              defaultPrevented: event.defaultPrevented,
              inputConnected: event.currentTarget.isConnected,
              inputMultiple: event.currentTarget.multiple
            });
          }}
          onChange={selectFilesFromInput}
          type="file"
        />
        <div className="pointer-events-none flex flex-col items-center justify-center">
          <FileUp className="mb-4 h-10 w-10 text-accent2" />
          <p className="text-xl font-semibold">
            {files.length === 0 ? "Drop your files here" : files.length === 1 ? files[0].name : `${files.length} files selected`}
          </p>
          <p className="mt-2 max-w-md text-sm text-muted">
            Select one file or many. Files are validated locally, sent over TLS, processed in isolation, and purged after download.
          </p>
          {files.length > 1 ? (
            <div className="mt-4 max-w-md text-xs text-zinc-400">
              {files.slice(0, 3).map((nextFile) => nextFile.name).join(", ")}
              {files.length > 3 ? `, and ${files.length - 3} more` : ""}
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap justify-center gap-3 text-xs text-zinc-400">
            <span className="inline-flex items-center gap-1">
              <Lock className="h-3.5 w-3.5" /> Encrypted upload
            </span>
            <span className="inline-flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" /> Parallel conversions
            </span>
            <span className="inline-flex items-center gap-1">
              <Trash2 className="h-3.5 w-3.5" /> No permanent storage
            </span>
            <span>Up to {MAX_BATCH_FILES} files, {formatMegabytes(MAX_BATCH_BYTES)} per batch</span>
          </div>
        </div>
      </div>

      <FormatPicker selected={selectedConversion} onSelect={selectConversion} />

      {files.length > 1 ? (
        <div className="mx-auto grid w-full max-w-2xl gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setOutputMode("combined")}
            disabled={!canCombine}
            className={`rounded-lg border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
              outputMode === "combined"
                ? "border-accent bg-accent/15 text-white"
                : "border-border bg-surface text-zinc-300 hover:border-accent"
            }`}
          >
            <span className="flex items-center gap-2 font-semibold">
              <FileStack className="h-4 w-4" />
              Combine into one {selectedConversion.to}
            </span>
            <span className="mt-2 block text-sm text-muted">
              {canCombine ? "Best for merging slides, docs, PDFs, or images into one PDF." : "Available when the destination format is PDF."}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setOutputMode("separate")}
            className={`rounded-lg border p-4 text-left transition ${
              outputMode === "separate"
                ? "border-accent bg-accent/15 text-white"
                : "border-border bg-surface text-zinc-300 hover:border-accent"
            }`}
          >
            <span className="flex items-center gap-2 font-semibold">
              <PackageOpen className="h-4 w-4" />
              Keep separate files
            </span>
            <span className="mt-2 block text-sm text-muted">Each file is converted individually and downloaded together as a ZIP.</span>
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          disabled={!canConvert || status === "uploading" || status === "processing"}
          onClick={convertFile}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-bg disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          <ShieldCheck className="h-4 w-4" />
          {files.length > 1 && outputMode === "combined" ? `Combine to ${selectedConversion.to}` : `Convert to ${selectedConversion.to}`}
        </button>
        {files.length || status !== "idle" ? (
          <button
            type="button"
            onClick={resetConverter}
            disabled={status === "uploading" || status === "processing"}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset
          </button>
        ) : null}
      </div>

      {error ? <p className="mx-auto max-w-2xl rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}

      {status === "uploading" || status === "processing" || status === "complete" ? (
        <ConversionProgress progress={progress} stage={stage} complete={status === "complete"} />
      ) : null}

      {fileStatuses.length > 1 ? (
        <div className="mx-auto w-full max-w-2xl rounded-lg border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-medium text-zinc-200">Files</span>
            <span className="text-muted">{fileStatuses.filter((fileStatus) => fileStatus.status === "complete").length}/{fileStatuses.length}</span>
          </div>
          <div className="space-y-2">
            {fileStatuses.map((fileStatus) => (
              <div
                key={fileStatus.filename}
                className="grid gap-1 rounded-md border border-border/70 bg-bg/40 px-3 py-2 text-sm sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <span className="min-w-0 truncate text-zinc-200">{fileStatus.filename}</span>
                <span
                  className={
                    fileStatus.status === "error"
                      ? "text-red-300"
                      : fileStatus.status === "complete"
                        ? "text-success"
                        : "text-muted"
                  }
                >
                  {fileStatus.status}
                </span>
                {fileStatus.errorMessage ? <span className="text-xs text-red-200 sm:col-span-2">{fileStatus.errorMessage}</span> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {status === "complete" ? <DownloadCard onDownload={downloadConvertedFile} filename={resultName} state={downloadState} /> : null}
    </section>
  );
}
