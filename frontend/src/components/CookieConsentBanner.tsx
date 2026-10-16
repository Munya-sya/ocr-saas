'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cookie, Shield, Check, X } from 'lucide-react';

export const CookieConsentBanner: React.FC = () => {
    const [consentGiven, setConsentGiven] = useState<boolean>(true); // default true to avoid flash on SSR
    const [showCustomize, setShowCustomize] = useState<boolean>(false);
    const [analyticsConsent, setAnalyticsConsent] = useState<boolean>(true);

    useEffect(() => {
        const stored = localStorage.getItem('scantext_cookie_consent');
        if (!stored) {
            setConsentGiven(false);
        }
    }, []);

    const handleAcceptAll = () => {
        localStorage.setItem('scantext_cookie_consent', JSON.stringify({ essential: true, analytics: true, timestamp: new Date().toISOString() }));
        setConsentGiven(true);
    };

    const handleEssentialOnly = () => {
        localStorage.setItem('scantext_cookie_consent', JSON.stringify({ essential: true, analytics: false, timestamp: new Date().toISOString() }));
        setConsentGiven(true);
    };

    const handleSaveCustom = () => {
        localStorage.setItem('scantext_cookie_consent', JSON.stringify({ essential: true, analytics: analyticsConsent, timestamp: new Date().toISOString() }));
        setConsentGiven(true);
    };

    if (consentGiven) {
        return null;
    }

    return (
        <section
            aria-label="Cookie consent banner"
            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-2xl p-5 text-slate-800 transition-all animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                    <Cookie className="w-5 h-5" />
                </div>
                <div className="flex-1 space-y-1">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        <span>Cookie &amp; Privacy Preferences</span>
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        We use essential cookies to maintain secure sessions and keep you signed in. We also use privacy-friendly analytics and advertising cookies to support our free OCR tier.
                    </p>
                </div>
                <button
                    onClick={handleEssentialOnly}
                    className="text-slate-400 hover:text-slate-600 p-1"
                    title="Dismiss with essential cookies"
                    aria-label="Dismiss cookie banner"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {showCustomize && (
                <div className="my-3 pt-3 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <div>
                            <span className="font-semibold text-slate-900 block">Strictly Necessary</span>
                            <span className="text-slate-500 text-[11px]">Required for login, security, and CSRF protection.</span>
                        </div>
                        <span className="text-[11px] font-bold text-blue-600 uppercase bg-blue-100/60 px-2 py-0.5 rounded">
                            Always Active
                        </span>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <div>
                            <span className="font-semibold text-slate-900 block">Advertising &amp; Analytics</span>
                            <span className="text-slate-500 text-[11px]">Supports free anonymous OCR tier.</span>
                        </div>
                        <input
                            type="checkbox"
                            checked={analyticsConsent}
                            onChange={(e) => setAnalyticsConsent(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                    </div>
                </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                    <Link href="/cookies" className="text-blue-600 hover:underline font-medium text-[11px]">
                        Cookie Policy
                    </Link>
                    <span className="text-slate-300">&bull;</span>
                    <Link href="/privacy" className="text-blue-600 hover:underline font-medium text-[11px]">
                        Privacy
                    </Link>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {!showCustomize ? (
                        <>
                            <button
                                onClick={() => setShowCustomize(true)}
                                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 font-medium text-xs rounded-lg hover:bg-slate-100 transition-colors"
                            >
                                Customize
                            </button>
                            <button
                                onClick={handleEssentialOnly}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors"
                            >
                                Essential Only
                            </button>
                            <button
                                onClick={handleAcceptAll}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1"
                            >
                                <Check className="w-3.5 h-3.5" />
                                <span>Accept All</span>
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={handleSaveCustom}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors"
                        >
                            Save Preferences
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
};
