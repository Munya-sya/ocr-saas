'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, Zap, ArrowRight, X, AlertTriangle, ShieldCheck } from 'lucide-react';

interface QuotaExceededModalProps {
    isOpen: boolean;
    onClose: () => void;
    message?: string;
}

export function QuotaExceededModal({ isOpen, onClose, message }: QuotaExceededModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
                {/* Top Accent Gradient Header */}
                <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 p-6 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
                        <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                        Free Plan Quota Exceeded
                    </div>
                    <h3 className="text-2xl font-extrabold text-white tracking-tight">
                        Daily Limit Reached
                    </h3>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-5">
                    <p className="text-slate-600 text-sm leading-relaxed">
                        {message || "You have reached your daily free conversion limit. Upgrade to Pro for unlimited conversions and priority processing queues."}
                    </p>

                    {/* Pro Tier Perks Box */}
                    <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-5 border border-indigo-950/40 shadow-inner space-y-3">
                        <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                            <Zap className="w-4 h-4" />
                            <span>Unlock Pro Plan Benefits:</span>
                        </div>
                        <ul className="space-y-2 text-xs text-slate-200">
                            <li className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                <span><strong>Unlimited OCR Conversions</strong> per day</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                <span>Up to <strong>50 MB File Uploads</strong> & <strong>100 PDF Pages</strong></span>
                            </li>
                            <li className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                <span>Priority Async Celery Worker Queues (~100x speed)</span>
                            </li>
                        </ul>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                        <Link
                            href="/pricing"
                            onClick={onClose}
                            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all text-sm"
                        >
                            <Zap className="w-4 h-4 text-amber-300" />
                            View Pro Plans & Pricing
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <button
                            onClick={onClose}
                            className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl border border-slate-300 transition-colors text-sm"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
