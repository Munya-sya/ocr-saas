import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { FileText, ArrowRight, Server, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

export const metadata: Metadata = {
    title: 'PDF to Text Converter | Extract Text from Scanned & Digital PDFs Online',
    description: 'Convert PDF documents to editable text. Supports both scanned image PDFs via Tesseract OCR and native vector PDFs with fast multi-page batch queues.',
    alternates: {
        canonical: '/pdf-to-text',
    },
    openGraph: {
        title: 'PDF to Text Converter | Extract Text from Scanned & Digital PDFs Online',
        description: 'Multi-page PDF text extraction with dual vector stream and neural raster OCR fallback.',
    },
};

const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'ScanText PDF to Text Converter',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'All',
    description: 'Extract text from scanned and digital PDF documents with dual-engine processing and Celery worker queues.',
    offers: {
        '@type': 'Offer',
        price: '0.00',
        priceCurrency: 'USD',
    },
};

export default function PdfToTextPage() {
    return (
        <div className="min-h-screen flex flex-col justify-between bg-slate-50">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <Header />

            <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
                {/* Header & Breadcrumb */}
                <div className="space-y-3 border-b border-slate-200 pb-6">
                    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <Link href="/" className="hover:text-blue-600">Home</Link>
                        <span>/</span>
                        <span className="text-slate-800">Tools</span>
                        <span>/</span>
                        <span className="text-blue-600">PDF to Text</span>
                    </nav>

                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                        PDF to Text Converter: Scanned Raster OCR &amp; Digital Vector Extraction
                    </h1>

                    <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                        PDFs come in two distinct technical formats: digitally generated vector PDFs and scanned image bitmaps. Understand how our dual-pipeline handles both document types seamlessly.
                    </p>
                </div>

                {/* Conversion Workspace CTA */}
                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="space-y-2">
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-semibold text-xs rounded-full border border-indigo-200">
                            Multi-Page PDF Processing
                        </span>
                        <h2 className="text-xl font-bold text-slate-900">Upload your PDF document</h2>
                        <p className="text-xs sm:text-sm text-slate-600">
                            Extract text from single pages or multi-page documents up to 50 MB with asynchronous worker queues.
                        </p>
                    </div>

                    <Link
                        href="/"
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-md transition-all shrink-0 flex items-center gap-2"
                    >
                        <span>Convert PDF to Text</span>
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                {/* Section 1: The Two Types of PDFs */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-slate-900">1. Digital Vector PDFs vs. Scanned Raster PDFs</h2>
                    <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
                        Before processing a PDF, it is essential to distinguish between the two structural formats in which PDFs are created:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-semibold text-[11px] rounded">Type A</span>
                            <h3 className="font-bold text-slate-900 text-base">Digital Native Vector PDFs</h3>
                            <p className="text-slate-600 leading-relaxed text-xs">
                                Created directly by word processors (Microsoft Word, Google Docs, LaTeX, Adobe InDesign). These files contain an internal font glyph stream. Text can be copied directly without executing visual OCR, achieving instantaneous, 100% character precision.
                            </p>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-semibold text-[11px] rounded">Type B</span>
                            <h3 className="font-bold text-slate-900 text-base">Scanned Image (Raster) PDFs</h3>
                            <p className="text-slate-600 leading-relaxed text-xs">
                                Created by office flatbed scanners or smartphone scanning apps. The PDF is simply a container wrapping full-page bitmap images (JPEG or TIFF streams). It contains no underlying text characters and requires deep computer vision OCR to reconstruct words.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Section 2: Our Dual-Mode Architecture */}
                <section className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                        <Server className="w-5 h-5 text-blue-600" />
                        <h2>2. How ScanText Handles PDF Documents Under the Hood</h2>
                    </div>

                    <div className="space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                        <p>
                            To give you the fastest speed and highest quality, our backend executes an automated two-stage analysis on every uploaded PDF:
                        </p>
                        <ol className="list-decimal pl-5 space-y-2 text-slate-700">
                            <li>
                                <strong>Native Stream Inspection:</strong> The engine examines the PDF stream. If digital text layers are detected, it extracts characters directly in milliseconds.
                            </li>
                            <li>
                                <strong>Rasterization &amp; OCR Fallback:</strong> If no digital text layer exists (or if characters are embedded as drawn outlines), each PDF page is rasterized at <strong>300 DPI</strong> using <code className="text-blue-600">pdf2image</code> (Poppler) and dispatched page-by-page to the Tesseract 5 LSTM neural network.
                            </li>
                        </ol>
                    </div>
                </section>

                {/* Section 3: Asynchronous Celery Processing for Multi-Page Files */}
                <section className="bg-indigo-50/60 rounded-2xl p-6 border border-indigo-200 space-y-3">
                    <div className="flex items-center gap-2 text-indigo-900 font-bold">
                        <Clock className="w-5 h-5 text-indigo-600" />
                        <h2>3. Asynchronous Worker Architecture for Long Documents</h2>
                    </div>
                    <p className="text-xs sm:text-sm text-indigo-950 leading-relaxed">
                        Converting a 20-page or 50-page scanned PDF requires substantial CPU rasterization and neural processing that would exceed standard 30-second HTTP gateway timeouts.
                    </p>
                    <p className="text-xs sm:text-sm text-indigo-900 leading-relaxed">
                        ScanText uses an asynchronous queue powered by <strong>Celery &amp; Redis</strong>. Multi-page jobs receive a tracking UUID and execute in dedicated background worker processes. The frontend polls progress in real time (e.g. <em>"Processing Page 4 of 12"</em>) with zero browser freeze.
                    </p>
                </section>

                {/* Section 4: Document Plan Quotas */}
                <section className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3">
                    <h2 className="text-lg font-bold text-slate-900">PDF Tier Limits &amp; Specifications</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left text-slate-600">
                            <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="p-3">Feature</th>
                                    <th className="p-3">Anonymous &amp; Free Tier</th>
                                    <th className="p-3">Pro Tier ($19/mo)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <tr>
                                    <td className="p-3 font-medium text-slate-900">Max File Size</td>
                                    <td className="p-3">10 MB</td>
                                    <td className="p-3 text-blue-600 font-semibold">50 MB</td>
                                </tr>
                                <tr>
                                    <td className="p-3 font-medium text-slate-900">Max PDF Page Count</td>
                                    <td className="p-3">5 pages per file</td>
                                    <td className="p-3 text-blue-600 font-semibold">Up to 100 pages</td>
                                </tr>
                                <tr>
                                    <td className="p-3 font-medium text-slate-900">Daily Conversions</td>
                                    <td className="p-3">5 conversions / day</td>
                                    <td className="p-3 text-blue-600 font-semibold">Unlimited / 1,000 / day</td>
                                </tr>
                                <tr>
                                    <td className="p-3 font-medium text-slate-900">Worker Priority</td>
                                    <td className="p-3">Standard Queue</td>
                                    <td className="p-3 text-blue-600 font-semibold">Priority High-Speed Queue</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Related Links */}
                <section className="space-y-3 pt-4 border-t border-slate-200">
                    <h3 className="font-bold text-slate-900 text-sm">Related Guides:</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <Link href="/how-to-improve-ocr-accuracy" className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl font-medium text-blue-600 hover:text-blue-700 flex items-center justify-between">
                            <span>How to Improve OCR Accuracy: Preprocessing Guide</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                        <Link href="/pricing" className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl font-medium text-blue-600 hover:text-blue-700 flex items-center justify-between">
                            <span>ScanText Pro: 100-Page PDF Batch Processing</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
