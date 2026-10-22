import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { ShieldCheck, Cpu, Code2, HeartHandshake, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
    title: 'About ScanText OCR | Ethical, Zero-Retention Document Extraction',
    description: 'Learn about the mission, architecture, and privacy-first engineering behind ScanText OCR SaaS. Free and Pro document text extraction built on open-source foundations.',
    alternates: {
        canonical: '/about',
    },
};

export default function AboutPage() {
    return (
        <div className="min-h-screen flex flex-col justify-between bg-slate-50">
            <Header />

            <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
                {/* Header */}
                <div className="space-y-3 border-b border-slate-200 pb-6">
                    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <Link href="/" className="hover:text-blue-600">Home</Link>
                        <span>/</span>
                        <span className="text-blue-600">About</span>
                    </nav>

                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                        About ScanText OCR: Privacy-First Document Intelligence
                    </h1>

                    <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                        We built ScanText OCR because document extraction shouldn't require compromising your confidentiality or surrendering your private data to corporate AI training sets.
                    </p>
                </div>

                {/* Mission Card */}
                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-blue-600 font-bold text-lg">
                        <HeartHandshake className="w-5 h-5 text-blue-600" />
                        <h2>Our Core Mission</h2>
                    </div>
                    <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
                        Every day, millions of students, researchers, developers, and businesses need to extract text from invoices, receipts, screenshots, and scanned contracts. Unfortunately, the majority of "free OCR" tools harvest user documents, log sensitive character streams, or resell data to third-party ad brokers.
                    </p>
                    <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
                        <strong>ScanText OCR was engineered on an uncompromising principle: Strict Zero-Retention.</strong> When an image is processed, it is assigned a random UUID string in temporary memory, converted to text in seconds, and deleted immediately from disk. We never store, inspect, or sell your documents.
                    </p>
                </div>

                {/* Pillars Grid */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-slate-900">Engineering Principles</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                            <ShieldCheck className="w-6 h-6 text-emerald-500" />
                            <h3 className="font-bold text-slate-900">Zero Data Retention</h3>
                            <p className="text-slate-600 text-xs leading-relaxed">
                                Uploaded documents are buffered in `/tmp/ocr_uploads/` under UUID v4 hashes and erased immediately after processing via automatic Python background handlers.
                            </p>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                            <Cpu className="w-6 h-6 text-blue-500" />
                            <h3 className="font-bold text-slate-900">Open-Source Engines</h3>
                            <p className="text-slate-600 text-xs leading-relaxed">
                                Powered by Tesseract 5.x and OpenCV, with trained neural LSTM models supporting English, German, French, and Spanish languages.
                            </p>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                            <Code2 className="w-6 h-6 text-indigo-500" />
                            <h3 className="font-bold text-slate-900">Modern Architecture</h3>
                            <p className="text-slate-600 text-xs leading-relaxed">
                                Built with Next.js 14, FastAPI asynchronous microservices, PostgreSQL, and Celery/Redis queues for high-concurrency document processing.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Free vs Pro Comparison Callout */}
                <section className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 space-y-4">
                    <div className="space-y-1">
                        <span className="px-2.5 py-0.5 bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-full text-xs font-semibold">
                            Sustainable Business Model
                        </span>
                        <h2 className="text-xl font-bold">How We Support Free Document OCR</h2>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        Rather than monetizing your private document data, ScanText is supported by clean, unobtrusive sponsor placements for free users and an affordable <strong>ScanText Pro ($5/mo)</strong> tier for power users who need 100-page batch processing, priority worker queues, and an ad-free interface.
                    </p>
                    <div className="pt-2">
                        <Link
                            href="/pricing"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md transition-all"
                        >
                            <span>Explore Pro Features</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
