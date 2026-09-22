'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Dropzone } from '../components/Dropzone';
import { FilePreview } from '../components/FilePreview';
import { OCRControls } from '../components/OCRControls';
import { ResultArea } from '../components/ResultArea';
import { ErrorBanner } from '../components/ErrorBanner';
import { fetchSupportedLanguages, submitOCRRequest } from '../services/api';
import { LanguageOption, OCRResult, ProcessingStage } from '../types';
import { ShieldCheck, Zap, FileCode, CheckCircle } from 'lucide-react';

export default function Home() {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [languages, setLanguages] = useState<LanguageOption[]>([
        { code: 'eng', name: 'English' },
        { code: 'deu', name: 'German' },
        { code: 'fra', name: 'French' },
        { code: 'spa', name: 'Spanish' },
    ]);
    const [selectedLanguage, setSelectedLanguage] = useState<string>('eng');
    const [selectedPsm, setSelectedPsm] = useState<number>(3);
    const [selectedPreprocessMode, setSelectedPreprocessMode] = useState<string>('auto');
    const [stage, setStage] = useState<ProcessingStage>('idle');
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<OCRResult | null>(null);

    useEffect(() => {
        fetchSupportedLanguages().then((langs) => {
            if (langs && langs.length > 0) setLanguages(langs);
        });
    }, []);

    const handleFileSelect = (selectedFile: File) => {
        setError(null);
        setResult(null);
        setStage('idle');
        setFile(selectedFile);

        if (selectedFile.type.startsWith('image/')) {
            const url = URL.createObjectURL(selectedFile);
            setPreviewUrl(url);
        } else {
            setPreviewUrl(null);
        }
    };

    const handleRemoveFile = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setFile(null);
        setPreviewUrl(null);
        setResult(null);
        setError(null);
        setStage('idle');
        setUploadProgress(0);
    };

    const handleExtractText = async () => {
        if (!file) return;

        setStage('uploading');
        setUploadProgress(0);
        setError(null);
        setResult(null);

        try {
            const res = await submitOCRRequest(
                file,
                selectedLanguage,
                selectedPsm,
                selectedPreprocessMode,
                (progressPercent) => {
                    setUploadProgress(progressPercent);
                    if (progressPercent >= 100) {
                        setStage('extracting');
                    }
                }
            );

            setStage('complete');
            setResult(res);
        } catch (err: any) {
            setStage('failed');
            setError(err.message || 'An unexpected error occurred during OCR text extraction.');
        }
    };

    return (
        <div className="min-h-screen flex flex-col justify-between bg-slate-50">
            <Header />

            <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col space-y-8">
                {/* Hero Banner Section */}
                <section className="text-center space-y-4">
                    <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
                        <Zap className="w-3.5 h-3.5" />
                        <span>Anonymous Image-to-Text OCR MVP</span>
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                        Extract Text from Images & Documents <br className="hidden sm:inline" />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                            Instantly & Privately
                        </span>
                    </h1>
                    <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto">
                        Upload JPG, JPEG, PNG, WEBP, or PDF files. Automatic EXIF rotation, zero-retention memory processing, and editable plain text.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs font-medium text-slate-500">
                        <div className="flex items-center space-x-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                            <span>Binary Magic Byte Protection</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                            <CheckCircle className="w-4 h-4 text-blue-500" />
                            <span>Auto-Deskew & Border Padding</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                            <FileCode className="w-4 h-4 text-indigo-500" />
                            <span>EXIF Rotation Correction</span>
                        </div>
                    </div>
                </section>

                {/* Error Notification Banner */}
                {error && (
                    <ErrorBanner message={error} onDismiss={() => setError(null)} />
                )}

                {/* OCR Processing Workspace */}
                <section className="space-y-6">
                    {!file ? (
                        <Dropzone
                            onFileSelect={handleFileSelect}
                            onError={(msg) => setError(msg)}
                            disabled={stage === 'uploading' || stage === 'extracting'}
                        />
                    ) : (
                        <div className="space-y-6">
                            <FilePreview
                                file={file}
                                previewUrl={previewUrl}
                                onRemove={handleRemoveFile}
                                disabled={stage === 'uploading' || stage === 'extracting'}
                            />

                            <OCRControls
                                languages={languages}
                                selectedLanguage={selectedLanguage}
                                onLanguageChange={(lang) => setSelectedLanguage(lang)}
                                selectedPsm={selectedPsm}
                                onPsmChange={(psm) => setSelectedPsm(psm)}
                                selectedPreprocessMode={selectedPreprocessMode}
                                onPreprocessModeChange={(mode) => setSelectedPreprocessMode(mode)}
                                onSubmit={handleExtractText}
                                stage={stage}
                                uploadProgress={uploadProgress}
                                disabled={!file}
                            />
                        </div>
                    )}

                    {/* OCR Result View */}
                    {result && (
                        <ResultArea
                            result={result}
                            onClear={() => {
                                setResult(null);
                                setStage('idle');
                            }}
                        />
                    )}
                </section>
            </main>

            <Footer />
        </div>
    );
}
