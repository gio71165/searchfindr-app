// lib/api/file-validation.ts
// Server-side file validation utilities

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

// Magic bytes (file signatures) for common file types
const FILE_SIGNATURES: Record<string, number[][]> = {
  pdf: [
    [0x25, 0x50, 0x44, 0x46], // %PDF
  ],
  xlsx: [
    [0x50, 0x4b, 0x03, 0x04], // ZIP header (XLSX is a ZIP file)
    [0x50, 0x4b, 0x05, 0x06], // ZIP empty archive
    [0x50, 0x4b, 0x07, 0x08], // ZIP spanned archive
  ],
  xls: [
    [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], // OLE2 header
  ],
  docx: [
    [0x50, 0x4b, 0x03, 0x04], // ZIP header (DOCX is a ZIP file)
    [0x50, 0x4b, 0x05, 0x06], // ZIP empty archive
    [0x50, 0x4b, 0x07, 0x08], // ZIP spanned archive
  ],
  doc: [
    [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], // OLE2 header (same as XLS)
  ],
  csv: [
    // CSV doesn't have a magic byte signature, so we'll validate by content
  ],
};

export type FileValidationResult = {
  valid: boolean;
  error?: string;
  detectedType?: string;
};

/**
 * Validate file size
 */
export function validateFileSize(size: number): { valid: boolean; error?: string } {
  if (size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    };
  }
  if (size === 0) {
    return { valid: false, error: "File is empty" };
  }
  return { valid: true };
}

/**
 * Check if buffer matches a file signature
 */
function matchesSignature(buffer: Uint8Array, signatures: number[][]): boolean {
  for (const signature of signatures) {
    if (buffer.length < signature.length) continue;
    let matches = true;
    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }
  return false;
}

/**
 * Detect file type from magic bytes
 */
export function detectFileType(buffer: ArrayBuffer): string | null {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 8) return null;

  for (const [type, signatures] of Object.entries(FILE_SIGNATURES)) {
    if (signatures.length > 0 && matchesSignature(bytes, signatures)) {
      return type;
    }
  }

  // Check for CSV (text file with comma-separated values)
  // This is a heuristic - CSV files are typically text files
  try {
    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, 1024));
    if (text.includes(",") && text.split("\n").length > 1) {
      return "csv";
    }
  } catch {
    // Not text
  }

  return null;
}

/**
 * Validate file by magic bytes
 */
export function validateFileType(buffer: ArrayBuffer, expectedTypes: string[]): FileValidationResult {
  const detectedType = detectFileType(buffer);
  
  if (!detectedType) {
    return {
      valid: false,
      error: "File type could not be determined. Please upload a valid PDF, DOCX, DOC, CSV, or Excel file.",
    };
  }

  if (!expectedTypes.includes(detectedType)) {
    return {
      valid: false,
      error: `Invalid file type. Expected ${expectedTypes.join(", ")}, but detected ${detectedType}.`,
      detectedType,
    };
  }

  return {
    valid: true,
    detectedType,
  };
}

/**
 * Comprehensive file validation
 */
export async function validateFile(
  file: File | Blob,
  expectedTypes: string[]
): Promise<FileValidationResult> {
  // Size validation
  const sizeCheck = validateFileSize(file.size);
  if (!sizeCheck.valid) {
    return { valid: false, error: sizeCheck.error };
  }

  // Read first 8 bytes for magic byte check
  const buffer = await file.slice(0, 8).arrayBuffer();
  const typeCheck = validateFileType(buffer, expectedTypes);
  
  if (!typeCheck.valid) {
    return typeCheck;
  }

  return { valid: true, detectedType: typeCheck.detectedType };
}
