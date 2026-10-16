import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { Sliders, ArrowRight, CheckCircle2, AlertTriangle, Layers, Eye, Cpu, BookOpen } from 'lucide-react';

export const metadata: Metadata = {
    title: 'How to Improve OCR Accuracy | Image Preprocessing & Engineering Guide',
    description: 'Master OCR optimization: DPI resolution, Otsu binarization, Hough deskewing, and Tesseract Page Segmentation Modes (PSM) for maximum character recognition accuracy.',
    alternates: {
        canonical: '/how-to-improve-ocr-accuracy',
    },
    openGraph: {
        title: 'How to Improve OCR Accuracy | Image Preprocessing & Engineering Guide',
        description: 'Comprehensive computer vision engineering guide for maximizing OCR character precision.',
    },
};

const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'How to Improve OCR Accuracy: Preprocessing & Computer Vision Techniques',
    description: 'An in-depth technical exploration of image resolution, binarization, deskewing, and page segmentation modes for Optical Character Recognition.',
    author: {
        '@type': 'Organization',
        name: 'ScanText OCR Engineering',
    },
};

export default function HowToImproveOcrAccuracyPage() {
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
                        <span className="text-slate-800">Engineering Guides</span>
                        <span>/</span>
                        <span className="text-blue-600">Improve OCR Accuracy</span>
                    </nav>

                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                        How to Improve OCR Accuracy: A Comprehensive Engineering Guide
                    </h1>

                    <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                        Optical Character Recognition performance depends far more on the quality and preprocessing of the input image than on the raw OCR engine itself. Learn how resolution, binarization, deskewing, and segmentation parameters dictate recognition precision.
                    </p>
                </div>

                {/* Interactive Tool Banner */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-6 sm:p-8 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h2 className="text-lg sm:text-xl font-bold">Test your document with our OCR engine</h2>
                        <p className="text-blue-100 text-xs sm:text-sm">
                            ScanText includes automated preprocessing filters, multi-language dictionaries, and customizable PSM modes.
                        </p>
                    </div>
                    <Link
                        href="/"
                        className="px-5 py-2.5 bg-white text-blue-600 hover:bg-blue-50 font-semibold rounded-xl text-xs sm:text-sm shadow-md transition-all shrink-0 flex items-center gap-2"
                    >
                        <span>Open OCR Tool</span>
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                {/* Section 1: Resolution & DPI */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-slate-900">1. Resolution &amp; DPI: The 300 DPI Sweet Spot</h2>
                    <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
                        Tesseract and other neural OCR engines are calibrated for standard printed typography where character heights measure approximately 20 to 35 pixels.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                            <span className="text-rose-600 font-bold text-xs uppercase tracking-wider">&lt; 150 DPI: Poor Quality</span>
                            <h3 className="font-bold text-slate-900">Insufficient Pixel Detail</h3>
                            <p className="text-slate-600 text-xs leading-relaxed">
                                Small text strokes merge together. Punctuation dots, commas, and character inner loops (like 'e', 'a', 'o') blur, causing frequent substitution errors.
                            </p>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-blue-200 bg-blue-50/20 space-y-2">
                            <span className="text-emerald-600 font-bold text-xs uppercase tracking-wider">300 DPI: Gold Standard</span>
                            <h3 className="font-bold text-slate-900">Optimal Accuracy &amp; Speed</h3>
                            <p className="text-slate-600 text-xs leading-relaxed">
                                Standard 10pt-12pt font produces clear 30-pixel height glyphs. Feature detectors easily isolate ascenders, descenders, and serifs with minimal compute overhead.
                            </p>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                            <span className="text-amber-600 font-bold text-xs uppercase tracking-wider">&gt; 450 DPI: Diminishing Returns</span>
                            <h3 className="font-bold text-slate-900">Memory Penalty</h3>
                            <p className="text-slate-600 text-xs leading-relaxed">
                                Exceeding 450 DPI increases CPU rasterization times and RAM footprint exponentially without increasing statistical recognition confidence.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Section 2: Binarization & Thresholding */}
                <section className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                        <Layers className="w-5 h-5 text-blue-600" />
                        <h2>2. Binarization: Separating Text from Document Background</h2>
                    </div>
                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                        Binarization converts continuous-tone images into strictly black (text) and white (background) pixels. The chosen algorithm makes a dramatic difference:
                    </p>

                    <div className="space-y-3 text-xs sm:text-sm">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <h4 className="font-bold text-slate-900 mb-1">Otsu's Global Thresholding</h4>
                            <p className="text-slate-600 leading-relaxed text-xs">
                                Calculates a single threshold that minimizes inter-class pixel variance across the entire image. <strong>Best for:</strong> Clean document scans with even illumination and uniform white backgrounds.
                            </p>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <h4 className="font-bold text-slate-900 mb-1">Adaptive Gaussian Thresholding</h4>
                            <p className="text-slate-600 leading-relaxed text-xs">
                                Computes a dynamic threshold for each local pixel neighborhood based on a Gaussian-weighted window. <strong>Best for:</strong> Smartphone photos of documents with shadows, paper folds, or uneven lighting.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Section 3: Skew Correction (Deskewing) */}
                <section className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                        <Sliders className="w-5 h-5 text-indigo-600" />
                        <h2>3. Deskewing: Correcting Document Tilt</h2>
                    </div>
                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                        When a document is photographed or fed through an auto-document feeder at an angle, the horizontal baseline of text lines slopes. If the skew exceeds <strong>2 to 3 degrees</strong>, layout analysis algorithms can segment letters from adjacent lines into the same word string.
                    </p>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm space-y-2">
                        <h4 className="font-bold text-slate-900">How Skew is Mathematically Corrected:</h4>
                        <ol className="list-decimal pl-5 space-y-1 text-slate-600 text-xs">
                            <li>Apply Canny edge detection or morphological dilation to highlight horizontal text baselines.</li>
                            <li>Execute a <strong>Hough Line Transform</strong> to identify predominant baseline angles across the document.</li>
                            <li>Calculate the median angle and rotate the image matrix using an affine transformation.</li>
                        </ol>
                    </div>
                </section>

                {/* Section 4: Page Segmentation Modes (PSM) */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-slate-900">4. Tesseract Page Segmentation Modes (PSM) Explained</h2>
                    <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
                        Tesseract uses Page Segmentation Modes to instruct the layout engine on how to interpret visual blocks. Selecting the wrong PSM is the #1 cause of empty or garbled OCR output:
                    </p>

                    <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200">
                        <table className="w-full text-xs text-left text-slate-600">
                            <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="p-3">PSM Mode</th>
                                    <th className="p-3">Name</th>
                                    <th className="p-3">Best Use Case</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <tr>
                                    <td className="p-3 font-mono font-bold text-blue-600">PSM 3</td>
                                    <td className="p-3 font-medium text-slate-900">Fully automatic page segmentation (Default)</td>
                                    <td className="p-3">Standard multi-paragraph documents, book pages, research articles.</td>
                                </tr>
                                <tr>
                                    <td className="p-3 font-mono font-bold text-blue-600">PSM 6</td>
                                    <td className="p-3 font-medium text-slate-900">Uniform block of text</td>
                                    <td className="p-3">Code snippets, receipts, tables, terminal logs, single columns.</td>
                                </tr>
                                <tr>
                                    <td className="p-3 font-mono font-bold text-blue-600">PSM 7</td>
                                    <td className="p-3 font-medium text-slate-900">Single text line</td>
                                    <td className="p-3">License plates, serial numbers, barcodes, headers, banner text.</td>
                                </tr>
                                <tr>
                                    <td className="p-3 font-mono font-bold text-blue-600">PSM 11</td>
                                    <td className="p-3 font-medium text-slate-900">Sparse text</td>
                                    <td className="p-3">Invoices with scattered field values, receipts, business cards.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Section 5: Technical Accuracy Disclaimer */}
                <section className="bg-amber-50/80 border border-amber-200 rounded-2xl p-6 space-y-3">
                    <div className="flex items-center gap-2 text-amber-900 font-bold">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                        <h2 className="text-lg">Engineering Reality: The Zero-Guarantee Principle</h2>
                    </div>
                    <p className="text-xs sm:text-sm text-amber-950 leading-relaxed">
                        No OCR system—proprietary or open-source—can legitimately claim or guarantee 100% character recognition accuracy. Factors such as camera lens distortion, font kerning overlap, ink bleed-through on two-sided documents, physical paper creases, and motion blur will always introduce statistical variance.
                    </p>
                    <p className="text-xs text-amber-900 font-medium">
                        Best engineering practice requires downstream validation: use spellcheck post-processors, regex pattern matchers for identifiers (emails, phone numbers, UUIDs), and human spot-checking for legal documents.
                    </p>
                </section>

                {/* Related Links */}
                <section className="space-y-3 pt-4 border-t border-slate-200">
                    <h3 className="font-bold text-slate-900 text-sm">Related Practical Guides:</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <Link href="/how-to-extract-text-from-image" className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl font-medium text-blue-600 hover:text-blue-700 flex items-center justify-between">
                            <span>Image to Text Guide</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                        <Link href="/jpg-to-text" className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl font-medium text-blue-600 hover:text-blue-700 flex items-center justify-between">
                            <span>JPG Compression Guide</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                        <Link href="/pdf-to-text" className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl font-medium text-blue-600 hover:text-blue-700 flex items-center justify-between">
                            <span>PDF OCR Guide</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
