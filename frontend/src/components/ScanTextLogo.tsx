'use client';

import React from 'react';
import Image from 'next/image';

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
            {/* 3D Prism Glassmorphic Emblem Box */}
            <div className="relative w-11 h-11 rounded-2xl bg-white border border-cyan-400/50 p-1 flex items-center justify-center shadow-md shadow-cyan-500/15 group-hover:border-cyan-500 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all duration-300 overflow-hidden">
                {/* Subtle Laser Sweep Highlight */}
                <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#06b6d4] opacity-0 group-hover:opacity-100 group-hover:animate-laser-scan transition-opacity duration-300 pointer-events-none z-10" />

                {/* 3D Prism App Icon */}
                <img
                    src="/icon.png"
                    alt="ScanText 3D Emblem"
                    className="w-full h-full object-cover rounded-xl transform group-hover:scale-105 transition-transform duration-300"
                />
            </div>

            {/* Wordmark (hidden if icon-only) */}
            {variant !== 'icon-only' && (
                <div className="flex items-center">
                    <span className={`font-black tracking-tight ${variant === 'footer' ? 'text-xl text-slate-900' : 'text-2xl text-slate-900'}`}>
                        Scan
                        <span className="bg-gradient-to-r from-cyan-600 via-sky-500 to-violet-600 bg-clip-text text-transparent">
                            Text
                        </span>
                    </span>
                    <span className="ml-2 text-[10px] font-extrabold px-2 py-0.5 bg-gradient-to-r from-cyan-50 to-violet-50 text-cyan-800 border border-cyan-200/80 rounded-full tracking-wider uppercase shadow-xs">
                        OCR
                    </span>
                </div>
            )}
        </div>
    );
};
