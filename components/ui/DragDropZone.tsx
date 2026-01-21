'use client';

import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react';
import { Upload, File, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

type UploadStatus = 'idle' | 'uploading' | 'uploaded' | 'error';

interface DragDropZoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSizeMB?: number;
  uploadStatus?: UploadStatus;
  uploadProgress?: number;
  errorMessage?: string | null;
  successMessage?: string | null;
  disabled?: boolean;
  label?: string;
  description?: string;
  icon?: React.ReactNode;
  allowedFileTypes?: string[];
  validateFile?: (file: File) => { valid: boolean; error?: string };
}

export function DragDropZone({
  onFileSelect,
  accept,
  maxSizeMB = 50,
  uploadStatus = 'idle',
  uploadProgress,
  errorMessage,
  successMessage,
  disabled = false,
  label = 'Upload File',
  description = 'Drag and drop a file here, or click to browse',
  icon,
  allowedFileTypes,
  validateFile,
}: DragDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const validateFileType = (file: File): { valid: boolean; error?: string } => {
    if (validateFile) {
      return validateFile(file);
    }

    if (allowedFileTypes && allowedFileTypes.length > 0) {
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
      const mimeType = file.type.toLowerCase();
      
      const isValid = allowedFileTypes.some(type => {
        const normalizedType = type.toLowerCase();
        return (
          file.name.toLowerCase().endsWith(normalizedType) ||
          mimeType === normalizedType ||
          mimeType.includes(normalizedType.replace('.', ''))
        );
      });

      if (!isValid) {
        return {
          valid: false,
          error: `File type not allowed. Allowed types: ${allowedFileTypes.join(', ')}`,
        };
      }
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      return {
        valid: false,
        error: `File size exceeds ${maxSizeMB}MB limit.`,
      };
    }

    return { valid: true };
  };

  const handleFile = useCallback(
    (file: File) => {
      const validation = validateFileType(file);
      if (!validation.valid) {
        return;
      }

      setPreviewFile(file);
      onFileSelect(file);
    },
    [onFileSelect, validateFileType]
  );

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone itself
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || uploadStatus === 'uploading') return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!disabled && uploadStatus !== 'uploading') {
      fileInputRef.current?.click();
    }
  };

  const handleRemovePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewFile(null);
  };

  const isUploading = uploadStatus === 'uploading';
  const isUploaded = uploadStatus === 'uploaded';
  const hasError = uploadStatus === 'error';

  return (
    <div className="w-full">
      {/* Drag and Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer
          ${isDragging ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-gray-300 bg-white'}
          ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400 hover:bg-gray-50'}
          ${hasError ? 'border-red-300 bg-red-50' : ''}
          ${isUploaded ? 'border-green-300 bg-green-50' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || isUploading}
        />

        <div className="flex flex-col items-center justify-center text-center">
          {/* Icon */}
          <div className="mb-4">
            {isUploading ? (
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
            ) : isUploaded ? (
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            ) : hasError ? (
              <AlertCircle className="h-12 w-12 text-red-500" />
            ) : icon ? (
              <div className="text-blue-500">{icon}</div>
            ) : (
              <Upload className="h-12 w-12 text-gray-400" />
            )}
          </div>

          {/* Label and Description */}
          {!previewFile && (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{label}</h3>
              <p className="text-sm text-gray-600 mb-4">{description}</p>
              <p className="text-xs text-gray-500">
                {allowedFileTypes && allowedFileTypes.length > 0 && (
                  <>Accepted: {allowedFileTypes.join(', ')} • </>
                )}
                Max size: {maxSizeMB}MB
              </p>
            </>
          )}

          {/* File Preview */}
          {previewFile && !isUploading && !isUploaded && (
            <div className="w-full max-w-md">
              <div className={`flex items-center gap-3 p-4 rounded-lg border ${
                hasError 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                {hasError ? (
                  <AlertCircle className="h-8 w-8 text-red-500 flex-shrink-0" />
                ) : (
                  <File className="h-8 w-8 text-blue-500 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${
                    hasError ? 'text-red-900' : 'text-gray-900'
                  }`}>
                    {previewFile.name}
                  </p>
                  <p className={`text-xs ${
                    hasError ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {formatFileSize(previewFile.size)}
                  </p>
                </div>
                {!disabled && (
                  <button
                    onClick={handleRemovePreview}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    type="button"
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && previewFile && (
            <div className="w-full max-w-md mt-4">
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Loader2 className="h-5 w-5 text-blue-500 animate-spin flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{previewFile.name}</p>
                  <div className="mt-2">
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress || 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {uploadProgress !== undefined ? `${Math.round(uploadProgress)}%` : 'Uploading...'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success State */}
          {isUploaded && successMessage && (
            <div className="w-full max-w-md mt-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                <p className="text-sm font-medium text-green-900">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {hasError && errorMessage && (
            <div className="w-full max-w-md mt-4">
              <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-sm font-medium text-red-900">{errorMessage}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Fallback Hint */}
      <p className="text-xs text-gray-500 text-center mt-2">
        Tap above to select a file from your device
      </p>
    </div>
  );
}
