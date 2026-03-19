'use client';

import { useState, useRef, useEffect, DragEvent, ChangeEvent } from 'react';
import { XIcon } from 'lucide-react';

interface ProductPhotosUploadProps {
  name?: string;
  label?: string;
  helpText?: string;
  disabled?: boolean;
  /** Existing photo URLs (for edit mode) */
  initialPhotos?: string[];
}

export function ProductPhotosUpload({
  name = 'photos',
  label = 'Product photos',
  helpText = 'JPG, PNG, WebP, GIF (máx. 5MB cada)',
  disabled = false,
  initialPhotos = [],
}: ProductPhotosUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [existingUrls, setExistingUrls] = useState<string[]>(
    () => initialPhotos ?? []
  );
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setTimeout(() => {
      setPreviewUrls(urls);
    }, 0);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  const totalCount = existingUrls.length + files.length;

  const updateInputFiles = (newFiles: File[]) => {
    setFiles(newFiles);
    if (fileInputRef.current) {
      const dt = new DataTransfer();
      newFiles.forEach((f) => dt.items.add(f));
      fileInputRef.current.files = dt.files;
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const droppedFiles = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith('image/')
    );
    if (droppedFiles.length > 0) {
      updateInputFiles([...files, ...droppedFiles]);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (selected && selected.length > 0) {
      updateInputFiles([...files, ...Array.from(selected)]);
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    updateInputFiles(newFiles);
  };

  const handleRemoveExisting = (index: number) => {
    setExistingUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClick = () => {
    if (!disabled) fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium mb-2">{label}</label>
      {helpText && <p className="text-xs text-muted mb-2">{helpText}</p>}

      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-all duration-200
          ${isDragging ? 'border-accent bg-accent/5' : 'border-muted'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-accent hover:bg-accent/5'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          name={name}
          onChange={handleInputChange}
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          disabled={disabled}
        />
        {existingUrls.length > 0 && (
          <input
            type="hidden"
            name="existingPhotos"
            value={JSON.stringify(existingUrls)}
          />
        )}

        {totalCount > 0 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {existingUrls.map((url, index) => (
                <div
                  key={`existing-${index}-${url}`}
                  className="relative group aspect-square rounded-lg overflow-hidden bg-border border border-divider"
                >
                  <img
                    src={url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveExisting(index);
                    }}
                    disabled={disabled}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <XIcon size={14} />
                  </button>
                </div>
              ))}
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="relative group aspect-square rounded-lg overflow-hidden bg-border border border-divider"
                >
                  {previewUrls[index] && (
                    <img
                      src={previewUrls[index]}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(index);
                    }}
                    disabled={disabled}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <XIcon size={14} />
                  </button>
                  <p className="absolute bottom-0 left-0 right-0 text-xs truncate bg-black/50 text-white px-2 py-1">
                    {file.name}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted">
              {totalCount} imagem(ns) selecionada(s). Clique para adicionar mais.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <svg
              className="mx-auto h-12 w-12 text-muted"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div>
              <span className="text-sm text-accent font-medium">Clique para selecionar</span>
              <span className="text-sm text-muted"> ou arraste as imagens</span>
            </div>
            <p className="text-xs text-muted">{helpText}</p>
          </div>
        )}
      </div>
    </div>
  );
}
