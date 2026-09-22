import React from 'react';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { ShieldCheck, Lock, Trash2, Database } from 'lucide-react';

export const metadata = {
    title: 'Privacy Policy | ScanText OCR SaaS',
    description: 'Learn about our strict zero-retention privacy policy and automatic file destruction.',
};

export default function PrivacyPage() {
    return (
        <div className="min-h-screen flex flex-col justify-between bg-slate-50">
            <Header />

            <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
                <div className="space-y-3 border-b border-slate-200 pb-6">
                    <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Zero Data Retention</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                        Privacy Policy
                    </h1>
                    <p className="text-slate-600 text-sm">Last updated: September 2026</p>
                </div>

                <div className="prose prose-slate max-w-none space-y-6 text-slate-700 text-sm sm:text-base leading-relaxed">
                    <section className="glass-panel p-6 rounded-2xl space-y-3 border border-slate-200">
                        <div className="flex items-center space-x-3 text-slate-900 font-bold text-lg">
                            <Lock className="w-5 h-5 text-blue-600" />
                            <h2>1. Complete Anonymity & Zero Retention</h2>
                        </div>
                        <p>
                            ScanText OCR SaaS operates as a strictly anonymous, stateless document text extraction service. We do not require account registration, email addresses, credit cards, or personal identifiers to use our application.
                        </p>
                    </section>

                    <section className="glass-panel p-6 rounded-2xl space-y-3 border border-slate-200">
                        <div className="flex items-center space-x-3 text-slate-900 font-bold text-lg">
                            <Trash2 className="w-5 h-5 text-red-500" />
                            <h2>2. Immediate Temporary File Destruction</h2>
                        </div>
                        <p>
                            When you upload an image (JPG, JPEG, PNG, WEBP) or PDF file for text extraction:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Files are buffered under random UUID v4 filenames in temporary system memory (`/tmp/ocr_uploads/`).</li>
                            <li>Original file names and local disk paths are never logged or stored.</li>
                            <li><strong>Automatic Deletion:</strong> As soon as the OCR extraction completes, temporary files are permanently destroyed and erased from disk memory.</li>
                        </ul>
                    </section>

                    <section className="glass-panel p-6 rounded-2xl space-y-3 border border-slate-200">
                        <div className="flex items-center space-x-3 text-slate-900 font-bold text-lg">
                            <Database className="w-5 h-5 text-indigo-600" />
                            <h2>3. No Extracted Text Logging</h2>
                        </div>
                        <p>
                            Your document contents belong entirely to you. Our server logs track only anonymous system performance metrics (e.g. processing duration in milliseconds and job UUIDs). We <strong>never</strong> log, inspect, store, or train AI models on your raw extracted text.
                        </p>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
}
