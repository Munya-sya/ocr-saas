'use client';

import React from 'react';

interface ScanTextLogoProps {
    variant?: 'header' | 'footer' | 'icon-only' | 'compact';
    className?: string;
}

export const ScanTextLogo: React.FC<ScanTextLogoProps> = ({
    variant = 'header',
    className = ''
}) => {
    return (
        <div className={`flex items-center gap-3 select-none ${className}`}>
            {/* Ultra-Vibrant Glassmorphic Optical Emblem */}
            <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 border border-cyan-400/40 p-2 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.25)] group-hover:border-cyan-400 group-hover:shadow-[0_0_30px_rgba(6,182,212,0.55),0_0_15px_rgba(168,85,247,0.35)] transition-all duration-300 overflow-hidden">
                {/* Luminous Iridescent Background Glow */}
                <div className="absolute inset-0 bg-radial from-cyan-400/20 via-violet-600/15 to-transparent pointer-events-none" />

                {/* Laser Sweep Line (continuous subtle pulse + accelerated on hover) */}
                <div className="absolute inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_12px_#22d3ee,0_0_6px_#ffffff] animate-laser-scan pointer-events-none" />

                {/* Vector SVG with High-Energy Neon Brackets */}
                <svg
                    viewBox="0 0 36 36"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full transform group-hover:scale-110 transition-transform duration-300 relative z-10"
                >
                    <defs>
                        <linearGradient id="neonCyan" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#00F0FF" />
                            <stop offset="100%" stopColor="#06B6D4" />
                        </linearGradient>
                        <linearGradient id="neonViolet" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#E879F9" />
                            <stop offset="100%" stopColor="#8B5CF6" />
                        </linearGradient>
                        <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="1.2" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>

                    {/* Top-Left Bracket (Electric Neon Cyan) */}
                    <path
                        d="M5 13V6.5C5 5.67157 5.67157 5 6.5 5H13"
                        stroke="url(#neonCyan)"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        filter="url(#glowEffect)"
                        className="transition-all duration-300 group-hover:-translate-x-1 group-hover:-translate-y-1"
                    />

                    {/* Top-Right Bracket (Hot Violet / Magenta) */}
                    <path
                        d="M23 5H29.5C30.3284 5 31 5.67157 31 6.5V13"
                        stroke="url(#neonViolet)"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        filter="url(#glowEffect)"
                        className="transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
                    />

                    {/* Bottom-Left Bracket (Hot Violet / Magenta) */}
                    <path
                        d="M5 23V29.5C5 30.3284 5.67157 31 6.5 31H13"
                        stroke="url(#neonViolet)"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        filter="url(#glowEffect)"
                        className="transition-all duration-300 group-hover:-translate-x-1 group-hover:translate-y-1"
                    />

                    {/* Bottom-Right Bracket (Electric Neon Cyan) */}
                    <path
                        d="M23 31H29.5C30.3284 31 31 30.3284 31 29.5V23"
                        stroke="url(#neonCyan)"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        filter="url(#glowEffect)"
                        className="transition-all duration-300 group-hover:translate-x-1 group-hover:translate-y-1"
                    />

                    {/* Central Glowing Crystal Document Glyph */}
                    <path
                        d="M12 9.5H19.5L24 14V26.5H12V9.5Z"
                        fill="#090D16"
                        stroke="#38BDF8"
                        strokeWidth="1.5"
                    />
                    <path
                        d="M19.5 9.5V14H24"
                        stroke="#00F0FF"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                    />
                    {/* Glowing Scanning Text Lines */}
                    <line x1="14.5" y1="16.5" x2="20" y2="16.5" stroke="#22D3EE" strokeWidth="1.6" strokeLinecap="round" />
                    <line x1="14.5" y1="19.5" x2="22" y2="19.5" stroke="#C084FC" strokeWidth="1.6" strokeLinecap="round" />
                    <line x1="14.5" y1="22.5" x2="18.5" y2="22.5" stroke="#38BDF8" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
            </div>

            {/* Wordmark (hidden if icon-only) */}
            {variant !== 'icon-only' && (
                <div className="flex items-center">
                    <span className={`font-black tracking-tight ${variant === 'footer' ? 'text-xl text-slate-900' : 'text-2xl text-slate-900'}`}>
                        Scan
                        <span className="bg-gradient-to-r from-cyan-500 via-sky-400 to-fuchsia-500 bg-clip-text text-transparent drop-shadow-sm">
                            Text
                        </span>
                    </span>
                    <span className="ml-2.5 text-[10px] font-extrabold px-2.5 py-0.5 bg-gradient-to-r from-cyan-500/10 via-violet-500/10 to-fuchsia-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-400/50 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.2)] tracking-widest uppercase">
                        PRO
                    </span>
                </div>
            )}
        </div>
    );
};
