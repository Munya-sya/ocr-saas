'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, User, LogOut, LayoutDashboard, Tag, Shield, BookOpen, ChevronDown, Menu, X, Sparkles } from 'lucide-react';
import { getCurrentUserProfile, logoutUser } from '../services/api';
import { User as UserType } from '../types';

export const Header: React.FC = () => {
    const [user, setUser] = useState<UserType | null>(null);
    const [guidesOpen, setGuidesOpen] = useState<boolean>(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

    useEffect(() => {
        getCurrentUserProfile()
            .then(res => setUser(res.user))
            .catch(() => setUser(null));
    }, []);

    const handleLogout = async () => {
        await logoutUser();
        setUser(null);
        window.location.href = '/';
    };

    const guideLinks = [
        { href: '/how-to-extract-text-from-image', label: 'How to Extract Text from Image', desc: 'Step-by-step OCR process & preprocessing' },
        { href: '/jpg-to-text', label: 'JPG to Text', desc: 'DCT compression & noise cleanup' },
        { href: '/png-to-text', label: 'PNG to Text', desc: 'Lossless OCR & alpha transparency' },
        { href: '/pdf-to-text', label: 'PDF to Text', desc: 'Vector text & multi-page scanned PDFs' },
        { href: '/screenshot-to-text', label: 'Screenshot to Text', desc: 'Low-DPI screen fonts & dark mode' },
        { href: '/how-to-improve-ocr-accuracy', label: 'Improve OCR Accuracy', desc: 'DPI, binarization, deskewing & PSM' },
    ];

    return (
        <header className="w-full border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center space-x-3 group focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl p-1">
                    <div className="p-2 bg-blue-600 rounded-xl text-white shadow-md shadow-blue-500/20 group-hover:bg-blue-700 transition-colors">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div className="flex items-center">
                        <span className="font-bold text-xl text-slate-900 tracking-tight">ScanText</span>
                        <span className="ml-2 text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                            OCR
                        </span>
                    </div>
                </Link>

                {/* Desktop Navigation */}
                <nav aria-label="Main Navigation" className="hidden md:flex items-center space-x-6 text-sm font-medium text-slate-600">
                    <Link href="/" className="hover:text-blue-600 transition-colors">
                        Home
                    </Link>

                    {/* Guides Dropdown */}
                    <div
                        className="relative"
                        onMouseEnter={() => setGuidesOpen(true)}
                        onMouseLeave={() => setGuidesOpen(false)}
                    >
                        <button
                            type="button"
                            onClick={() => setGuidesOpen(!guidesOpen)}
                            className="flex items-center gap-1 hover:text-blue-600 transition-colors py-2 focus:outline-none"
                            aria-expanded={guidesOpen}
                        >
                            <BookOpen className="w-4 h-4 text-slate-400" />
                            <span>Guides &amp; Tools</span>
                            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${guidesOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {guidesOpen && (
                            <div className="absolute top-full -left-12 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl py-3 px-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                                <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase px-3 py-1">
                                    OCR Guides &amp; Formats
                                </div>
                                <div className="space-y-0.5">
                                    {guideLinks.map((guide) => (
                                        <Link
                                            key={guide.href}
                                            href={guide.href}
                                            onClick={() => setGuidesOpen(false)}
                                            className="block px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors group"
                                        >
                                            <div className="text-xs font-semibold text-slate-900 group-hover:text-blue-600">
                                                {guide.label}
                                            </div>
                                            <div className="text-[11px] text-slate-500 leading-snug">
                                                {guide.desc}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <Link href="/pricing" className="hover:text-blue-600 transition-colors flex items-center gap-1">
                        <Tag className="w-4 h-4 text-slate-400" />
                        <span>Pricing</span>
                    </Link>

                    <Link href="/about" className="hover:text-blue-600 transition-colors">
                        About
                    </Link>

                    <Link href="/contact" className="hover:text-blue-600 transition-colors">
                        Contact
                    </Link>

                    {/* Auth Status / CTAs */}
                    {user ? (
                        <div className="flex items-center space-x-3 pl-2 border-l border-slate-200">
                            {user.isAdmin && (
                                <Link href="/admin" className="flex items-center gap-1.5 text-violet-700 font-semibold hover:text-violet-800 bg-violet-50 px-3 py-1.5 rounded-lg border border-violet-200 text-xs">
                                    <Shield className="w-3.5 h-3.5" />
                                    Admin
                                </Link>
                            )}
                            <Link href="/dashboard" className="flex items-center gap-1.5 text-blue-600 font-semibold hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 text-xs">
                                <LayoutDashboard className="w-3.5 h-3.5" />
                                Dashboard
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-1 text-slate-500 hover:text-rose-600 transition-colors text-xs"
                                title="Sign out"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                Logout
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center space-x-3 pl-2 border-l border-slate-200">
                            <Link href="/login" className="text-slate-700 hover:text-blue-600 font-medium px-2.5 py-1.5 text-xs">
                                Log in
                            </Link>
                            <Link href="/register" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3.5 py-1.5 rounded-lg shadow-sm transition-colors text-xs flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                <span>Get Started</span>
                            </Link>
                        </div>
                    )}
                </nav>

                {/* Mobile Menu Toggle Button */}
                <div className="md:hidden flex items-center">
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
                        aria-label="Toggle navigation menu"
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Dropdown Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3 text-sm">
                    <Link href="/" onClick={() => setMobileMenuOpen(false)} className="block py-1.5 font-medium text-slate-800">
                        Home
                    </Link>
                    <div className="pt-2 border-t border-slate-100">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Guides &amp; Tools</div>
                        <div className="space-y-1.5 pl-2">
                            {guideLinks.map((g) => (
                                <Link
                                    key={g.href}
                                    href={g.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="block py-1 text-slate-600 hover:text-blue-600 text-xs font-medium"
                                >
                                    {g.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                        <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className="block py-1 font-medium text-slate-800">
                            Pricing
                        </Link>
                        <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="block py-1 font-medium text-slate-800">
                            About
                        </Link>
                        <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="block py-1 font-medium text-slate-800">
                            Contact
                        </Link>
                    </div>

                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                        {user ? (
                            <div className="flex items-center gap-2 w-full justify-between">
                                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold">
                                    Dashboard
                                </Link>
                                <button onClick={handleLogout} className="text-xs text-rose-600 font-medium">
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 w-full">
                                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="flex-1 text-center py-2 text-slate-700 bg-slate-100 rounded-lg text-xs font-semibold">
                                    Log in
                                </Link>
                                <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="flex-1 text-center py-2 text-white bg-blue-600 rounded-lg text-xs font-semibold">
                                    Register
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
};
