from services.image import heic_to_jpg, image_convert, image_to_pdf, svg_convert
from services.libreoffice import convert_with_libreoffice
from services.office import csv_to_xlsx, docx_to_html, docx_to_text, xlsx_to_csv
from services.pdf import pdf_to_docx, pdf_to_html, pdf_to_image, pdf_to_text
from services.web import html_to_pdf, txt_to_docx, txt_to_pdf

SUPPORTED_CONVERSIONS = [
    {"from": "pdf", "to": "pdf"},
    {"from": "pdf", "to": "docx"},
    {"from": "pdf", "to": "pptx"},
    {"from": "pdf", "to": "xlsx"},
    {"from": "pdf", "to": "jpg"},
    {"from": "pdf", "to": "png"},
    {"from": "pdf", "to": "txt"},
    {"from": "pdf", "to": "html"},
    {"from": "docx", "to": "pdf"},
    {"from": "docx", "to": "txt"},
    {"from": "docx", "to": "html"},
    {"from": "ppt", "to": "pdf"},
    {"from": "pptx", "to": "pdf"},
    {"from": "pptx", "to": "jpg"},
    {"from": "xlsx", "to": "pdf"},
    {"from": "xlsx", "to": "csv"},
    {"from": "csv", "to": "xlsx"},
    {"from": "jpg", "to": "pdf"},
    {"from": "jpg", "to": "png"},
    {"from": "jpg", "to": "webp"},
    {"from": "png", "to": "pdf"},
    {"from": "png", "to": "jpg"},
    {"from": "png", "to": "webp"},
    {"from": "webp", "to": "jpg"},
    {"from": "webp", "to": "png"},
    {"from": "html", "to": "pdf"},
    {"from": "txt", "to": "pdf"},
    {"from": "txt", "to": "docx"},
    {"from": "svg", "to": "pdf"},
    {"from": "svg", "to": "png"},
    {"from": "heic", "to": "jpg"},
    {"from": "heic", "to": "png"},
]

LIBREOFFICE_TARGETS = {"pdf", "docx", "pptx", "xlsx", "odt", "odp", "ods", "rtf"}
LIBREOFFICE_SOURCES = {"docx", "doc", "pptx", "ppt", "xlsx", "xls", "odt", "odp", "ods", "rtf", "csv", "pdf"}


def source_extension(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def is_supported_conversion(filename: str, target: str) -> bool:
    ext = source_extension(filename)
    target = target.lower().replace("jpeg", "jpg")

    if any(conversion["from"] == ext and conversion["to"] == target for conversion in SUPPORTED_CONVERSIONS):
        return True
    if ext in LIBREOFFICE_SOURCES and target in LIBREOFFICE_TARGETS:
        return True
    return False


async def dispatch(content: bytes, filename: str, target: str) -> tuple[str, str]:
    ext = source_extension(filename)
    target = target.lower()

    if ext == "pdf" and target in ("docx", "word"):
        return await pdf_to_docx(content, filename)

    if ext == "pdf" and target in ("jpg", "jpeg", "png"):
        return await pdf_to_image(content, filename, target)

    if ext == "pdf" and target == "txt":
        return await pdf_to_text(content, filename)
    if ext == "pdf" and target == "html":
        return await pdf_to_html(content, filename)

    if ext in LIBREOFFICE_SOURCES and target in LIBREOFFICE_TARGETS:
        return await convert_with_libreoffice(content, filename, target)

    if ext in ("jpg", "jpeg", "png", "webp", "bmp", "gif", "tiff"):
        if target == "pdf":
            return await image_to_pdf(content, filename)
        return await image_convert(content, filename, target)

    if ext in ("heic", "heif"):
        return await heic_to_jpg(content, filename, target)

    if ext == "svg":
        return await svg_convert(content, filename, target)

    if ext in ("html", "htm") and target == "pdf":
        return await html_to_pdf(content, filename)

    if ext == "txt":
        if target == "pdf":
            return await txt_to_pdf(content, filename)
        if target in ("docx", "word"):
            return await txt_to_docx(content, filename)

    if ext == "docx":
        if target == "txt":
            return await docx_to_text(content, filename)
        if target == "html":
            return await docx_to_html(content, filename)

    if ext == "xlsx" and target == "csv":
        return await xlsx_to_csv(content, filename)
    if ext == "csv" and target == "xlsx":
        return await csv_to_xlsx(content, filename)

    raise ValueError(f"Unsupported conversion: {ext} to {target}")
