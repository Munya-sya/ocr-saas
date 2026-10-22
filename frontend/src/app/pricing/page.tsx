'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { Check, Zap, Sparkles, Shield, ArrowRight, AlertTriangle, X, Loader2, CreditCard, ExternalLink } from 'lucide-react';
import { getCurrentUserProfile, cancelProSubscription, createCheckoutSession, createPortalSession } from '../../services/api';
import { User } from '../../types';

function PricingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [portalLoading, setPortalLoading] = useState(false);

    // Cancel Pro Modal state
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [actionMsg, setActionMsg] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        getCurrentUserProfile()
            .then(res => setUser(res.user))
            .catch(() => setUser(null))
            .finally(() => setLoading(false));

        const billingParam = searchParams.get('billing');
        if (billingParam === 'success') {
            setActionMsg('🎉 Welcome to ScanText Pro! Your subscription has been activated and high-capacity limits are now available.');
        } else if (billingParam === 'canceled') {
            setErrorMsg('Stripe checkout was canceled. No charges were made.');
        }
    }, [searchParams]);

    const handleUpgradeToPro = async () => {
        if (!user) {
            router.push('/login?redirect=/pricing');
            return;
        }

        setCheckoutLoading(true);
        setErrorMsg(null);
        setActionMsg(null);

        try {
            const res = await createCheckoutSession();
            if (res.checkoutUrl) {
                window.location.href = res.checkoutUrl;
            } else if (res.alreadySubscribed) {
                setActionMsg(res.message || 'You are already an active Pro subscriber.');
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to start Stripe checkout.');
        } finally {
            setCheckoutLoading(false);
        }
    };

    const handleManageSubscription = async () => {
        setPortalLoading(true);
        setErrorMsg(null);
        try {
            const res = await createPortalSession();
            if (res.portalUrl) {
                window.location.href = res.portalUrl;
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to open customer portal.');
        } finally {
            setPortalLoading(false);
        }
    };

    const handleConfirmCancel = async () => {
        setCancelling(true);
        setActionMsg(null);
        try {
            const res = await cancelProSubscription();
            setUser(res.user);
            setActionMsg('Your Pro subscription has been cancelled. Account returned to Free Tier.');
            setShowCancelModal(false);
        } catch (err: any) {
            setActionMsg(err.message || 'Failed to cancel Pro subscription.');
        } finally {
            setCancelling(false);
        }
    };

    const isPro = user?.planTier?.toLowerCase() === 'pro';
    const isFree = user?.planTier?.toLowerCase() === 'free' || !user;

    return (
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
            <div className="text-center max-w-3xl mx-auto mb-16">
                <span className="text-sm font-semibold px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                    Transparent Pricing & Pro Capabilities
                </span>
                <h1 className="text-4xl font-extrabold text-slate-900 mt-4 tracking-tight">
                    Simple, Predictable OCR Plans
                </h1>
                <p className="text-slate-600 text-lg mt-3">
                    Extract text for free or upgrade to Pro for 100 conversions per day, 100-page PDF documents, and batch processing.
                </p>

                {actionMsg && (
                    <div className="mt-6 max-w-xl mx-auto p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm font-medium flex items-center gap-2 text-left shadow-sm">
                        <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        <span>{actionMsg}</span>
                    </div>
                )}

                {errorMsg && (
                    <div className="mt-6 max-w-xl mx-auto p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm font-medium flex items-center gap-2 text-left shadow-sm">
                        <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {/* Free Plan Card */}
                <div className={`bg-white rounded-3xl p-8 border shadow-lg flex flex-col justify-between transition-all ${isFree ? 'border-slate-200' : 'border-slate-300 opacity-90'}`}>
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-slate-900">Free Tier</h2>
                            {user && isFree && (
                                <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    Current Plan
                                </span>
                            )}
                            {isPro && (
                                <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                                    Base Tier
                                </span>
                            )}
                        </div>
                        <p className="text-slate-500 text-sm mb-6">
                            Perfect for casual users needing quick text extraction from photos, receipts, or short scanned pages.
                        </p>
                        <div className="flex items-baseline gap-1 mb-8">
                            <span className="text-4xl font-extrabold text-slate-900">$0</span>
                            <span className="text-slate-500 font-medium">/ forever</span>
                        </div>

                        <ul className="space-y-4 text-sm text-slate-700">
                            <li className="flex items-center gap-3">
                                <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                <span><strong>3 Conversions</strong> per 24 hours</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                <span><strong>10 MB</strong> Maximum file size</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                <span><strong>5 PDF Pages</strong> max per document</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                <span>Tesseract 5 Multi-language OCR (eng, deu, fra, spa)</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                <span>Ad-supported free service</span>
                            </li>
                        </ul>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100">
                        {isPro ? (
                            <Link
                                href="/dashboard"
                                className="w-full inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-xl border border-slate-200 transition-colors text-sm"
                            >
                                Switch in Customer Portal
                            </Link>
                        ) : user ? (
                            <Link
                                href="/dashboard"
                                className="w-full inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-3 rounded-xl border border-slate-300 transition-colors text-sm"
                            >
                                <Check className="w-4 h-4 text-emerald-600" />
                                Current Active Plan (Go to Dashboard)
                            </Link>
                        ) : (
                            <Link
                                href="/register"
                                className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl shadow transition-colors text-sm"
                            >
                                Get Started Free
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        )}
                    </div>
                </div>

                {/* Pro Plan Card */}
                <div className={`rounded-3xl p-8 border shadow-2xl flex flex-col justify-between relative overflow-hidden transition-all ${isPro ? 'bg-gradient-to-b from-blue-950 via-slate-900 to-indigo-950 text-white border-amber-400 ring-2 ring-amber-400/50' : 'bg-gradient-to-b from-blue-900 to-indigo-950 text-white border-blue-800'}`}>
                    <div className="absolute top-4 right-4 bg-amber-400 text-slate-950 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow">
                        <Sparkles className="w-3.5 h-3.5" />
                        {isPro ? 'ACTIVE PRO TIER' : 'RECOMMENDED'}
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Zap className="w-5 h-5 text-amber-400" />
                                Pro Tier
                            </h2>
                            {isPro && (
                                <span className="text-xs font-semibold px-2.5 py-1 bg-amber-400 text-slate-950 rounded-full font-bold">
                                    ✓ Current Plan
                                </span>
                            )}
                        </div>
                        <p className="text-blue-200 text-sm mb-6">
                            Tailored for businesses, legal teams, and researchers handling large volume multi-page documents.
                        </p>
                        <div className="flex items-baseline gap-1 mb-8">
                            <span className="text-4xl font-extrabold text-white">$5</span>
                            <span className="text-blue-300 font-medium">/ month</span>
                        </div>

                        <ul className="space-y-4 text-sm text-blue-100">
                            <li className="flex items-center gap-3">
                                <Check className="w-5 h-5 text-amber-400 flex-shrink-0" />
                                <span><strong>100 Conversions</strong> per 24 hours</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Check className="w-5 h-5 text-amber-400 flex-shrink-0" />
                                <span><strong>50 MB</strong> Maximum file size</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Check className="w-5 h-5 text-amber-400 flex-shrink-0" />
                                <span><strong>100 PDF Pages</strong> max per document</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Check className="w-5 h-5 text-amber-400 flex-shrink-0" />
                                <span><strong>Batch Processing</strong> (Multi-file async queues)</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Check className="w-5 h-5 text-amber-400 flex-shrink-0" />
                                <span><strong>Zero Advertisements</strong> (Ad-free UI experience)</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Check className="w-5 h-5 text-amber-400 flex-shrink-0" />
                                <span>Priority Celery Worker Processing & Fast Track</span>
                            </li>
                        </ul>
                    </div>

                    <div className="mt-8 pt-6 border-t border-blue-800/80 space-y-3">
                        {isPro ? (
                            <>
                                <button
                                    onClick={handleManageSubscription}
                                    disabled={portalLoading}
                                    className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold py-3 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                                >
                                    {portalLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Opening Portal...
                                        </>
                                    ) : (
                                        <>
                                            <CreditCard className="w-4 h-4" />
                                            Manage Subscription & Invoices
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => setShowCancelModal(true)}
                                    className="w-full bg-slate-800/80 hover:bg-slate-800 text-rose-300 hover:text-rose-200 font-medium py-2 rounded-xl border border-rose-900/40 transition-colors text-xs flex items-center justify-center gap-1.5"
                                >
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    Cancel Pro Subscription
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={handleUpgradeToPro}
                                disabled={checkoutLoading}
                                className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold py-3.5 rounded-xl shadow-xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                            >
                                {checkoutLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                                        Redirecting to Stripe Checkout...
                                    </>
                                ) : (
                                    <>
                                        <CreditCard className="w-4 h-4" />
                                        Upgrade to Pro ($5/mo)
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Cancel Pro Subscription Confirmation Modal */}
            {showCancelModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative">
                        <button
                            onClick={() => setShowCancelModal(false)}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
                            <AlertTriangle className="w-6 h-6" />
                        </div>

                        <h3 className="text-xl font-bold text-slate-900">Cancel Pro Subscription?</h3>
                        <p className="text-slate-600 text-sm mt-2 leading-relaxed">
                            Are you sure you want to cancel your <strong>Pro Plan ($5/mo)</strong>? Your account will revert to the <strong>Free Tier</strong> (3 conversions/day, 10MB file limit, 5 PDF pages max).
                        </p>

                        <div className="mt-6 flex items-center gap-3">
                            <button
                                onClick={() => setShowCancelModal(false)}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition-colors text-sm"
                            >
                                Keep Pro Plan
                            </button>
                            <button
                                onClick={handleConfirmCancel}
                                disabled={cancelling}
                                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl shadow transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-60"
                            >
                                {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

export default function PricingPage() {
    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            <Header />
            <Suspense fallback={
                <div className="flex-1 flex items-center justify-center py-20 text-slate-500 font-medium">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                    Loading pricing options...
                </div>
            }>
                <PricingContent />
            </Suspense>
            <Footer />
        </div>
    );
}
