import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ErrorBannerProps {
    message: string;
    onDismiss: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onDismiss }) => {
    if (!message) return null;

    return (
        <div className="w-full bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 flex items-start justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                    <h4 className="font-semibold text-sm">Processing Error</h4>
                    <p className="text-sm mt-0.5 text-red-700">{message}</p>
                </div>
            </div>
            <button
                onClick={onDismiss}
                className="p-1 hover:bg-red-100 rounded-lg text-red-500 hover:text-red-700 transition-colors"
                aria-label="Dismiss error"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};
