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
            {/* Animated Optical Brackets Emblem */}
            <div className="relative w-10 h-10 rounded-xl bg-slate-950 border border-slate-800/80 p-1.5 flex items-center justify-center shadow-lg shadow-cyan-950/20 group-hover:border-cyan-500/50 group-hover:shadow-cyan-500/25 transition-all duration-300 overflow-hidden">
                {/* Ambient Radial Background Glow */}
                <div className="absolute inset-0 bg-radial from-cyan-500/10 via-violet-500/5 to-transparent pointer-events-none" />

                {/* Laser Sweep Line (animates on hover) */}
                <div className="absolute inset-x-1 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-laser-scan transition-opacity duration-300 pointer-events-none shadow-[0_0_8px_#06b6d4]" />

                {/* Vector SVG with Optical Corner Brackets & Document */}
                <svg
                    viewBox="0 0 36 36"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full transform group-hover:scale-105 transition-transform duration-300"
                >
                    {/* Top-Left Bracket (Electric Cyan) */}
                    <path
                        d="M6 13V7C6 6.44772 6.44772 6 7 6H13"
                        stroke="#06b6d4"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        className="transition-all duration-300 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5"
                    />

                    {/* Top-Right Bracket (Vivid Violet) */}
                    <path
                        d="M23 6H29C29.5523 6 30 6.44772 30 7V13"
                        stroke="#8b5cf6"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        className="transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    />

                    {/* Bottom-Left Bracket (Vivid Violet) */}
                    <path
                        d="M6 23V29C6 29.5523 6.44772 30 7 30H13"
                        stroke="#8b5cf6"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        className="transition-all duration-300 group-hover:-translate-x-0.5 group-hover:translate-y-0.5"
                    />

                    {/* Bottom-Right Bracket (Electric Cyan) */}
                    <path
                        d="M23 30H29C29.5523 30 30 29.5523 30 29V23"
                        stroke="#06b6d4"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        className="transition-all duration-300 group-hover:translate-x-0.5 group-hover:translate-y-0.5"
                    />

                    {/* Central Document Glyph with Folded Corner */}
                    <path
                        d="M12 11H20L24 15V25H12V11Z"
                        fill="#0f172a"
                        stroke="#64748b"
                        strokeWidth="1.2"
                    />
                    <path
                        d="M20 11V15H24"
                        stroke="#64748b"
                        strokeWidth="1.2"
                        strokeLinejoin="round"
                    />
                    {/* Document Lines */}
                    <line x1="14" y1="17" x2="19" y2="17" stroke="#38bdf8" strokeWidth="1.2" strokeLinecap="round" />
                    <line x1="14" y1="20" x2="22" y2="20" stroke="#a78bfa" strokeWidth="1.2" strokeLinecap="round" />
                    <line x1="14" y1="23" x2="18" y2="23" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
            </div>

            {/* Wordmark (hidden if icon-only) */}
            {variant !== 'icon-only' && (
                <div className="flex items-center">
                    <span className={`font-extrabold tracking-tight ${variant === 'footer' ? 'text-lg text-slate-900' : 'text-xl text-slate-900'}`}>
                        Scan
                        <span className="bg-gradient-to-r from-cyan-500 via-sky-500 to-violet-600 bg-clip-text text-transparent">
                            Text
                        </span>
                    </span>
                    <span className="ml-2 text-[10px] font-bold px-2 py-0.5 bg-gradient-to-r from-cyan-50 to-violet-50 text-cyan-800 border border-cyan-200/80 rounded-full shadow-xs tracking-wider">
                        OCR
                    </span>
                </div>
            )}
        </div>
    );
};
