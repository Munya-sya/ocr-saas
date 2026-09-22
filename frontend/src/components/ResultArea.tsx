import React, { useState, useEffect } from 'react';
import { Copy, Download, Check, Sparkles, Trash2 } from 'lucide-react';
import { OCRResult } from '../types';

interface ResultAreaProps {
    result: OCRResult;
    onClear: () => void;
}

export const ResultArea: React.FC<ResultAreaProps> = ({ result, onClear }) => {
    const [text, setText] = useState(result.text);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setText(result.text);
    }, [result]);

    const charCount = text.length;
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text', err);
        }
    };

    const handleDownload = () => {
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `extracted_text_${Date.now()}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="w-full glass-panel rounded-2xl p-6 shadow-sm flex flex-col space-y-4 border border-slate-200 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Extracted OCR Result</h3>
                        <p className="text-xs text-slate-500">
                            Job ID: <span className="font-mono text-slate-700">{result.jobId.slice(0, 8)}...</span> • {result.processingMs} ms • Lang: {result.language}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                    <button
                        onClick={handleCopy}
                        aria-label="Copy extracted text to clipboard"
                        className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {copied ? (
                            <>
                                <Check className="w-4 h-4 text-emerald-600" />
                                <span className="text-emerald-600">Copied!</span>
                            </>
                        ) : (
                            <>
                                <Copy className="w-4 h-4" />
                                <span>Copy Text</span>
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleDownload}
                        aria-label="Download text file"
                        className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <Download className="w-4 h-4" />
                        <span>Download TXT</span>
                    </button>

                    <button
                        onClick={onClear}
                        aria-label="Clear OCR result"
                        className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-3 py-2 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 font-semibold rounded-xl text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                        <Trash2 className="w-4 h-4" />
                        <span>Clear Result</span>
                    </button>
                </div>
            </div>

            <div className="relative">
                <label htmlFor="ocr-result-text" className="sr-only">
                    Extracted OCR Text Area
                </label>
                <textarea
                    id="ocr-result-text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={10}
                    aria-label="Editable OCR Extracted Text"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                    placeholder="Extracted text will appear here..."
                />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <div className="flex items-center space-x-3">
                    <span>{charCount} characters</span>
                    <span>•</span>
                    <span>{wordCount} words</span>
                </div>
                <span className="italic">Editable output</span>
            </div>
        </div>
    );
};
