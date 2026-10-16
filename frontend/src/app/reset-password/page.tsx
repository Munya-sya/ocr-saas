'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { resetPassword } from '../../services/api';
import { KeyRound, CheckCircle, AlertCircle, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const tokenParam = searchParams.get('token') || searchParams.get('reset');
        if (tokenParam) {
            setToken(tokenParam);
        } else {
            setError('Missing or invalid password reset token. Please request a new link.');
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMsg(null);

        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match. Please retype your password.');
            return;
        }

        setLoading(true);

        try {
            const res = await resetPassword(token, newPassword);
            setSuccessMsg(res.message || 'Password reset successfully! Redirecting to login...');
            setTimeout(() => {
                router.push('/login');
            }, 2500);
        } catch (err: any) {
            setError(err.message || 'Failed to reset password. Token may have expired.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8">
            <div className="text-center mb-8">
                <div className="inline-flex p-3.5 bg-gradient-to-tr from-rose-500 to-pink-500 text-white rounded-2xl shadow-md shadow-rose-200 mb-4">
                    <KeyRound className="w-7 h-7" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Reset Your Password
                </h1>
                <p className="text-slate-500 text-sm mt-1.5 font-medium">
                    Enter your new password below to regain access to your account.
                </p>
            </div>

            {successMsg && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-2xl flex items-start gap-2.5">
                    <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600" />
                    <span className="font-medium">{successMsg}</span>
                </div>
            )}

            {error && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-2xl flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
                    <span className="font-medium">{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="At least 8 characters"
                            className="w-full px-4 py-3 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
                    <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Retype new password"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading || !token}
                    className="w-full mt-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-rose-100 transition-all disabled:opacity-50 text-sm tracking-wide"
                >
                    {loading ? 'Resetting Password...' : 'Update Password'}
                </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs font-medium">
                <Link href="/login" className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-semibold">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Sign In
                </Link>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen flex flex-col bg-slate-50/50">
            <Header />
            <main className="flex-1 flex items-center justify-center p-4 py-12">
                <Suspense fallback={
                    <div className="flex items-center gap-2 text-slate-600 font-medium">
                        <Loader2 className="w-6 h-6 animate-spin text-rose-600" />
                        Loading reset form...
                    </div>
                }>
                    <ResetPasswordForm />
                </Suspense>
            </main>
            <Footer />
        </div>
    );
}
