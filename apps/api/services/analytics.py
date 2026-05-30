import json
import os
import tempfile
import threading
import time
from pathlib import Path


ANALYTICS_PATH = Path(os.getenv("ANALYTICS_PATH", Path(tempfile.gettempdir()) / "all_files_convertor_analytics.json"))
SOURCE_SLUGS = {
    "docx": "word",
    "ppt": "powerpoint",
    "pptx": "powerpoint",
    "xlsx": "excel",
    "txt": "text",
    "jpeg": "jpg",
}
TARGET_SLUGS = {
    "docx": "word",
    "ppt": "powerpoint",
    "pptx": "powerpoint",
    "xlsx": "excel",
    "txt": "text",
    "jpeg": "jpg",
}
MIX_KEYS = ("single", "batch_separate", "batch_combined")
STORE_LOCK = threading.Lock()


def _empty_store() -> dict:
    return {"conversions": {}}


def _read_store() -> dict:
    if not ANALYTICS_PATH.exists():
        return _empty_store()
    try:
        return json.loads(ANALYTICS_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return _empty_store()


def _write_store(store: dict):
    ANALYTICS_PATH.parent.mkdir(parents=True, exist_ok=True)
    temp_path = ANALYTICS_PATH.with_suffix(".tmp")
    temp_path.write_text(json.dumps(store, separators=(",", ":")), encoding="utf-8")
    temp_path.replace(ANALYTICS_PATH)


def _slug_part(value: str) -> str:
    value = value.lower()
    return SOURCE_SLUGS.get(value) or TARGET_SLUGS.get(value) or value


def conversion_slug(source_ext: str, target_format: str) -> str:
    return f"{_slug_part(source_ext)}-to-{_slug_part(target_format)}"


def record_conversion(source_ext: str, target_format: str, mode: str):
    slug = conversion_slug(source_ext, target_format)
    today = time.strftime("%Y-%m-%d")
    mix_key = "single"
    if mode == "combined":
        mix_key = "batch_combined"
    elif mode == "separate":
        mix_key = "batch_separate"

    with STORE_LOCK:
        store = _read_store()
        conversion = store["conversions"].setdefault(
            slug,
            {
                "slug": slug,
                "total": 0,
                "by_day": {},
                "mix": {key: 0 for key in MIX_KEYS},
                "updated_at": time.time(),
            },
        )
        conversion["total"] += 1
        conversion["by_day"][today] = conversion["by_day"].get(today, 0) + 1
        conversion["mix"][mix_key] = conversion["mix"].get(mix_key, 0) + 1
        conversion["updated_at"] = time.time()
        _write_store(store)


def popular_conversions(limit: int = 10) -> list[dict]:
    with STORE_LOCK:
        store = _read_store()
    day_keys = [time.strftime("%Y-%m-%d", time.localtime(time.time() - offset * 86400)) for offset in range(6, -1, -1)]
    conversions = []

    for conversion in store.get("conversions", {}).values():
        total = conversion.get("total", 0)
        if total <= 0:
            continue
        by_day = conversion.get("by_day", {})
        mix = conversion.get("mix", {})
        conversions.append(
            {
                "slug": conversion["slug"],
                "total": total,
                "trend": [by_day.get(day, 0) for day in day_keys],
                "mix": [mix.get(key, 0) for key in MIX_KEYS],
                "labels": {
                    "trend": ["6d", "5d", "4d", "3d", "2d", "1d", "Today"],
                    "mix": ["Single", "Batch ZIP", "Merged PDF"],
                },
                "updatedAt": conversion.get("updated_at"),
            }
        )

    return sorted(conversions, key=lambda item: item["total"], reverse=True)[:limit]
