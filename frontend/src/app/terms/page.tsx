import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { FileText, CheckCircle2, AlertCircle, CreditCard, Scale, ShieldAlert } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Terms of Service | ScanText OCR SaaS',
    description: 'Terms of Service, acceptable use policy, subscription policies, and accuracy disclaimers for ScanText OCR.',
    alternates: {
        canonical: '/terms',
    },
};

export default function TermsPage() {
    return (
        <div className="min-h-screen flex flex-col justify-between bg-slate-50">
            <Header />

            <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
                {/* Header */}
                <div className="space-y-3 border-b border-slate-200 pb-6">
                    <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Terms of Service</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                        Terms of Service
                    </h1>
                    <p className="text-slate-600 text-sm">Last updated: October 2026</p>
                </div>

                <div className="prose prose-slate max-w-none space-y-6 text-slate-700 text-sm sm:text-base leading-relaxed">
                    <section className="bg-white p-6 rounded-2xl space-y-3 border border-slate-200">
                        <div className="flex items-center space-x-3 text-slate-900 font-bold text-lg">
                            <CheckCircle2 className="w-5 h-5 text-blue-600" />
                            <h2>1. Acceptance of Terms</h2>
                        </div>
                        <p>
                            By accessing or using ScanText OCR ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to all provisions, you may not access or use the application.
                        </p>
                    </section>

                    <section className="bg-white p-6 rounded-2xl space-y-3 border border-slate-200">
                        <div className="flex items-center space-x-3 text-slate-900 font-bold text-lg">
                            <ShieldAlert className="w-5 h-5 text-amber-500" />
                            <h2>2. Acceptable Use Policy</h2>
                        </div>
                        <p>
                            You agree to use ScanText OCR only for lawful document processing purposes. You agree NOT to:
                        </p>
                        <ul className="list-disc pl-6 space-y-1 text-xs sm:text-sm text-slate-600">
                            <li>Upload files containing computer viruses, malware, trojans, or malicious payloads disguised as image files.</li>
                            <li>Attempt to bypass or tamper with daily conversion quotas or rate limiting systems.</li>
                            <li>Use automated scrapers or bots to create disproportionate loads on server infrastructure.</li>
                            <li>Process material that infringes upon third-party copyrights, trademarks, or trade secrets.</li>
                        </ul>
                    </section>

                    <section className="bg-white p-6 rounded-2xl space-y-3 border border-slate-200">
                        <div className="flex items-center space-x-3 text-slate-900 font-bold text-lg">
                            <CreditCard className="w-5 h-5 text-indigo-600" />
                            <h2>3. Subscriptions, Billing &amp; Cancellations</h2>
                        </div>
                        <p>
                            <strong>ScanText Pro</strong> is billed on a monthly recurring subscription basis ($5.00/month).
                        </p>
                        <ul className="list-disc pl-6 space-y-1 text-xs sm:text-sm text-slate-600">
                            <li><strong>Billing Cycle:</strong> Subscriptions renew automatically each month on the calendar day corresponding to the commencement date.</li>
                            <li><strong>Self-Service Cancellation:</strong> You may cancel your subscription at any time via the self-service Stripe Customer Portal accessible directly from your <Link href="/dashboard" className="text-blue-600 underline">Dashboard</Link>. Upon cancellation, Pro benefits remain active until the conclusion of the current billing cycle.</li>
                            <li><strong>Refunds:</strong> Payments are non-refundable except where required by mandatory consumer protection law in your jurisdiction.</li>
                        </ul>
                    </section>

                    <section className="bg-amber-50/80 p-6 rounded-2xl space-y-3 border border-amber-200 text-amber-950">
                        <div className="flex items-center space-x-3 text-amber-900 font-bold text-lg">
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                            <h2>4. Critical Disclaimer of Character Recognition Accuracy</h2>
                        </div>
                        <p className="text-xs sm:text-sm leading-relaxed">
                            Optical Character Recognition (OCR) is a statistical, machine-learning-based classification technology. <strong>ScanText OCR makes NO guarantees, warranties, or representations regarding 100% character accuracy, completeness, or reliability of extracted text.</strong>
                        </p>
                        <p className="text-xs sm:text-sm leading-relaxed">
                            Output text must never be relied upon without human verification in high-risk contexts—including but not limited to medical prescriptions, legal filings, financial accounting records, or engineering calculations.
                        </p>
                    </section>

                    <section className="bg-white p-6 rounded-2xl space-y-3 border border-slate-200">
                        <div className="flex items-center space-x-3 text-slate-900 font-bold text-lg">
                            <Scale className="w-5 h-5 text-slate-700" />
                            <h2>5. Limitation of Liability</h2>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-600">
                            To the maximum extent permitted by applicable law, ScanText OCR and its developers shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from loss of data, document corruption, or reliance on OCR outputs.
                        </p>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
}
