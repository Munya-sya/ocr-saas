import axios from 'axios';
import { OCRResult, LanguageOption, PSMOption, PreprocessOption } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export const DEFAULT_PSM_OPTIONS: PSMOption[] = [
    { value: 3, label: 'Fully Automatic Page Segmentation (Default)' },
    { value: 6, label: 'Single Uniform Block of Text' },
    { value: 4, label: 'Single Column of Text' },
    { value: 11, label: 'Sparse Text (Find as much text as possible)' },
    { value: 1, label: 'Automatic Page Segmentation with OSD' },
];

export const PREPROCESS_OPTIONS: PreprocessOption[] = [
    { value: 'auto', label: 'Auto Enhancement (Deskew, CLAHE & Border Padding)' },
    { value: 'document', label: 'Scanned Document / Crisp High-Contrast Text' },
    { value: 'photo', label: 'Photo / Complex Background Noise Reduction' },
    { value: 'raw', label: 'Raw Image / No Preprocessing' },
];

export async function fetchSupportedLanguages(): Promise<LanguageOption[]> {
    try {
        const response = await axios.get(`${API_BASE}/api/v1/languages`);
        return response.data.languages || [];
    } catch (err) {
        return [
            { code: 'eng', name: 'English' },
            { code: 'deu', name: 'German' },
            { code: 'fra', name: 'French' },
            { code: 'spa', name: 'Spanish' },
        ];
    }
}

export async function submitOCRRequest(
    file: File,
    language: string = 'eng',
    psm: number = 3,
    preprocessMode: string = 'auto',
    onUploadProgress?: (progressPercent: number) => void
): Promise<OCRResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', language);
    formData.append('psm', psm.toString());
    formData.append('preprocess_mode', preprocessMode);

    try {
        const response = await axios.post<OCRResult>(`${API_BASE}/api/v1/ocr`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            timeout: 120000,
            onUploadProgress: (progressEvent) => {
                if (progressEvent.total && onUploadProgress) {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onUploadProgress(percent);
                }
            },
        });

        return response.data;
    } catch (error: any) {
        if (axios.isAxiosError(error) && error.response) {
            const detail = error.response.data?.detail || error.response.statusText;
            throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
        }
        throw new Error(error.message || 'Network error occurred while connecting to OCR backend server.');
    }
}
