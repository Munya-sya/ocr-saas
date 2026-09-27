'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Dropzone } from '../components/Dropzone';
import { FilePreview } from '../components/FilePreview';
import { OCRControls } from '../components/OCRControls';
import { ResultArea } from '../components/ResultArea';
import { ErrorBanner } from '../components/ErrorBanner';
import { fetchSupportedLanguages, submitOCRRequest, submitAsyncJob, fetchJobStatus, fetchJobResult, cancelJob } from '../services/api';
import { LanguageOption, OCRResult, ProcessingStage, AsyncJobStatusResponse } from '../types';
import { ShieldCheck, Zap, FileCode, CheckCircle, Clock, Loader2, XCircle } from 'lucide-react';

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
    const [asyncJobId, setAsyncJobId] = useState<string | null>(null);
    const [asyncStatus, setAsyncStatus] = useState<AsyncJobStatusResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<OCRResult | null>(null);

    useEffect(() => {
        fetchSupportedLanguages().then((langs) => {
            if (langs && langs.length > 0) setLanguages(langs);
        });
    }, []);

    // Polling effect for async PDF & batch jobs
    useEffect(() => {
        if (!asyncJobId || stage !== 'polling') return;

        const interval = setInterval(async () => {
            try {
                const jobStatus = await fetchJobStatus(asyncJobId);
                setAsyncStatus(jobStatus);

                if (jobStatus.status === 'completed') {
                    clearInterval(interval);
                    const finalResult = await fetchJobResult(asyncJobId);
                    setResult(finalResult);
                    setStage('complete');
                    setAsyncJobId(null);
                } else if (jobStatus.status === 'failed') {
                    clearInterval(interval);
                    setStage('failed');
                    setError(jobStatus.errorMessage || 'Asynchronous OCR job failed during page extraction.');
                    setAsyncJobId(null);
                } else if (jobStatus.status === 'cancelled') {
                    clearInterval(interval);
                    setStage('idle');
                    setAsyncJobId(null);
                }
            } catch (err: any) {
                clearInterval(interval);
                setStage('failed');
                setError(err.message || 'Error polling async job status.');
                setAsyncJobId(null);
            }
        }, 1500);

        return () => clearInterval(interval);
    }, [asyncJobId, stage]);

    const handleFileSelect = (selectedFile: File) => {
        setError(null);
        setResult(null);
        setStage('idle');
        setAsyncJobId(null);
        setAsyncStatus(null);
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
        if (asyncJobId) {
            cancelJob(asyncJobId).catch(() => { });
        }
        setFile(null);
        setPreviewUrl(null);
        setResult(null);
        setError(null);
        setStage('idle');
        setUploadProgress(0);
        setAsyncJobId(null);
        setAsyncStatus(null);
    };

    const handleExtractText = async () => {
        if (!file) return;

        setStage('uploading');
        setUploadProgress(0);
        setError(null);
        setResult(null);

        const isPdf = file.name.toLowerCase().endsWith('.pdf');

        if (isPdf) {
            // PDF & Large documents use Asynchronous Job Pipeline
            try {
                const jobData = await submitAsyncJob(
                    file,
                    selectedLanguage,
                    selectedPsm,
                    selectedPreprocessMode,
                    (progressPercent) => {
                        setUploadProgress(progressPercent);
                        if (progressPercent >= 100) {
                            setStage('polling');
                        }
                    }
                );
                setAsyncJobId(jobData.jobId);
                setStage('polling');
            } catch (err: any) {
                setStage('failed');
                setError(err.message || 'An error occurred submitting the PDF OCR job.');
            }
        } else {
            // Synchronous Image OCR Pipeline
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
                        <span>Anonymous Image & PDF OCR SaaS Engine</span>
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                        Extract Text from Images & PDF Documents <br className="hidden sm:inline" />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                            Instantly & Privately
                        </span>
                    </h1>
                    <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto">
                        Upload JPG, PNG, WEBP, or multi-page PDF files. Direct PDF text extraction, Celery worker queue, zero-retention storage, and editable plain text.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs font-medium text-slate-500">
                        <div className="flex items-center space-x-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                            <span>OWASP File Upload Protection</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                            <CheckCircle className="w-4 h-4 text-blue-500" />
                            <span>Direct PDF Text & OCR Fallback</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                            <FileCode className="w-4 h-4 text-indigo-500" />
                            <span>Async Celery + Redis Queues</span>
                        </div>
                    </div>
                </section>

                {/* Error Notification Banner */}
                {error && (
                    <ErrorBanner message={error} onDismiss={() => setError(null)} />
                )}

                {/* Async Job Progress Banner */}
                {stage === 'polling' && (
                    <div className="w-full p-6 bg-blue-50 border border-blue-200 rounded-2xl shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 text-blue-900 font-bold text-sm sm:text-base">
                                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                                <span>
                                    Processing PDF Document...{' '}
                                    {asyncStatus?.pageCount ? `(Page ${asyncStatus.processedPages || 1} of ${asyncStatus.pageCount})` : ''}
                                </span>
                            </div>
                            <span className="px-2.5 py-1 bg-blue-200 text-blue-800 text-xs font-semibold rounded-full capitalize">
                                {asyncStatus?.status || 'queued'}
                            </span>
                        </div>
                        <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden">
                            <div
                                className="bg-blue-600 h-full transition-all duration-300"
                                style={{
                                    width: `${asyncStatus?.pageCount
                                            ? Math.round(((asyncStatus.processedPages || 1) / asyncStatus.pageCount) * 100)
                                            : 25
                                        }%`,
                                }}
                            />
                        </div>
                        <p className="text-xs text-blue-700 flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 inline mr-1" />
                            <span>Asynchronous worker is processing document. Status updates automatically.</span>
                        </p>
                    </div>
                )}

                {/* OCR Processing Workspace */}
                <section className="space-y-6">
                    {!file ? (
                        <Dropzone
                            onFileSelect={handleFileSelect}
                            onError={(msg) => setError(msg)}
                            disabled={stage === 'uploading' || stage === 'extracting' || stage === 'polling'}
                        />
                    ) : (
                        <div className="space-y-6">
                            <FilePreview
                                file={file}
                                previewUrl={previewUrl}
                                onRemove={handleRemoveFile}
                                disabled={stage === 'uploading' || stage === 'extracting' || stage === 'polling'}
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
