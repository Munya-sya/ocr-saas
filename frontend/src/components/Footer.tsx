import React from 'react';
import Link from 'next/link';
import { FileText, ShieldCheck, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
    return (
        <footer className="w-full border-t border-slate-200 bg-white/95 mt-16 text-slate-600">
            {/* Main Links Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-8 text-xs">
                    {/* Brand Column */}
                    <div className="md:col-span-2 space-y-3">
                        <Link href="/" className="flex items-center space-x-2 group">
                            <div className="p-1.5 bg-blue-600 rounded-lg text-white">
                                <FileText className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-lg text-slate-900 tracking-tight">ScanText OCR</span>
                        </Link>
                        <p className="text-slate-500 leading-relaxed max-w-sm">
                            Open, privacy-first Optical Character Recognition platform. We convert JPG, PNG, WEBP, and PDF documents into editable text with strict zero-retention ephemeral memory and automatic file destruction.
                        </p>
                        <div className="flex items-center gap-2 text-emerald-600 font-semibold text-[11px]">
                            <ShieldCheck className="w-4 h-4" />
                            <span>100% Automated File Deletion After Processing</span>
                        </div>
                    </div>

                    {/* Column 2: Document Converters */}
                    <div className="space-y-2.5">
                        <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Document Tools</h4>
                        <ul className="space-y-1.5">
                            <li>
                                <Link href="/how-to-extract-text-from-image" className="hover:text-blue-600 transition-colors">
                                    Image to Text Guide
                                </Link>
                            </li>
                            <li>
                                <Link href="/jpg-to-text" className="hover:text-blue-600 transition-colors">
                                    JPG to Text
                                </Link>
                            </li>
                            <li>
                                <Link href="/png-to-text" className="hover:text-blue-600 transition-colors">
                                    PNG to Text (Lossless)
                                </Link>
                            </li>
                            <li>
                                <Link href="/pdf-to-text" className="hover:text-blue-600 transition-colors">
                                    PDF to Text (Multi-Page)
                                </Link>
                            </li>
                            <li>
                                <Link href="/screenshot-to-text" className="hover:text-blue-600 transition-colors">
                                    Screenshot to Text
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Column 3: Resources & Guides */}
                    <div className="space-y-2.5">
                        <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Resources &amp; Tech</h4>
                        <ul className="space-y-1.5">
                            <li>
                                <Link href="/how-to-improve-ocr-accuracy" className="hover:text-blue-600 transition-colors">
                                    Improve OCR Accuracy
                                </Link>
                            </li>
                            <li>
                                <Link href="/pricing" className="hover:text-blue-600 transition-colors">
                                    Pro Subscription ($19/mo)
                                </Link>
                            </li>
                            <li>
                                <Link href="/about" className="hover:text-blue-600 transition-colors">
                                    About ScanText
                                </Link>
                            </li>
                            <li>
                                <Link href="/contact" className="hover:text-blue-600 transition-colors">
                                    Contact &amp; Support
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Column 4: Legal & Privacy */}
                    <div className="space-y-2.5">
                        <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Legal &amp; Trust</h4>
                        <ul className="space-y-1.5">
                            <li>
                                <Link href="/privacy" className="hover:text-blue-600 transition-colors">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/terms" className="hover:text-blue-600 transition-colors">
                                    Terms of Service
                                </Link>
                            </li>
                            <li>
                                <Link href="/cookies" className="hover:text-blue-600 transition-colors">
                                    Cookie Policy
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar with Accuracy Notice */}
                <div className="mt-10 pt-6 border-t border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
                    <p>
                        &copy; {new Date().getFullYear()} ScanText OCR SaaS. Built with Tesseract 5, FastAPI &amp; Next.js.
                    </p>
                    <p className="max-w-md text-center md:text-right leading-relaxed text-slate-400">
                        <strong>Accuracy Notice:</strong> OCR is a machine-learning character recognition tool. Extracted text accuracy depends on source resolution and lighting; output must be reviewed before use in critical environments.
                    </p>
                </div>
            </div>
        </footer>
    );
};
