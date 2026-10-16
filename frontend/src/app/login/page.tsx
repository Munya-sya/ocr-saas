'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { loginUser, verifyEmailToken, forgotPassword, resetPassword } from '../../services/api';
import { LogIn, Mail, Lock, CheckCircle, AlertCircle, KeyRound, Loader2, Eye, EyeOff } from 'lucide-react';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Forgot / Reset Password state
    const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login');
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');

    useEffect(() => {
        const verifyToken = searchParams.get('verify');
        const reset = searchParams.get('reset');
        const errorParam = searchParams.get('error');

        if (errorParam === 'suspended') {
            setError('Your account has been suspended due to security policy violations. If you believe this was in error, please contact system support.');
        } else if (errorParam === 'oauth_cancelled') {
            setError('Google sign-in was canceled or timed out. Please try again.');
        } else if (errorParam === 'oauth_failed') {
            setError('Google sign-in encountered an error. Please verify your connection or use email and password.');
        } else if (errorParam === 'oauth_not_configured') {
            setError('Google OAuth is not configured on this server. Please use email and password.');
        } else if (errorParam) {
            setError(decodeURIComponent(errorParam));
        } else if (verifyToken) {
            verifyEmailToken(verifyToken)
                .then(res => setSuccessMsg(res.message))
                .catch(err => setError(err.message));
        } else if (reset) {
            setMode('reset');
            setResetToken(reset);
        }
    }, [searchParams]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMsg(null);
        setLoading(true);

        try {
            await loginUser(email, password);
            router.push('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Login failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleAuth = async () => {
        setError(null);
        try {
            const res = await fetch('/api/v1/auth/google/login');
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.detail || 'Failed to initiate Google OAuth.');
            }
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err: any) {
            setError(err.message || 'Google OAuth is not configured.');
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMsg(null);
        setLoading(true);

        try {
            const res = await forgotPassword(email);
            setSuccessMsg(res.message);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMsg(null);
        setLoading(true);

        try {
            const res = await resetPassword(resetToken, newPassword);
            setSuccessMsg(res.message);
            setMode('login');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8">
            {/* Header Section matching User Mockup UI */}
            <div className="text-center mb-8">
                <div className="inline-flex p-3.5 bg-gradient-to-tr from-violet-600 to-indigo-500 text-white rounded-2xl shadow-md shadow-indigo-200 mb-4">
                    <LogIn className="w-7 h-7" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    {mode === 'login' ? 'Sign in with us today' : mode === 'forgot' ? 'Forgot Password?' : 'Set New Password'}
                </h1>
                <p className="text-slate-500 text-sm mt-1.5 font-medium">
                    {mode === 'login'
                        ? 'Enter your email and password to sign in your account'
                        : 'Enter your account email to receive a single-use reset link'}
                </p>
            </div>

            {successMsg && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-2xl flex items-start gap-2.5">
                    <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600" />
                    <span className="font-medium">{successMsg}</span>
                </div>
            )}

            {error && (
                <div className={`mb-6 p-4 rounded-2xl border text-sm flex items-start gap-3 ${
                    error.toLowerCase().includes('suspended')
                        ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-sm'
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}>
                    <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        error.toLowerCase().includes('suspended') ? 'text-amber-600' : 'text-rose-600'
                    }`} />
                    <div className="space-y-1">
                        <p className="font-semibold text-sm">
                            {error.toLowerCase().includes('suspended') ? 'Account Suspended' : 'Notice'}
                        </p>
                        <p className="text-xs leading-relaxed opacity-90">{error}</p>
                        {error.toLowerCase().includes('suspended') && (
                            <div className="pt-1.5">
                                <Link
                                    href="/contact"
                                    className="inline-flex items-center text-xs font-semibold text-amber-800 hover:text-amber-950 underline underline-offset-2"
                                >
                                    Contact Support &rarr;
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {mode === 'login' && (
                <div className="space-y-5">
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="Email"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all text-sm"
                            />
                        </div>

                        <div>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Password"
                                    className="w-full px-4 py-3 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            <div className="text-right mt-2">
                                <button
                                    type="button"
                                    onClick={() => setMode('forgot')}
                                    className="text-xs font-semibold text-slate-700 hover:text-violet-600 underline underline-offset-2"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-indigo-100 transition-all disabled:opacity-50 text-sm tracking-wide"
                        >
                            {loading ? 'Signing In...' : 'Sign In'}
                        </button>
                    </form>

                    {/* OR Divider */}
                    <div className="relative my-6 flex items-center justify-center">
                        <div className="w-full border-t border-slate-200"></div>
                        <span className="bg-white px-4 text-xs font-semibold text-slate-400 uppercase tracking-widest absolute">OR</span>
                    </div>

                    {/* Google Sign-In Button */}
                    <button
                        type="button"
                        onClick={handleGoogleAuth}
                        className="w-full flex items-center justify-center gap-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-800 font-medium py-3 rounded-xl transition-all text-sm shadow-sm"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span>Continue with google</span>
                    </button>
                </div>
            )}

            {mode === 'forgot' && (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="Email address"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-semibold py-3.5 rounded-xl shadow-md transition-all disabled:opacity-50 text-sm"
                    >
                        {loading ? 'Sending Link...' : 'Send Reset Link'}
                    </button>

                    <button
                        type="button"
                        onClick={() => setMode('login')}
                        className="w-full text-xs text-slate-600 hover:text-slate-900 font-semibold py-2"
                    >
                        Back to Sign In
                    </button>
                </form>
            )}

            {mode === 'reset' && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                        <input
                            type="password"
                            required
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="At least 8 characters"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-semibold py-3.5 rounded-xl shadow-md transition-all disabled:opacity-50 text-sm"
                    >
                        {loading ? 'Resetting Password...' : 'Reset Password'}
                    </button>
                </form>
            )}

            <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs font-medium text-slate-500">
                Don't have an account?{' '}
                <Link href="/register" className="text-violet-600 hover:underline font-bold">
                    Sign Up
                </Link>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex flex-col bg-slate-50/50">
            <Header />
            <main className="flex-1 flex items-center justify-center p-4 py-12">
                <Suspense fallback={
                    <div className="flex items-center gap-2 text-slate-600 font-medium">
                        <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
                        Loading login form...
                    </div>
                }>
                    <LoginForm />
                </Suspense>
            </main>
            <Footer />
        </div>
    );
}
