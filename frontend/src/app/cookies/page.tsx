import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { Cookie, ShieldCheck, Lock, Sliders, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Cookie Policy | ScanText OCR SaaS',
    description: 'Learn about our cookie policy, session token management, advertising disclosure, and how to manage cookie preferences.',
    alternates: {
        canonical: '/cookies',
    },
};

export default function CookiesPage() {
    return (
        <div className="min-h-screen flex flex-col justify-between bg-slate-50">
            <Header />

            <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
                {/* Header */}
                <div className="space-y-3 border-b border-slate-200 pb-6">
                    <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
                        <Cookie className="w-3.5 h-3.5" />
                        <span>Transparency &amp; Consent</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                        Cookie Policy
                    </h1>
                    <p className="text-slate-600 text-sm">Last updated: October 2026</p>
                </div>

                <div className="prose prose-slate max-w-none space-y-6 text-slate-700 text-sm sm:text-base leading-relaxed">
                    <section className="bg-white p-6 rounded-2xl space-y-3 border border-slate-200">
                        <h2 className="text-slate-900 font-bold text-lg flex items-center gap-2">
                            <Lock className="w-5 h-5 text-blue-600" />
                            <span>1. What are Cookies?</span>
                        </h2>
                        <p>
                            Cookies are small text files placed on your computer or mobile device when you browse websites. They are widely used to make websites work properly, provide a secure user session, remember user preferences, and support free content tiers.
                        </p>
                    </section>

                    <section className="bg-white p-6 rounded-2xl space-y-4 border border-slate-200">
                        <h2 className="text-slate-900 font-bold text-lg flex items-center gap-2">
                            <Sliders className="w-5 h-5 text-indigo-600" />
                            <span>2. Categories of Cookies We Use</span>
                        </h2>

                        <div className="space-y-4">
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                                <div className="flex items-center justify-between">
                                    <strong className="text-slate-900">A. Strictly Necessary (Essential) Cookies</strong>
                                    <span className="text-[11px] font-bold text-blue-600 uppercase bg-blue-100/60 px-2 py-0.5 rounded">Always Active</span>
                                </div>
                                <p className="text-slate-600 text-xs leading-relaxed">
                                    These cookies are indispensable for the operation of our service. They include HTTP-only authentication tokens (`access_token`) for keeping registered users logged in securely, CSRF defense tokens, and daily rate limit counters.
                                </p>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                                <div className="flex items-center justify-between">
                                    <strong className="text-slate-900">B. Preference &amp; Functional Cookies</strong>
                                    <span className="text-[11px] font-medium text-slate-500">Configurable</span>
                                </div>
                                <p className="text-slate-600 text-xs leading-relaxed">
                                    These cookies remember your preferences—such as your preferred OCR language, Page Segmentation Mode selection, and cookie consent choices (`scantext_cookie_consent`).
                                </p>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                                <div className="flex items-center justify-between">
                                    <strong className="text-slate-900">C. Advertising &amp; Sponsor Cookies (Free Tier Only)</strong>
                                    <span className="text-[11px] font-medium text-slate-500">Configurable</span>
                                </div>
                                <p className="text-slate-600 text-xs leading-relaxed">
                                    To provide our free OCR tier with zero registration barriers, we display non-intrusive sponsor units to anonymous and free-tier users. Third-party advertising partners may place cookies to prevent ad fatigue and measure performance. <strong>Pro tier subscribers never receive any advertising cookies.</strong>
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="bg-white p-6 rounded-2xl space-y-3 border border-slate-200">
                        <h2 className="text-slate-900 font-bold text-lg flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                            <span>3. How to Manage and Disable Cookies</span>
                        </h2>
                        <p>
                            You have the right to accept or decline non-essential cookies at any time:
                        </p>
                        <ul className="list-disc pl-6 space-y-1 text-slate-600 text-xs sm:text-sm">
                            <li><strong>Our Consent Banner:</strong> Use the cookie banner at the bottom of the screen to choose "Essential Only" or customize preferences.</li>
                            <li><strong>Browser Controls:</strong> Most web browsers allow you to block or delete cookies via browser settings (Settings &rarr; Privacy &amp; Security &rarr; Cookies). Note that disabling essential cookies will prevent authentication sessions.</li>
                        </ul>
                    </section>

                    <section className="bg-white p-6 rounded-2xl space-y-3 border border-slate-200 text-xs sm:text-sm">
                        <h2 className="text-slate-900 font-bold text-base">Questions &amp; Contact</h2>
                        <p className="text-slate-600">
                            If you have questions about our cookie usage, please contact our privacy compliance team via our <Link href="/contact" className="text-blue-600 underline">Contact Page</Link> or review our <Link href="/privacy" className="text-blue-600 underline">Privacy Policy</Link>.
                        </p>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
}
