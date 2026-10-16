import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { FileText, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, Cpu } from 'lucide-react';

export const metadata: Metadata = {
    title: 'JPG to Text Converter | Extract Text from JPEG Documents Online',
    description: 'Convert JPG & JPEG images to editable text using high-accuracy OCR. Learn how to clean lossy compression artifacts, optimize resolution, and extract text privately.',
    alternates: {
        canonical: '/jpg-to-text',
    },
    openGraph: {
        title: 'JPG to Text Converter | Extract Text from JPEG Documents Online',
        description: 'Convert JPG images to clean text with automated DCT artifact cleanup and Otsu thresholding.',
    },
};

const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'ScanText JPG to Text Converter',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'All',
    description: 'Extract text from JPG and JPEG images online using neural OCR with automated noise mitigation.',
    offers: {
        '@type': 'Offer',
        price: '0.00',
        priceCurrency: 'USD',
    },
};

export default function JpgToTextPage() {
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
                        <span className="text-blue-600">JPG to Text</span>
                    </nav>

                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                        JPG to Text Converter: Converting JPEG Document Images into Clean Text
                    </h1>

                    <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                        JPEG is the most common image format for smartphone document photos and scans. Understand how JPEG compression affects character recognition and how ScanText optimizes JPEG inputs for high-fidelity extraction.
                    </p>
                </div>

                {/* Conversion Workspace CTA */}
                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="space-y-2">
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-semibold text-xs rounded-full border border-blue-200">
                            Instant Free Conversion
                        </span>
                        <h2 className="text-xl font-bold text-slate-900">Upload your JPG/JPEG file now</h2>
                        <p className="text-xs sm:text-sm text-slate-600">
                            Fast, anonymous processing with zero data retention and automated cleanup.
                        </p>
                    </div>

                    <Link
                        href="/"
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-md transition-all shrink-0 flex items-center gap-2"
                    >
                        <span>Convert JPG to Text</span>
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                {/* Section 1: The JPEG Challenge in OCR */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-slate-900">The Technical Challenge: How JPEG Compression Impacts OCR</h2>
                    <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
                        Unlike lossless formats like PNG, the Joint Photographic Experts Group (JPEG) format uses lossy Discrete Cosine Transform (DCT) compression. While optimized for natural photography, JPEG introduces specific artifacts that complicate text recognition:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <Cpu className="w-4 h-4 text-blue-600" />
                                <span>High-Frequency "Ringing" Noise</span>
                            </h3>
                            <p className="text-slate-600 leading-relaxed text-xs">
                                High contrast boundaries—such as black text on white paper—generate mathematical ripples in 8x8 DCT pixel blocks. These ripples produce faint "halos" around characters that OCR thresholding filters can mistake for punctuation marks or accent characters.
                            </p>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <Cpu className="w-4 h-4 text-blue-600" />
                                <span>Chroma Subsampling Degradation</span>
                            </h3>
                            <p className="text-slate-600 leading-relaxed text-xs">
                                Color JPEG encoders frequently use 4:2:0 chroma subsampling, halving color resolution. For colored text or receipts printed on colored receipts, subsampling softens character edges, reducing edge detection confidence.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Section 2: How ScanText Cleans JPG Images */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-slate-900">How We Preprocess JPEG Files for Optimal Results</h2>
                    <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
                        When you upload a JPG file, our backend processing pipeline applies automated computer vision filters to counteract compression artifacts before feeding data to the Tesseract engine:
                    </p>

                    <div className="space-y-3">
                        <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                            <div className="text-xs sm:text-sm">
                                <strong className="text-slate-900">Luminance Grayscale Conversion:</strong> Color information is converted into a calibrated 8-bit single-channel luminance map, removing chromatic noise.
                            </div>
                        </div>

                        <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                            <div className="text-xs sm:text-sm">
                                <strong className="text-slate-900">Otsu's Adaptive Binarization:</strong> Calculates the optimal binarization threshold based on the image histogram variance, suppressing DCT ringing halos.
                            </div>
                        </div>

                        <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                            <div className="text-xs sm:text-sm">
                                <strong className="text-slate-900">Morphological Opening:</strong> Removes microscopic single-pixel pepper noise without eroding thin character strokes.
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 3: Best Practices for Capturing Document JPGs */}
                <section className="bg-slate-100/80 rounded-2xl p-6 border border-slate-200 space-y-3">
                    <h2 className="text-lg font-bold text-slate-900">Tips for Photographing Documents in JPG Format</h2>
                    <ul className="text-xs sm:text-sm text-slate-700 space-y-2 list-disc pl-5">
                        <li><strong>Lighting:</strong> Use diffuse daylight or dual-sided lighting to prevent cast shadows and camera flash hot spots.</li>
                        <li><strong>Camera Angle:</strong> Hold the camera strictly parallel to the page to minimize trapezoidal perspective distortion.</li>
                        <li><strong>Camera Distance:</strong> Fill the entire camera frame with the document to maximize character pixel density.</li>
                        <li><strong>Compression Quality:</strong> If your camera app offers JPEG quality settings, select 90% or higher.</li>
                    </ul>
                </section>

                {/* Accuracy Disclaimer */}
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <strong>Accuracy Notice:</strong> Heavily compressed JPEGs (e.g., images repeatedly forwarded over messaging apps with aggressive compression) may lose fine punctuation (commas, periods) or confuse similar glyphs (such as 'c' and 'e'). Always verify critical numbers and names against the original source.
                    </div>
                </div>

                {/* Related Links */}
                <section className="space-y-3 pt-4 border-t border-slate-200">
                    <h3 className="font-bold text-slate-900 text-sm">Related Guides &amp; Converters:</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <Link href="/png-to-text" className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl font-medium text-blue-600 hover:text-blue-700 flex items-center justify-between">
                            <span>PNG to Text: Lossless Extraction &amp; Alpha Transparency</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                        <Link href="/pdf-to-text" className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl font-medium text-blue-600 hover:text-blue-700 flex items-center justify-between">
                            <span>PDF to Text: Native Fonts vs. Scanned OCR</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
