import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { FileText, ArrowRight, ShieldCheck, Zap, Sliders, CheckCircle, AlertTriangle, HelpCircle } from 'lucide-react';

export const metadata: Metadata = {
    title: 'How to Extract Text from an Image (Complete OCR Step-by-Step Guide)',
    description: 'Learn how to accurately extract text from digital images using Optical Character Recognition (OCR). Discover preprocessing techniques, DPI guidelines, and troubleshooting tips.',
    alternates: {
        canonical: '/how-to-extract-text-from-image',
    },
    openGraph: {
        title: 'How to Extract Text from an Image (Complete OCR Step-by-Step Guide)',
        description: 'Comprehensive guide to Optical Character Recognition (OCR) for images: workflows, binarization, PSM modes, and common accuracy pitfalls.',
    },
};

const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Extract Text from an Image Using Optical Character Recognition (OCR)',
    description: 'A step-by-step technical guide for converting printed or digital document images into editable text using OCR.',
    step: [
        {
            '@type': 'HowToStep',
            name: 'Prepare and inspect the document image',
            text: 'Ensure the image has sufficient resolution (at least 150 to 300 DPI) and good contrast between text glyphs and background.',
        },
        {
            '@type': 'HowToStep',
            name: 'Upload the image to an OCR engine',
            text: 'Upload your JPG, PNG, or WEBP file into the ScanText OCR workspace.',
        },
        {
            '@type': 'HowToStep',
            name: 'Configure OCR parameters and language',
            text: 'Select the primary document language (English, German, French, Spanish) and the appropriate Page Segmentation Mode (PSM).',
        },
        {
            '@type': 'HowToStep',
            name: 'Execute extraction and review output',
            text: 'Process the image, copy the extracted plain text, and review character accuracy against the source image.',
        },
    ],
};

export default function HowToExtractTextPage() {
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
                        <span className="text-slate-800">Guides</span>
                        <span>/</span>
                        <span className="text-blue-600">How to Extract Text from Image</span>
                    </nav>

                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                        How to Extract Text from an Image: Complete OCR Workflow &amp; Technical Guide
                    </h1>

                    <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                        Optical Character Recognition (OCR) transforms raster pixel matrices into searchable, editable Unicode characters. Learn how the process works, how to choose optimal settings, and why real-world accuracy varies.
                    </p>
                </div>

                {/* Quick CTA Card */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-6 sm:p-8 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h2 className="text-lg sm:text-xl font-bold">Ready to extract text right now?</h2>
                        <p className="text-blue-100 text-xs sm:text-sm">
                            Upload your JPG, PNG, or WEBP image to our anonymous, zero-retention OCR workspace.
                        </p>
                    </div>
                    <Link
                        href="/"
                        className="px-5 py-2.5 bg-white text-blue-600 hover:bg-blue-50 font-semibold rounded-xl text-xs sm:text-sm shadow-md transition-all shrink-0 flex items-center gap-2"
                    >
                        <span>Open Free OCR Tool</span>
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                {/* Section 1: The OCR Pipeline Explained */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-slate-900">1. Understanding the Optical Character Recognition Pipeline</h2>
                    <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
                        Modern OCR engines (such as Tesseract 5 with Long Short-Term Memory neural networks) do not simply "read" an image. They pass the raw file through a multi-stage computer vision pipeline:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                            <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 font-bold flex items-center justify-center">1</span>
                            <h3 className="font-bold text-slate-900">Binarization &amp; Thresholding</h3>
                            <p className="text-slate-600 leading-relaxed text-xs">
                                Color and grayscale images are converted into high-contrast black-and-white pixels using algorithms like Otsu's thresholding to separate text glyphs from background noise.
                            </p>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                            <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 font-bold flex items-center justify-center">2</span>
                            <h3 className="font-bold text-slate-900">Page Layout Analysis</h3>
                            <p className="text-slate-600 leading-relaxed text-xs">
                                The engine identifies paragraphs, text lines, word boundaries, and character baseline alignment to prevent sentences across columns from bleeding together.
                            </p>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                            <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 font-bold flex items-center justify-center">3</span>
                            <h3 className="font-bold text-slate-900">Neural Glyph Classification</h3>
                            <p className="text-slate-600 leading-relaxed text-xs">
                                Trained LSTM recurrent neural networks analyze character features (loops, ascenders, descenders) alongside language dictionaries to determine the most probable characters.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Section 2: Step-by-Step Instructions */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-slate-900">2. Step-by-Step: Extracting Text with ScanText OCR</h2>

                    <div className="space-y-4">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-start gap-4">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 font-bold rounded-lg text-sm shrink-0">Step 1</span>
                            <div className="space-y-1">
                                <h3 className="font-bold text-slate-900 text-base">Select or Drop Your Image</h3>
                                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                                    Drag and drop your image file into the dropzone on the homepage, or click to browse. ScanText supports JPG, JPEG, PNG, WEBP, and PDF documents up to 10 MB on the Free tier.
                                </p>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-start gap-4">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 font-bold rounded-lg text-sm shrink-0">Step 2</span>
                            <div className="space-y-1">
                                <h3 className="font-bold text-slate-900 text-base">Select the Source Language</h3>
                                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                                    Choose the language of your document (English, German, French, or Spanish). Selecting the correct language ensures the LSTM engine utilizes the proper grammatical dictionary and character set.
                                </p>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-start gap-4">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 font-bold rounded-lg text-sm shrink-0">Step 3</span>
                            <div className="space-y-1">
                                <h3 className="font-bold text-slate-900 text-base">Choose Page Segmentation Mode (PSM)</h3>
                                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                                    By default, <strong>PSM 3 (Fully Automatic Page Segmentation)</strong> works best for regular multi-line documents. For isolated single lines or table cells, switch to PSM 6 (Uniform Block of Text) or PSM 7 (Single Text Line).
                                </p>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-start gap-4">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 font-bold rounded-lg text-sm shrink-0">Step 4</span>
                            <div className="space-y-1">
                                <h3 className="font-bold text-slate-900 text-base">Extract, Copy, or Download Text</h3>
                                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                                    Click <strong>Extract Text</strong>. Within a few seconds, the extracted text will render in an editable workspace where you can review character counts, copy text with one click, or export to a <code className="text-blue-600">.txt</code> file.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 3: Technical Limitations & Realistic Expectations */}
                <section className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6 space-y-3">
                    <div className="flex items-center gap-2 text-amber-900 font-bold">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                        <h2 className="text-lg">Technical Realities: Why No OCR Tool Can Guarantee 100% Accuracy</h2>
                    </div>
                    <p className="text-xs sm:text-sm text-amber-950 leading-relaxed">
                        While Tesseract 5 achieves over 98% accuracy on clean, 300 DPI printed black-on-white text, recognition accuracy drops when encountering real-world distortions. OCR quality depends on:
                    </p>
                    <ul className="text-xs sm:text-sm text-amber-900 list-disc pl-5 space-y-1">
                        <li><strong>Resolution (DPI):</strong> Images below 150 DPI lack sufficient pixel data to distinguish character serifs (e.g., mistaking 'e' for 'c' or 'rn' for 'm').</li>
                        <li><strong>Geometric Skew:</strong> Angled or curved document pages require pre-deskewing; severe tilt causes line segmentation failure.</li>
                        <li><strong>Uneven Illumination:</strong> Glare, smartphone flash reflections, or heavy shadows disrupt adaptive binarization algorithms.</li>
                        <li><strong>Handwritten Text:</strong> Standard OCR models are trained on printed typography; cursive handwriting requires specialized HTR models.</li>
                    </ul>
                    <p className="text-xs text-amber-800 font-medium pt-1">
                        We strongly advise human review of OCR outputs before utilizing text in legal, medical, or contractual environments.
                    </p>
                </section>

                {/* Section 4: Privacy & Security */}
                <section className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        <h2>Strict Zero-Retention Privacy Model</h2>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        When you extract text with ScanText OCR, your files are never saved permanently or used to train third-party machine learning models. Files are assigned randomized UUID v4 names in temporary memory and are immediately and permanently erased from the server disk as soon as processing completes.
                    </p>
                </section>

                {/* Related Links */}
                <section className="space-y-3 pt-4 border-t border-slate-200">
                    <h3 className="font-bold text-slate-900 text-sm">Explore Related Guides:</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <Link href="/jpg-to-text" className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl font-medium text-blue-600 hover:text-blue-700 flex items-center justify-between">
                            <span>JPG to Text: Artifacts &amp; Compression Fixes</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                        <Link href="/how-to-improve-ocr-accuracy" className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl font-medium text-blue-600 hover:text-blue-700 flex items-center justify-between">
                            <span>How to Improve OCR Accuracy: Engineering Guide</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
