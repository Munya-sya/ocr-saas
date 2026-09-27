export interface OCRResult {
    jobId: string;
    filename: string;
    language: string;
    text: string;
    processingMs: number;
}

export interface LanguageOption {
    code: string;
    name: string;
}

export interface PSMOption {
    value: number;
    label: string;
}

export interface PreprocessOption {
    value: string;
    label: string;
}

export type ProcessingStage = 'idle' | 'uploading' | 'extracting' | 'polling' | 'complete' | 'failed';

export type JobStatusType = 'queued' | 'processing' | 'completed' | 'failed' | 'expired' | 'cancelled';

export interface AsyncJobStatusResponse {
    jobId: string;
    filename: string;
    status: JobStatusType;
    fileType: string;
    language: string;
    psm: number;
    preprocessMode: string;
    pageCount: number;
    processedPages: number;
    errorMessage?: string;
    processingMs: number;
}

export interface OCRProcessingState {
    file: File | null;
    previewUrl: string | null;
    language: string;
    psm: number;
    preprocessMode: string;
    stage: ProcessingStage;
    error: string | null;
    result: OCRResult | null;
}
