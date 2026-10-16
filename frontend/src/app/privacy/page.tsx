import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { ShieldCheck, Lock, Trash2, Database, EyeOff, Globe } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Privacy Policy | ScanText OCR SaaS',
    description: 'Learn about our strict zero-retention privacy policy, automatic file destruction, GDPR/CCPA compliance, and advertising disclosures.',
    alternates: {
        canonical: '/privacy',
    },
};

export default function PrivacyPage() {
    return (
        <div className="min-h-screen flex flex-col justify-between bg-slate-50">
            <Header />

            <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
                {/* Header */}
                <div className="space-y-3 border-b border-slate-200 pb-6">
                    <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Zero Data Retention Architecture</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                        Privacy Policy
                    </h1>
                    <p className="text-slate-600 text-sm">Last updated: October 2026</p>
                </div>

                <div className="prose prose-slate max-w-none space-y-6 text-slate-700 text-sm sm:text-base leading-relaxed">
                    <section className="bg-white p-6 rounded-2xl space-y-3 border border-slate-200">
                        <div className="flex items-center space-x-3 text-slate-900 font-bold text-lg">
                            <Lock className="w-5 h-5 text-blue-600" />
                            <h2>1. Core Commitment: Anonymity &amp; Zero Retention</h2>
                        </div>
                        <p>
                            ScanText OCR was designed from the ground up to respect document confidentiality. You can extract text from images and PDF files completely anonymously without creating an account or providing any personal identification.
                        </p>
                    </section>

                    <section className="bg-white p-6 rounded-2xl space-y-3 border border-slate-200">
                        <div className="flex items-center space-x-3 text-slate-900 font-bold text-lg">
                            <Trash2 className="w-5 h-5 text-rose-500" />
                            <h2>2. Automated Temporary File Lifecycle &amp; Erasure</h2>
                        </div>
                        <p>
                            When you upload an image (JPG, JPEG, PNG, WEBP) or PDF file for text extraction:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-xs sm:text-sm text-slate-600">
                            <li>Files are assigned random UUID v4 filenames in temporary system memory (<code className="text-slate-800">/tmp/ocr_uploads/</code>).</li>
                            <li>Original filenames and local disk paths are never stored or logged in server access logs.</li>
                            <li><strong>Immediate Destruction:</strong> As soon as the OCR character extraction completes, temporary files are permanently destroyed and unlinked from memory using Python context managers.</li>
                            <li><strong>Automated Celery Beat Sweep:</strong> An automated background task runs every 15 minutes to guarantee that any orphaned temporary files older than 24 hours are expunged.</li>
                        </ul>
                    </section>

                    <section className="bg-white p-6 rounded-2xl space-y-3 border border-slate-200">
                        <div className="flex items-center space-x-3 text-slate-900 font-bold text-lg">
                            <EyeOff className="w-5 h-5 text-indigo-600" />
                            <h2>3. No Extracted Text Storage or AI Training</h2>
                        </div>
                        <p>
                            Your document contents belong entirely to you. We <strong>never</strong> log, inspect, store, or train machine learning models on your raw extracted text. Server logs record only anonymous diagnostic performance metrics (e.g., execution duration in milliseconds and HTTP status codes).
                        </p>
                    </section>

                    <section className="bg-white p-6 rounded-2xl space-y-3 border border-slate-200">
                        <div className="flex items-center space-x-3 text-slate-900 font-bold text-lg">
                            <Database className="w-5 h-5 text-amber-500" />
                            <h2>4. Account Information &amp; Third-Party Processors</h2>
                        </div>
                        <p>
                            If you voluntarily register an account or subscribe to ScanText Pro:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-xs sm:text-sm text-slate-600">
                            <li><strong>Account Data:</strong> We store your email address and a cryptographically salted password hash (Argon2 / bcrypt). We never store plaintext passwords.</li>
                            <li><strong>Payment Processing:</strong> All subscription billing is processed directly by <strong>Stripe, Inc.</strong> We never receive or store your credit card numbers or banking credentials.</li>
                            <li><strong>Single Sign-On:</strong> If you log in via Google OAuth 2.0, we receive your email and profile ID to authenticate your session.</li>
                        </ul>
                    </section>

                    <section className="bg-white p-6 rounded-2xl space-y-3 border border-slate-200">
                        <div className="flex items-center space-x-3 text-slate-900 font-bold text-lg">
                            <Globe className="w-5 h-5 text-emerald-600" />
                            <h2>5. Advertising &amp; Sponsor Disclosures (Free Tier)</h2>
                        </div>
                        <p>
                            To maintain a free tier without requiring subscriptions, we display sponsor notices and non-intrusive advertisements to anonymous and free-tier users. Third-party advertising networks may utilize cookies in accordance with our <Link href="/cookies" className="text-blue-600 underline">Cookie Policy</Link>. <strong>Pro tier accounts are 100% ad-free and never receive ad scripts or ad cookies.</strong>
                        </p>
                    </section>

                    <section className="bg-white p-6 rounded-2xl space-y-3 border border-slate-200">
                        <h2 className="text-slate-900 font-bold text-lg">6. Your Rights Under GDPR &amp; CCPA/CPRA</h2>
                        <p className="text-xs sm:text-sm text-slate-600">
                            Under the General Data Protection Regulation (GDPR) and California Consumer Privacy Act (CCPA), you have the right to request access to, rectification of, or permanent erasure of your personal account data. To exercise these rights, contact us at <Link href="/contact" className="text-blue-600 underline">our contact page</Link>.
                        </p>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
}
