import type { Metadata } from 'next';
import './globals.css';
import { CookieConsentBanner } from '../components/CookieConsentBanner';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://scantext.dev';

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: 'ScanText OCR | Free Image to Text & PDF OCR Tool',
        template: '%s | ScanText OCR',
    },
    description: 'Fast, secure, anonymous OCR document text extraction from JPG, PNG, WEBP, and PDF files. Zero data retention, automated file cleanup, and precision Tesseract engine.',
    keywords: [
        'OCR online',
        'image to text',
        'extract text from image',
        'jpg to text',
        'png to text',
        'pdf to text',
        'screenshot to text',
        'free ocr',
        'anonymous text extraction',
    ],
    authors: [{ name: 'ScanText OCR Team' }],
    creator: 'ScanText OCR',
    publisher: 'ScanText OCR SaaS',
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    openGraph: {
        type: 'website',
        locale: 'en_US',
        url: siteUrl,
        siteName: 'ScanText OCR',
        title: 'ScanText OCR | Free Image to Text & PDF OCR Tool',
        description: 'Extract text from images and PDF files securely with zero data retention.',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'ScanText OCR | Free Image to Text & PDF OCR Tool',
        description: 'Extract text from images and PDF files securely with zero data retention.',
    },
    alternates: {
        canonical: '/',
    },
    icons: {
        icon: [
            { url: '/favicon.ico', sizes: 'any' },
            { url: '/icon.png', type: 'image/png', sizes: '512x512' },
        ],
        apple: [
            { url: '/icon.png', sizes: '180x180', type: 'image/png' },
        ],
        shortcut: '/favicon.ico',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="antialiased min-h-screen flex flex-col justify-between bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white">
                {children}
                <CookieConsentBanner />
            </body>
        </html>
    );
}
