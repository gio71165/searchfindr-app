# CIM Processing Debugging Guide

## How to View Logs

### Development Environment (Local)

When running `npm run dev`, all logs appear in your **terminal/console** where you started the dev server.

**Look for:**
- `[INFO]` - Informational messages (only in development)
- `[WARN]` - Warning messages (only in development)  
- `[ERROR]` - Error messages (always shown, even in production)

### Finding the Error

1. **Open your terminal** where `npm run dev` is running
2. **Look for lines starting with `[ERROR]`** or `[INFO] process-cim:`
3. **Scroll up** to find the error that occurred when you tried to process the CIM

### What to Look For

When you get the "Failed to extract text from DOCX" error, check the logs for:

1. **File Download:**
   ```
   [INFO] process-cim: Attempting to download file from storage
   [INFO] process-cim: file downloaded successfully
   ```

2. **File Validation:**
   ```
   [INFO] process-cim: First bytes of file
   ```

3. **DOCX Extraction:**
   ```
   [INFO] DOCX extraction: Verified ZIP signature
   [INFO] DOCX extraction: Buffer converted to ArrayBuffer
   [INFO] DOCX extraction: Calling mammoth.extractRawText...
   ```

4. **Error Details:**
   ```
   [ERROR] DOCX extraction failed: { errorMessage, errorStack, ... }
   ```

## Common Issues & Solutions

### Issue 1: File Not Actually DOCX

**Symptoms:**
- Error: "File does not appear to be a valid DOCX (missing ZIP signature)"
- Log shows: `firstBytes: 0x...` (not starting with `0x50 0x4B`)

**Solution:**
- The file might be a DOC file (older Word format) or something else
- Try converting it to PDF or DOCX first
- Check the file extension matches the actual file type

### Issue 2: Corrupted File

**Symptoms:**
- Error: "DOCX_PARSING_CORRUPT"
- Log shows: "Bad zip file" or "Unexpected end of data"

**Solution:**
- Re-download or re-save the file
- Try opening it in Microsoft Word first to verify it's valid
- If it opens in Word, try "Save As" to create a fresh copy

### Issue 3: Empty File or Image-Only

**Symptoms:**
- Error: "No text extracted from DOCX file"
- Log shows: `valueLength: 0` or `textLength: 0`

**Solution:**
- The file might contain only images with no extractable text
- Try converting images to text first, or use OCR
- Or convert the entire document to PDF

### Issue 4: Mammoth Module Not Found

**Symptoms:**
- Error: "mammoth module not available"
- Log shows: "Failed to load mammoth module"

**Solution:**
- Run `npm install` to ensure all dependencies are installed
- Check that `mammoth` is in your `package.json`

### Issue 5: Storage Download Failed

**Symptoms:**
- Error: "Failed to download CIM file from storage"
- Log shows storage error details

**Solution:**
- Check Supabase Storage policies (should allow SELECT for authenticated users)
- Verify the file path is correct
- Check that the `cims` bucket exists

## Getting Detailed Logs

The enhanced logging will show:

1. **File Information:**
   - File size
   - First bytes (magic bytes)
   - File extension

2. **Extraction Process:**
   - Buffer conversion steps
   - Mammoth extraction results
   - Text length extracted

3. **Error Details:**
   - Full error message
   - Stack trace
   - File state at time of error

## Next Steps

1. **Check your terminal logs** when you try to process the CIM
2. **Copy the error logs** (especially `[ERROR]` lines)
3. **Share the logs** so we can diagnose the exact issue

The enhanced logging will help us identify:
- Whether the file is actually a DOCX
- Whether it's corrupted
- Whether mammoth is working correctly
- What specific error mammoth is throwing
