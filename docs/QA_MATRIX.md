# All Files Convertor QA Matrix

Run this matrix before release and after conversion-library upgrades.

## Single File

- TXT to PDF
- TXT to DOCX
- PNG to PDF
- PNG to JPG
- PNG to WEBP
- JPG to PDF
- JPG to PNG
- WEBP to JPG
- WEBP to PNG
- DOCX to PDF
- DOCX to TXT
- DOCX to HTML
- PPTX to PDF
- PPTX to JPG
- XLSX to PDF
- XLSX to CSV
- CSV to XLSX
- PDF to DOCX
- PDF to TXT
- PDF to HTML
- PDF to JPG
- PDF to PNG
- SVG to PDF
- SVG to PNG
- HEIC to JPG
- HEIC to PNG

## Multiple Files

- 2 DOCX files to separate PDFs ZIP
- 5 DOCX files to combined PDF
- 5 PNG files to separate JPGs ZIP
- 5 PNG files to combined PDF
- Mixed valid and invalid files should stop with the exact failing filename
- More than `MAX_BATCH_FILES` should be rejected before upload
- Batch larger than `MAX_BATCH_MB` should be rejected before conversion

## Download and Cleanup

- Download button saves the result once.
- Second download attempt shows a friendly unavailable-file message.
- Completed jobs expire after `CLEANUP_TTL_MINUTES`.
- Abandoned `ff_` temp folders are removed after `TEMP_FILE_TTL_MINUTES`.

## Protection

- Per-file upload over `MAX_FILE_MB` is rejected.
- Converted output over `MAX_OUTPUT_MB` is rejected.
- Unsupported extension is rejected.
- Unsupported source to target pair is rejected.
- Rate limit returns `429` with `Retry-After`.
