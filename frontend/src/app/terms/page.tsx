import React from 'react';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { FileText, CheckCircle2, AlertCircle } from 'lucide-react';

export const metadata = {
    title: 'Terms of Service | ScanText OCR SaaS',
    description: 'Terms of Service for using ScanText anonymous OCR text extraction.',
};

export default function TermsPage() {
    return (
        <div className="min-h-screen flex flex-col justify-between bg-slate-50">
            <Header />

            <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
                <div className="space-y-3 border-b border-slate-200 pb-6">
                    <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Service Terms</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                        Terms of Service
                    </h1>
                    <p className="text-slate-600 text-sm">Last updated: September 2026</p>
                </div>

                <div className="prose prose-slate max-w-none space-y-6 text-slate-700 text-sm sm:text-base leading-relaxed">
                    <section className="glass-panel p-6 rounded-2xl space-y-3 border border-slate-200">
                        <div className="flex items-center space-x-3 text-slate-900 font-bold text-lg">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            <h2>1. Acceptance of Terms</h2>
                        </div>
                        <p>
                            By accessing or using the ScanText OCR web application, you agree to comply with and be bound by these Terms of Service. If you do not agree, please do not use the service.
                        </p>
                    </section>

                    <section className="glass-panel p-6 rounded-2xl space-y-3 border border-slate-200">
                        <div className="flex items-center space-x-3 text-slate-900 font-bold text-lg">
                            <AlertCircle className="w-5 h-5 text-amber-500" />
                            <h2>2. Acceptable Use Policy</h2>
                        </div>
                        <p>
                            You agree to use ScanText OCR only for lawful purposes. You must not upload files that contain malware, illegal content, or infringe upon third-party intellectual property rights.
                        </p>
                    </section>

                    <section className="glass-panel p-6 rounded-2xl space-y-3 border border-slate-200">
                        <h2 className="text-slate-900 font-bold text-lg">3. Disclaimer of Warranties</h2>
                        <p>
                            ScanText OCR is provided on an "AS IS" and "AS AVAILABLE" basis. While we utilize Tesseract 5 OCR engines, we make no guarantees regarding character recognition accuracy, service uptime, or fitness for specific legal or medical document processing.
                        </p>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
}
