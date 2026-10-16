'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Unhandled Application Exception caught by Error Boundary:', error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 text-center space-y-6">
                <div className="inline-flex p-4 bg-rose-100 text-rose-600 rounded-2xl shadow-sm">
                    <AlertTriangle className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        Something went wrong
                    </h1>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        We encountered an unexpected error while processing your request. Your documents and data remain secure.
                    </p>
                </div>

                {error?.message && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left">
                        <p className="text-xs font-mono text-slate-600 break-words">
                            {error.message}
                        </p>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                    <button
                        onClick={() => reset()}
                        className="w-full sm:flex-1 inline-flex items-center justify-center space-x-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-indigo-100"
                    >
                        <RotateCcw className="w-4 h-4" />
                        <span>Try Again</span>
                    </button>

                    <Link
                        href="/"
                        className="w-full sm:flex-1 inline-flex items-center justify-center space-x-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all"
                    >
                        <Home className="w-4 h-4" />
                        <span>Home</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
