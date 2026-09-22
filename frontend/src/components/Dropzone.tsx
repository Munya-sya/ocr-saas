import React, { useState, useRef } from 'react';
import { UploadCloud, FileUp, ShieldAlert } from 'lucide-react';

interface DropzoneProps {
    onFileSelect: (file: File) => void;
    onError: (errorMessage: string) => void;
    disabled?: boolean;
}

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
const MAX_FILE_SIZE_MB = 10;

export const Dropzone: React.FC<DropzoneProps> = ({
    onFileSelect,
    onError,
    disabled = false,
}) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const validateAndHandleFile = (file: File) => {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();

        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            onError(`Invalid file format '${ext}'. Only JPG, JPEG, PNG, WEBP, and PDF files are allowed.`);
            return;
        }

        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            onError(`File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of ${MAX_FILE_SIZE_MB} MB.`);
            return;
        }

        onFileSelect(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        if (disabled) return;

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFile = e.dataTransfer.files[0];
            validateAndHandleFile(droppedFile);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            validateAndHandleFile(e.target.files[0]);
        }
    };

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !disabled && inputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer select-none glass-panel ${isDragOver
                    ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
                    : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/50'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            <input
                ref={inputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={handleFileChange}
                disabled={disabled}
                className="hidden"
            />

            <div className="flex flex-col items-center justify-center space-y-4">
                <div className={`p-4 rounded-2xl ${isDragOver ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                    <UploadCloud className="w-10 h-10" />
                </div>

                <div>
                    <h3 className="text-lg font-semibold text-slate-800">
                        Drag & Drop document or image here
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        or <span className="text-blue-600 font-medium underline">browse from your computer</span>
                    </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                        JPG, JPEG
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                        PNG
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                        WEBP
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                        PDF
                    </span>
                    <span className="text-xs text-slate-400 ml-2">Max {MAX_FILE_SIZE_MB}MB</span>
                </div>
            </div>
        </div>
    );
};
