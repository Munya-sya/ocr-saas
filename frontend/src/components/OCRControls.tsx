import React from 'react';
import { Languages, Play, Loader2, Sliders, Sparkles } from 'lucide-react';
import { LanguageOption, ProcessingStage } from '../types';
import { DEFAULT_PSM_OPTIONS, PREPROCESS_OPTIONS } from '../services/api';

interface OCRControlsProps {
    languages: LanguageOption[];
    selectedLanguage: string;
    onLanguageChange: (lang: string) => void;
    selectedPsm: number;
    onPsmChange: (psm: number) => void;
    selectedPreprocessMode: string;
    onPreprocessModeChange: (mode: string) => void;
    onSubmit: () => void;
    stage: ProcessingStage;
    uploadProgress: number;
    disabled: boolean;
}

export const OCRControls: React.FC<OCRControlsProps> = ({
    languages,
    selectedLanguage,
    onLanguageChange,
    selectedPsm,
    onPsmChange,
    selectedPreprocessMode,
    onPreprocessModeChange,
    onSubmit,
    stage,
    uploadProgress,
    disabled,
}) => {
    const isProcessing = stage === 'uploading' || stage === 'extracting';

    return (
        <div className="w-full flex flex-col space-y-4 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Language Selection */}
                <div className="space-y-1.5">
                    <label htmlFor="language-select" className="flex items-center space-x-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                        <Languages className="w-4 h-4 text-blue-600" />
                        <span>OCR Language</span>
                    </label>
                    <select
                        id="language-select"
                        value={selectedLanguage}
                        onChange={(e) => onLanguageChange(e.target.value)}
                        disabled={disabled || isProcessing}
                        aria-label="Select OCR Language"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                    >
                        {languages.map((lang) => (
                            <option key={lang.code} value={lang.code}>
                                {lang.name} ({lang.code})
                            </option>
                        ))}
                    </select>
                </div>

                {/* PSM Mode Selection */}
                <div className="space-y-1.5">
                    <label htmlFor="psm-select" className="flex items-center space-x-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                        <Sliders className="w-4 h-4 text-indigo-600" />
                        <span>Segmentation (PSM)</span>
                    </label>
                    <select
                        id="psm-select"
                        value={selectedPsm}
                        onChange={(e) => onPsmChange(Number(e.target.value))}
                        disabled={disabled || isProcessing}
                        aria-label="Select Page Segmentation Mode"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                    >
                        {DEFAULT_PSM_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Preprocessing Mode Selection */}
                <div className="space-y-1.5">
                    <label htmlFor="preprocess-select" className="flex items-center space-x-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        <span>Image Preprocessing</span>
                    </label>
                    <select
                        id="preprocess-select"
                        value={selectedPreprocessMode}
                        onChange={(e) => onPreprocessModeChange(e.target.value)}
                        disabled={disabled || isProcessing}
                        aria-label="Select Image Preprocessing Mode"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                    >
                        {PREPROCESS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Convert Action Button */}
            <div className="pt-2">
                <button
                    onClick={onSubmit}
                    disabled={disabled || isProcessing}
                    aria-label={isProcessing ? `Processing: ${stage}` : 'Convert Image to Text'}
                    className={`w-full flex items-center justify-center space-x-3 px-6 py-3.5 rounded-xl font-bold text-base shadow-md transition-all ${disabled
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                            : isProcessing
                                ? 'bg-blue-500 text-white cursor-wait'
                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 active:scale-[0.99]'
                        }`}
                >
                    {stage === 'uploading' ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Uploading File ({uploadProgress}%)...</span>
                        </>
                    ) : stage === 'extracting' ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Extracting & Cleaning Text with OpenCV + Tesseract...</span>
                        </>
                    ) : (
                        <>
                            <Play className="w-5 h-5 fill-current" />
                            <span>Convert to Text</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
