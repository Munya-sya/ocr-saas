import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
    return (
        <footer className="w-full border-t border-slate-200 bg-white/60 py-8 mt-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
                <p>© {new Date().getFullYear()} ScanText OCR SaaS. Anonymous Image-to-Text MVP.</p>
                <div className="flex items-center space-x-6 font-medium">
                    <Link href="/privacy" className="hover:text-blue-600 transition-colors">
                        Privacy Policy
                    </Link>
                    <Link href="/terms" className="hover:text-blue-600 transition-colors">
                        Terms of Service
                    </Link>
                    <Link href="/contact" className="hover:text-blue-600 transition-colors">
                        Contact
                    </Link>
                </div>
            </div>
        </footer>
    );
};
