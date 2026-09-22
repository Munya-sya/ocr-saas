import React from 'react';
import { FileText, Image as ImageIcon, X, CheckCircle2 } from 'lucide-react';

interface FilePreviewProps {
    file: File;
    previewUrl: string | null;
    onRemove: () => void;
    disabled?: boolean;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
    file,
    previewUrl,
    onRemove,
    disabled = false,
}) => {
    const isPdf = file.name.toLowerCase().endsWith('.pdf');
    const fileSizeMb = (file.size / (1024 * 1024)).toFixed(2);

    return (
        <div className="w-full glass-panel rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4 w-full sm:w-auto">
                <div className="relative w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {previewUrl && !isPdf ? (
                        <img
                            src={previewUrl}
                            alt="Uploaded document preview"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="text-blue-600">
                            {isPdf ? <FileText className="w-8 h-8" /> : <ImageIcon className="w-8 h-8" />}
                        </div>
                    )}
                </div>

                <div className="overflow-hidden">
                    <div className="flex items-center space-x-2">
                        <h4 className="font-semibold text-slate-800 text-sm sm:text-base truncate max-w-[200px] sm:max-w-xs">
                            {file.name}
                        </h4>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {fileSizeMb} MB • {isPdf ? 'PDF Document' : 'Image File'}
                    </p>
                </div>
            </div>

            <button
                onClick={onRemove}
                disabled={disabled}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
                <X className="w-4 h-4" />
                <span>Remove File</span>
            </button>
        </div>
    );
};
