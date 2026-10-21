'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import {
    getCurrentUserProfile,
    deleteAccount,
    exportUserData,
    resendVerificationEmail,
    fetchRecentJobs,
    createPortalSession,
    createCheckoutSession
} from '../../services/api';
import { UserProfileResponse, AsyncJobStatusResponse } from '../../types';
import {
    User, Shield, Gauge, Zap, Trash2, AlertTriangle, FileText, CheckCircle,
    Mail, Clock, ArrowRight, Loader2, CreditCard, Sparkles, ExternalLink, Download
} from 'lucide-react';

function DashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [profile, setProfile] = useState<UserProfileResponse | null>(null);
    const [recentJobs, setRecentJobs] = useState<AsyncJobStatusResponse[]>([]);
    const [loadingJobs, setLoadingJobs] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [resending, setResending] = useState(false);
    const [resendStatus, setResendStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const [portalLoading, setPortalLoading] = useState(false);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [billingMsg, setBillingMsg] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

    useEffect(() => {
        getCurrentUserProfile()
            .then(res => setProfile(res))
            .catch(err => {
                setError(err.message || 'Please log in to access your dashboard.');
                setTimeout(() => router.push('/login'), 2000);
            })
            .finally(() => setLoading(false));

        fetchRecentJobs()
            .then(jobs => setRecentJobs(jobs))
            .catch(() => setRecentJobs([]))
            .finally(() => setLoadingJobs(false));

        const billingParam = searchParams.get('billing');
        if (billingParam === 'success') {
            setBillingMsg({
                type: 'success',
                message: '🎉 Thank you for subscribing to ScanText Pro! Your account limits and batch features are now active.'
            });
        } else if (billingParam === 'canceled') {
            setBillingMsg({
                type: 'info',
                message: 'Stripe subscription checkout was canceled. No payment was deducted.'
            });
        }
    }, [router, searchParams]);

    const handleResendVerification = async () => {
        setResending(true);
        setResendStatus(null);
        try {
            const res = await resendVerificationEmail();
            setResendStatus({ type: 'success', message: res.message || 'Verification email resent successfully!' });
        } catch (err: any) {
            setResendStatus({ type: 'error', message: err.message || 'Failed to resend verification email.' });
        } finally {
            setResending(false);
        }
    };

    const handleExportData = async () => {
        setExporting(true);
        try {
            const blob = await exportUserData();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const userId = profile?.user?.id ? profile.user.id.slice(0, 8) : 'data';
            a.download = `scantext_user_data_${userId}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err: any) {
            alert(err.message || 'Failed to export your data.');
        } finally {
            setExporting(false);
        }
    };

    const handleDeleteAccount = async () => {
        setDeleting(true);
        try {
            await deleteAccount();
            router.push('/');
        } catch (err: any) {
            setError(err.message || 'Failed to delete account.');
            setDeleting(false);
        }
    };

    const handleOpenPortal = async () => {
        setPortalLoading(true);
        try {
            const res = await createPortalSession();
            if (res.portalUrl) {
                window.location.href = res.portalUrl;
            }
        } catch (err: any) {
            alert(err.message || 'Could not open billing portal.');
        } finally {
            setPortalLoading(false);
        }
    };

    const handleQuickUpgrade = async () => {
        setCheckoutLoading(true);
        try {
            const res = await createCheckoutSession();
            if (res.checkoutUrl) {
                window.location.href = res.checkoutUrl;
            }
        } catch (err: any) {
            alert(err.message || 'Could not start checkout.');
        } finally {
            setCheckoutLoading(false);
        }
    };

    if (loading) {
        return (
            <main className="flex-1 flex items-center justify-center p-8">
                <div className="flex items-center gap-3 text-slate-600 font-medium">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    Loading your dashboard...
                </div>
            </main>
        );
    }

    if (error || !profile) {
        return (
            <main className="flex-1 flex items-center justify-center p-8">
                <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center border border-slate-200">
                    <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                    <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
                    <p className="text-slate-600 text-sm mt-2">{error || 'Please sign in to view your dashboard.'}</p>
                    <Link
                        href="/login"
                        className="mt-6 inline-block bg-blue-600 text-white font-semibold px-6 py-2.5 rounded-xl shadow hover:bg-blue-700 transition-colors"
                    >
                        Go to Login
                    </Link>
                </div>
            </main>
        );
    }

    const { user, quota } = profile;
    const isPro = user.planTier?.toLowerCase() === 'pro';
    const usagePercent = Math.min(100, Math.round((quota.conversionsUsedToday / quota.maxDailyConversions) * 100));

    return (
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
            {/* Billing Notification Banner */}
            {billingMsg && (
                <div className={`mb-6 p-4 rounded-2xl border text-sm font-medium flex items-center gap-3 shadow-sm ${billingMsg.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-blue-50 border-blue-200 text-blue-800'
                    }`}>
                    {billingMsg.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    ) : (
                        <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    )}
                    <span>{billingMsg.message}</span>
                </div>
            )}

            {/* Unverified Account Warning Banner */}
            {!user.isVerified && (
                <div className="mb-6 bg-gradient-to-r from-amber-500 to-orange-600 text-white p-5 rounded-3xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl">
                            <AlertTriangle className="w-6 h-6 text-amber-100" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold flex items-center gap-2">
                                Your Email Address is Unverified
                            </h3>
                            <p className="text-xs text-amber-100 mt-1 leading-relaxed">
                                We sent a verification link to <strong className="text-white underline">{user.email}</strong>. Please check your inbox or spam folder to complete account setup.
                            </p>
                            {resendStatus && (
                                <div className={`mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg inline-block ${resendStatus.type === 'success' ? 'bg-emerald-950/70 text-emerald-200 border border-emerald-500/50' : 'bg-red-950/70 text-red-200 border border-red-500/50'}`}>
                                    {resendStatus.message}
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleResendVerification}
                        disabled={resending}
                        className="bg-white text-orange-700 hover:bg-orange-50 font-bold px-5 py-2.5 rounded-2xl shadow transition-colors text-xs whitespace-nowrap flex items-center gap-2 disabled:opacity-50"
                    >
                        <Mail className="w-4 h-4" />
                        {resending ? 'Sending Email...' : 'Resend Verification Email'}
                    </button>
                </div>
            )}

            {/* Welcome Header with Plan Badge */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                        <User className="w-8 h-8" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-slate-900">{user.email}</h1>
                            {user.isVerified ? (
                                <span className="text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Verified
                                </span>
                            ) : (
                                <span className="text-xs font-semibold px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    Unverified
                                </span>
                            )}
                        </div>
                        <p className="text-slate-500 text-sm mt-1">
                            Account ID: <span className="font-mono text-slate-700">{user.id}</span>
                        </p>
                    </div>
                </div>

                <div className={`px-5 py-3 rounded-2xl border flex items-center gap-3 ${isPro ? 'bg-amber-50/70 border-amber-200 text-slate-900' : 'bg-slate-50 border-slate-200'}`}>
                    {isPro ? (
                        <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    ) : (
                        <Shield className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    )}
                    <div>
                        <div className="text-xs text-slate-500 font-medium">Subscription Tier</div>
                        <div className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <span>{quota.planTier} Plan</span>
                            {isPro && (
                                <span className="text-[10px] bg-amber-200 text-amber-900 font-extrabold px-1.5 py-0.5 rounded">
                                    ACTIVE
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Quota & Usage Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Conversions Used */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Daily Usage</span>
                            <h3 className="text-3xl font-extrabold text-slate-900 mt-1">
                                {quota.conversionsUsedToday} <span className="text-sm font-normal text-slate-500">/ {quota.maxDailyConversions}</span>
                            </h3>
                        </div>
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                            <Gauge className="w-6 h-6" />
                        </div>
                    </div>

                    <div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden mb-2">
                            <div
                                className={`h-full transition-all duration-500 ${usagePercent >= 100 ? 'bg-red-500' : usagePercent >= 66 ? 'bg-amber-500' : 'bg-blue-600'
                                    }`}
                                style={{ width: `${usagePercent}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                            {quota.conversionsRemaining} conversion{quota.conversionsRemaining !== 1 ? 's' : ''} remaining today
                        </p>
                    </div>
                </div>

                {/* Max File Size */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                    <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">File Size Limit</span>
                        <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{quota.maxFileMb} MB</h3>
                        <p className="text-xs text-slate-500 mt-1">Maximum allowed per document</p>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <FileText className="w-7 h-7" />
                    </div>
                </div>

                {/* Max PDF Pages */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                    <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">PDF Page Limit</span>
                        <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{quota.maxPdfPages} Pages</h3>
                        <p className="text-xs text-slate-500 mt-1">Maximum pages per PDF document</p>
                    </div>
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                        <Zap className="w-7 h-7" />
                    </div>
                </div>
            </div>

            {/* Recent OCR Jobs Section */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm mb-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Recent OCR Conversions</h3>
                        <p className="text-sm text-slate-500 mt-1">Your recent processed documents and text extraction status.</p>
                    </div>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl transition-colors"
                    >
                        <Zap className="w-3.5 h-3.5" />
                        New Conversion
                    </Link>
                </div>

                {loadingJobs ? (
                    <div className="flex items-center justify-center py-12 text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" />
                        <span>Loading conversion history...</span>
                    </div>
                ) : recentJobs.length === 0 ? (
                    <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                        <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <h4 className="text-base font-bold text-slate-700">No conversions recorded yet</h4>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
                            Upload a scanned document, receipt, or PDF on the homepage to start extracting searchable text.
                        </p>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow transition-colors"
                        >
                            Start OCR Conversion
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                                    <th className="pb-3 px-4">Document</th>
                                    <th className="pb-3 px-4">Status</th>
                                    <th className="pb-3 px-4">Pages</th>
                                    <th className="pb-3 px-4">Language</th>
                                    <th className="pb-3 px-4">Submitted</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recentJobs.map((job) => (
                                    <tr key={job.jobId} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="py-3.5 px-4 font-medium text-slate-800 flex items-center gap-2.5">
                                            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                                                <FileText className="w-4 h-4" />
                                            </div>
                                            <span className="truncate max-w-[200px]" title={job.filename}>
                                                {job.filename}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${job.status === 'completed'
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : job.status === 'processing'
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : job.status === 'failed'
                                                            ? 'bg-red-100 text-red-800'
                                                            : 'bg-amber-100 text-amber-800'
                                                }`}>
                                                {job.status === 'completed' && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                                                {job.status === 'processing' && <Loader2 className="w-3 h-3 animate-spin text-blue-600" />}
                                                {job.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-600">{job.pageCount} pg</td>
                                        <td className="py-3.5 px-4 text-slate-600 uppercase font-mono text-xs">{job.language}</td>
                                        <td className="py-3.5 px-4 text-slate-500 text-xs">
                                            {new Date(job.createdAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Ad Banner for Free Users Only (Pro Users get Ad-Free Experience) */}
            {!isPro && (
                <div className="mb-8 p-4 bg-gradient-to-r from-slate-100 via-indigo-50/50 to-slate-100 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
                    <span className="font-semibold text-slate-700 mr-2">Sponsored:</span>
                    Need high-speed OCR API integration for your business?{' '}
                    <Link href="/pricing" className="text-blue-600 font-bold hover:underline">
                        Upgrade to Pro to remove all ads and unlock 100 conversions/day.
                    </Link>
                </div>
            )}

            {/* Subscription & Account Settings Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Subscription Management Card */}
                {isPro ? (
                    <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-8 shadow-xl flex flex-col justify-between border border-indigo-900">
                        <div>
                            <div className="inline-flex items-center gap-2 bg-amber-400 text-slate-950 px-3 py-1 rounded-full text-xs font-bold mb-4 shadow">
                                <Sparkles className="w-3.5 h-3.5" />
                                Active Pro Subscriber
                            </div>
                            <h3 className="text-2xl font-bold">Stripe Billing & Portal</h3>
                            <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                                Your account is enjoying 100 conversions/day, 50MB file limits, and 100-page PDF documents with zero ads.
                            </p>
                            {user.currentPeriodEnd && (
                                <p className="text-xs text-amber-300 mt-3 font-medium">
                                    Current billing period ends:{' '}
                                    <strong>{new Date(user.currentPeriodEnd).toLocaleDateString()}</strong>
                                </p>
                            )}
                        </div>
                        <div className="mt-6 flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={handleOpenPortal}
                                disabled={portalLoading}
                                className="inline-flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-6 py-3 rounded-xl shadow transition-colors text-sm disabled:opacity-50"
                            >
                                {portalLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Opening Portal...
                                    </>
                                ) : (
                                    <>
                                        <CreditCard className="w-4 h-4" />
                                        Manage Subscription
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl p-8 shadow-xl flex flex-col justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold mb-4">
                                <Zap className="w-3.5 h-3.5 text-amber-300" />
                                Need Higher Limits?
                            </div>
                            <h3 className="text-2xl font-bold">Upgrade to ScanText Pro</h3>
                            <p className="text-blue-100 text-sm mt-2 leading-relaxed">
                                Unlock 100 daily conversions, 50MB maximum document file uploads, 100 pages per PDF, batch processing, and an ad-free workspace.
                            </p>
                        </div>
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={handleQuickUpgrade}
                                disabled={checkoutLoading}
                                className="inline-flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-6 py-3 rounded-xl shadow transition-colors text-sm disabled:opacity-50"
                            >
                                {checkoutLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Connecting to Stripe...
                                    </>
                                ) : (
                                    <>
                                        <CreditCard className="w-4 h-4" />
                                        Upgrade to Pro ($19/mo)
                                    </>
                                )}
                            </button>
                            <Link
                                href="/pricing"
                                className="inline-flex items-center justify-center bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-3 rounded-xl transition-colors text-sm"
                            >
                                Compare Plans
                            </Link>
                        </div>
                    </div>
                )}

                {/* Account Settings & Danger Zone */}
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Account & Privacy Management</h3>
                        <p className="text-slate-500 text-sm mb-6">
                            Export your account data in compliance with GDPR Article 20 / CCPA, or permanently purge your account and saved documents.
                        </p>

                        <div className="mb-6">
                            <button
                                onClick={handleExportData}
                                disabled={exporting}
                                className="flex items-center gap-2 text-slate-700 hover:text-slate-900 font-semibold text-sm border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
                            >
                                {exporting ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Download className="w-4 h-4 text-blue-600" />}
                                {exporting ? 'Preparing Export...' : 'Export My Personal Data (GDPR / CCPA)'}
                            </button>
                            <p className="text-[11px] text-slate-400 mt-1.5">
                                Downloads your complete profile, subscription status, conversion history, and audit log entries as JSON.
                            </p>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="flex items-center gap-2 text-red-600 hover:text-red-700 font-semibold text-sm border border-red-200 hover:border-red-300 bg-red-50/50 hover:bg-red-50 px-4 py-2.5 rounded-xl transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Account & Purge Saved Jobs
                        </button>
                    </div>
                </div>
            </div>

            {/* Account Deletion Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
                        <div className="flex items-center gap-3 text-red-600 mb-4">
                            <div className="p-3 bg-red-50 rounded-2xl">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Delete Your Account?</h3>
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed mb-6">
                            This action is permanent and cannot be undone. All your saved OCR job history, email records, and profile settings will be deleted immediately.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleting}
                                className="px-5 py-2.5 text-sm font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow transition-colors disabled:opacity-50"
                            >
                                {deleting ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

export default function DashboardPage() {
    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            <Header />
            <Suspense fallback={
                <div className="flex-1 flex items-center justify-center p-12 text-slate-500 font-medium">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                    Loading your dashboard...
                </div>
            }>
                <DashboardContent />
            </Suspense>
            <Footer />
        </div>
    );
}
