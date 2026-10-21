'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, ShieldCheck } from 'lucide-react';
import { User, PublicAdConfig } from '../types';
import { getPublicAdConfig } from '../services/api';

interface AdSlotProps {
    placement: 'below-upload' | 'below-results';
    user?: User | null;
}

/**
 * AdSlot Component for Free and Anonymous Tiers.
 *
 * Rules:
 * 1. Pro users (`planTier === 'pro'`) NEVER receive any ad markup or scripts.
 * 2. Positioned strictly below the upload form or below completed results.
 * 3. Never placed beside or inside conversion/action buttons (Upload, Convert, Copy, Download, Clear).
 * 4. When AdSense is enabled with a Client ID, injects adsbygoogle.js and renders responsive ad unit.
 * 5. When AdSense is disabled or in development, renders a compliant, styled placeholder sponsor card.
 */
export const AdSlot: React.FC<AdSlotProps> = ({ placement, user }) => {
    const [adConfig, setAdConfig] = useState<PublicAdConfig | null>(null);
    const [hasAdConsent, setHasAdConsent] = useState<boolean>(true);

    const isPro = user?.planTier?.toLowerCase() === 'pro';

    useEffect(() => {
        if (isPro) return;

        getPublicAdConfig()
            .then(cfg => {
                setAdConfig(cfg);
            })
            .catch(() => {});

        // GDPR / ePrivacy Compliance: Check user cookie consent
        try {
            const consent = localStorage.getItem('scantext_cookie_consent');
            if (consent) {
                const parsed = JSON.parse(consent);
                if (parsed.analytics === false) {
                    setHasAdConsent(false);
                }
            }
        } catch {}
    }, [isPro]);

    useEffect(() => {
        if (isPro || !hasAdConsent || !adConfig?.adsenseEnabled || !adConfig.clientId) return;

        // Ensure AdSense script is injected once
        const scriptId = 'google-adsense-script';
        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adConfig.clientId)}`;
            script.async = true;
            script.crossOrigin = 'anonymous';
            document.head.appendChild(script);
        }

        // Initialize ad unit
        try {
            // @ts-ignore
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch {
            // ignore initial push exceptions in development
        }
    }, [isPro, adConfig, hasAdConsent, placement]);

    // Pro subscribers never see ads (rendered after all hooks to comply with React rules)
    if (isPro) {
        return null;
    }

    const placementTitle = placement === 'below-upload' ? 'Standard Banner' : 'Results Footer Banner';
    const activeSlotId = placement === 'below-upload' ? adConfig?.slotBelowUpload : adConfig?.slotBelowResults;
    const isLiveAdSense = Boolean(hasAdConsent && adConfig?.adsenseEnabled && adConfig?.clientId);

    return (
        <aside
            aria-label="Advertisement"
            className="w-full my-8 p-4 bg-slate-50/90 border border-dashed border-slate-300 rounded-2xl text-center shadow-sm transition-all"
        >
            <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                    Advertisement &bull; {placementTitle}
                </span>
                <Link
                    href="/pricing"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Go Ad-Free with Pro</span>
                </Link>
            </div>

            {isLiveAdSense ? (
                /* Real Google AdSense Container */
                <div className="min-h-[90px] w-full overflow-hidden bg-white border border-slate-200/80 rounded-xl p-2 flex items-center justify-center">
                    <ins
                        className="adsbygoogle"
                        style={{ display: 'block', minWidth: '280px', width: '100%', minHeight: '90px' }}
                        data-ad-client={adConfig?.clientId}
                        {...(activeSlotId ? { 'data-ad-slot': activeSlotId } : {})}
                        data-ad-format="auto"
                        data-full-width-responsive="true"
                    />
                </div>
            ) : (
                /* Compliant Development / Sponsor Placeholder */
                <div className="min-h-[90px] sm:min-h-[100px] w-full bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-semibold text-xs rounded border border-blue-200">
                                Free Tier Sponsor
                            </span>
                            <span className="text-xs text-slate-500 font-medium">ScanText OCR Network</span>
                        </div>
                        <p className="text-xs text-slate-600 max-w-lg">
                            Support free open-source document text extraction. Upgrade to <strong>ScanText Pro</strong> for unlimited batch processing, 50MB files, priority queues, and an ad-free experience.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                        <Link
                            href="/pricing"
                            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg text-xs shadow-sm transition-all text-center"
                        >
                            Learn More
                        </Link>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-center gap-2 mt-2 text-[10px] text-slate-400">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                <span>Strict zero-retention privacy &bull; Your files are never scanned for ad targeting</span>
            </div>
        </aside>
    );
};
