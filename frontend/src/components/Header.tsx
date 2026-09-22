import React from 'react';
import Link from 'next/link';
import { FileText, ShieldCheck, Zap } from 'lucide-react';

export const Header: React.FC = () => {
    return (
        <header className="w-full border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center space-x-3 group focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl p-1">
                    <div className="p-2 bg-blue-600 rounded-xl text-white shadow-md shadow-blue-500/20 group-hover:bg-blue-700 transition-colors">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <span className="font-bold text-xl text-slate-900 tracking-tight">ScanText</span>
                        <span className="ml-2 text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                            MVP
                        </span>
                    </div>
                </Link>

                <nav aria-label="Main Navigation" className="flex items-center space-x-6 text-sm font-medium text-slate-600">
                    <Link href="/" className="hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md px-1">
                        Home
                    </Link>
                    <Link href="/privacy" className="hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md px-1">
                        Privacy
                    </Link>
                    <Link href="/terms" className="hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md px-1">
                        Terms
                    </Link>
                    <Link href="/contact" className="hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md px-1">
                        Contact
                    </Link>
                </nav>
            </div>
        </header>
    );
};
