import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { FileText, ArrowRight, Layers, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
    title: 'PNG to Text Converter | Lossless OCR for Screenshots & Graphic Text',
    description: 'Extract text from PNG files with lossless precision. Learn how our OCR pipeline handles transparent alpha channels, graphic typography, and high-DPI scans.',
    alternates: {
        canonical: '/png-to-text',
    },
    openGraph: {
        title: 'PNG to Text Converter | Lossless OCR for Screenshots & Graphic Text',
        description: 'Lossless text extraction from PNG images. Alpha transparency flattening and neural character recognition.',
    },
};

const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'ScanText PNG to Text Converter',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'All',
    description: 'Extract clean, editable text from PNG images with lossless alpha compositing and neural OCR.',
    offers: {
        '@type': 'Offer',
        price: '0.00',
        priceCurrency: 'USD',
    },
};

export default function PngToTextPage() {
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
                        <span className="text-blue-600">PNG to Text</span>
                    </nav>

                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                        PNG to Text Converter: Lossless OCR for High-Precision Document Extraction
                    </h1>

                    <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                        Portable Network Graphics (PNG) is the gold standard for digital text, UI screenshots, and scanned line art. Discover how lossless encoding improves character recognition and how alpha channel transparency is properly handled.
                    </p>
                </div>

                {/* Conversion Workspace CTA */}
                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="space-y-2">
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold text-xs rounded-full border border-emerald-200">
                            Lossless Precision OCR
                        </span>
                        <h2 className="text-xl font-bold text-slate-900">Upload your PNG image</h2>
                        <p className="text-xs sm:text-sm text-slate-600">
                            Extract text with zero compression artifacts, anonymous processing, and instantaneous file destruction.
                        </p>
                    </div>

                    <Link
                        href="/"
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-md transition-all shrink-0 flex items-center gap-2"
                    >
                        <span>Convert PNG to Text</span>
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                {/* Section 1: Why PNG Excels at OCR */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-slate-900">Why PNG is the Preferred Image Format for OCR</h2>
                    <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
                        PNG uses the DEFLATE lossless compression algorithm (combining LZ77 and Huffman coding). Because pixel values remain bit-for-bit identical to the source render, PNG provides significant advantages over lossy formats:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                            <h3 className="font-bold text-slate-900">Razor-Sharp Glyph Boundaries</h3>
                            <p className="text-slate-600 leading-relaxed text-xs">
                                Character strokes maintain exact contrast boundaries without the blurry pixel dispersion or DCT block artifacts found in JPEG files. This enables clean binarization even with small 8pt-10pt typography.
                            </p>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                            <h3 className="font-bold text-slate-900">Perfect Line Art &amp; Schematic Fidelity</h3>
                            <p className="text-slate-600 leading-relaxed text-xs">
                                Architectural diagrams, CAD blueprints, receipts, and invoices rendered in PNG preserve crisp geometric borders and solid fills, making tabular column segmentation much more reliable.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Section 2: Alpha Channel Transparency Problem */}
                <section className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                        <Layers className="w-5 h-5 text-indigo-600" />
                        <h2>The Alpha Channel Challenge: Handling Transparent Backgrounds</h2>
                    </div>
                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                        Many digital PNGs—especially logos, app screenshots, and vector exports—contain a 4th color channel: the <strong>Alpha (transparency) channel</strong>. If an OCR engine discards the alpha channel without proper compositing, transparent pixels can default to solid black, rendering black text completely invisible (black text on a black background).
                    </p>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm space-y-2">
                        <h4 className="font-bold text-slate-900">Our Automated Alpha Compositing Solution:</h4>
                        <p className="text-slate-600 text-xs leading-relaxed">
                            Our backend pipeline checks for RGBA 4-channel image formats. If transparency is detected, the image is composited against a calibrated solid white background layer before grayscale conversion:
                        </p>
                        <code className="block p-2.5 bg-slate-950 text-emerald-400 rounded-lg font-mono text-[11px] overflow-x-auto">
                            # OpenCV alpha flattening: compositing RGBA against solid white background
                            <br />
                            alpha = image[:, :, 3] / 255.0
                            <br />
                            color = image[:, :, :3]
                            <br />
                            flattened = (color * alpha + 255 * (1.0 - alpha)).astype(np.uint8)
                        </code>
                    </div>
                </section>

                {/* Section 3: Realistic Limitations */}
                <section className="p-5 bg-amber-50 rounded-2xl border border-amber-200 space-y-2 text-xs sm:text-sm text-amber-950">
                    <div className="flex items-center gap-2 font-bold text-amber-900">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <h3>Important Technical Realities</h3>
                    </div>
                    <p className="text-xs text-amber-900 leading-relaxed">
                        Although PNG eliminates lossy compression noise, recognition accuracy is still limited by the physical resolution of the source. For example, a 72 DPI screen capture will have pixelated character curves compared to a 300 DPI document scan. Low-contrast typography (light grey text on a white background) may require manual threshold tuning.
                    </p>
                </section>

                {/* Related Links */}
                <section className="space-y-3 pt-4 border-t border-slate-200">
                    <h3 className="font-bold text-slate-900 text-sm">Related Tools:</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <Link href="/screenshot-to-text" className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl font-medium text-blue-600 hover:text-blue-700 flex items-center justify-between">
                            <span>Screenshot to Text: Low-DPI Screen Font Optimization</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                        <Link href="/pdf-to-text" className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl font-medium text-blue-600 hover:text-blue-700 flex items-center justify-between">
                            <span>PDF to Text: Multi-Page Extraction &amp; Celery Queues</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
