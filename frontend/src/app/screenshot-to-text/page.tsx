import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { Monitor, ArrowRight, SunMoon, Sliders, CheckCircle2, AlertCircle } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Screenshot to Text Converter | Extract Text from Screen Captures',
    description: 'Convert screenshots, screen snippets, and video stills to editable text. Optimized for 72-96 DPI monitor fonts, subpixel anti-aliasing, and dark mode UI captures.',
    alternates: {
        canonical: '/screenshot-to-text',
    },
    openGraph: {
        title: 'Screenshot to Text Converter | Extract Text from Screen Captures',
        description: 'Extract text from desktop and mobile screenshots with automatic font scaling and dark mode inversion.',
    },
};

const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'ScanText Screenshot to Text Converter',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'All',
    description: 'Convert screenshots, UI snippets, and video stills into editable plain text with automated font scaling and color inversion.',
    offers: {
        '@type': 'Offer',
        price: '0.00',
        priceCurrency: 'USD',
    },
};

export default function ScreenshotToTextPage() {
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
                        <span className="text-blue-600">Screenshot to Text</span>
                    </nav>

                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                        Screenshot to Text Converter: Overcoming Low-DPI &amp; Screen Font Obstacles
                    </h1>

                    <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                        Screenshots are the fastest way to capture error messages, video frames, coding snippets, and web chats. Learn why screen captures challenge traditional OCR and how our image pipeline optimizes them for accurate extraction.
                    </p>
                </div>

                {/* Conversion Workspace CTA */}
                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="space-y-2">
                        <span className="px-2.5 py-1 bg-violet-50 text-violet-700 font-semibold text-xs rounded-full border border-violet-200">
                            Screen Capture Optimizer
                        </span>
                        <h2 className="text-xl font-bold text-slate-900">Upload your screenshot</h2>
                        <p className="text-xs sm:text-sm text-slate-600">
                            Paste or upload PNG/JPG snippets from Windows Snipping Tool, macOS Screenshot, or iOS/Android captures.
                        </p>
                    </div>

                    <Link
                        href="/"
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-md transition-all shrink-0 flex items-center gap-2"
                    >
                        <span>Extract Screenshot Text</span>
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                {/* Section 1: The Technical Challenge of Screenshots */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-slate-900">Why Screenshots are Uniquely Challenging for OCR</h2>
                    <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
                        Traditional OCR engines were originally designed for 300 DPI flatbed document scanners. Screenshots from computer monitors present very different characteristics:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                            <span className="font-bold text-blue-600 text-sm">Low Resolution (72-96 DPI)</span>
                            <h3 className="font-bold text-slate-900">Pixelated Character Strokes</h3>
                            <p className="text-slate-600 leading-relaxed text-xs">
                                Standard 1080p monitors render at 72 to 96 dots-per-inch. A lowercase 'e' or 'a' in 11px font may be represented by only 7 to 9 pixels total height, providing very little statistical feature data for neural classification.
                            </p>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                            <span className="font-bold text-blue-600 text-sm">Subpixel Anti-Aliasing</span>
                            <h3 className="font-bold text-slate-900">ClearType Color Fringe</h3>
                            <p className="text-slate-600 leading-relaxed text-xs">
                                Windows ClearType and macOS font smoothing activate individual red, green, and blue subpixels to smooth diagonal letter curves. When converted to grayscale without calibration, these fringes create fuzzy edges.
                            </p>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                            <span className="font-bold text-blue-600 text-sm">Dark Mode UIs</span>
                            <h3 className="font-bold text-slate-900">Inverted Polarity</h3>
                            <p className="text-slate-600 leading-relaxed text-xs">
                                OCR engines are trained almost exclusively on dark glyphs on bright paper. Processing light gray text on a dark background directly produces severe recognition degradation unless polarity is inverted.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Section 2: How ScanText Optimizes Screenshots */}
                <section className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                        <Sliders className="w-5 h-5 text-blue-600" />
                        <h2>How We Optimize Screen Captures for High Recognition Accuracy</h2>
                    </div>

                    <div className="space-y-3">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                            <div className="text-xs sm:text-sm">
                                <strong className="text-slate-900">Automated Polarity Inversion (Dark Mode Detection):</strong> If the mean pixel brightness of the image is below 128 (indicating a dark theme), our OpenCV preprocessor automatically inverts the matrix to black text on white paper.
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                            <div className="text-xs sm:text-sm">
                                <strong className="text-slate-900">Bicubic 2x-3x Upscaling:</strong> Low-DPI snippets are upsampled using cubic interpolation to expand character stroke thickness to at least 20-30 pixels height before feature extraction.
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                            <div className="text-xs sm:text-sm">
                                <strong className="text-slate-900">Page Segmentation Mode (PSM 6):</strong> For terminal logs, code snippets, or dialogue windows, PSM 6 (Uniform Block of Text) prevents the engine from hallucinating column breaks.
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 3: Best Practices for Capturing Screenshots */}
                <section className="bg-slate-100/80 rounded-2xl p-6 border border-slate-200 space-y-3">
                    <h2 className="text-lg font-bold text-slate-900">Practical Tips for Better Screenshot OCR</h2>
                    <ul className="text-xs sm:text-sm text-slate-700 space-y-2 list-disc pl-5">
                        <li><strong>Zoom In Before Capturing:</strong> If capturing text from a browser or PDF viewer, press <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-[11px]">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-[11px]">+</kbd> to enlarge the font before taking the snippet.</li>
                        <li><strong>Crop Tight Around Text:</strong> Exclude busy UI elements, icons, navigation bars, and background wallpapers that can confuse paragraph layout detection.</li>
                        <li><strong>Save as Lossless PNG:</strong> Use PNG instead of JPG for screenshots to preserve sharp letter edges without JPEG blur.</li>
                    </ul>
                </section>

                {/* Accuracy Disclaimer */}
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <strong>Accuracy Expectation:</strong> Screenshots containing very tiny fonts (under 9px) or stylized coding ligatures may occasionally confuse similar characters (e.g., distinguishing <code className="text-slate-900">1</code>, <code className="text-slate-900">l</code>, and <code className="text-slate-900">I</code>, or <code className="text-slate-900">0</code> and <code className="text-slate-900">O</code>). Always double-check API keys, tokens, and numeric data.
                    </div>
                </div>

                {/* Related Links */}
                <section className="space-y-3 pt-4 border-t border-slate-200">
                    <h3 className="font-bold text-slate-900 text-sm">Related Guides:</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <Link href="/how-to-improve-ocr-accuracy" className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl font-medium text-blue-600 hover:text-blue-700 flex items-center justify-between">
                            <span>How to Improve OCR Accuracy: Full Technical Guide</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                        <Link href="/png-to-text" className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl font-medium text-blue-600 hover:text-blue-700 flex items-center justify-between">
                            <span>PNG to Text: Lossless Extraction &amp; Alpha Transparency</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
