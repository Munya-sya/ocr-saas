import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'ScanText OCR | Enterprise-Grade Document Text Extraction',
    description: 'Fast, secure, anonymous OCR text extraction from JPG, PNG, WEBP, and PDF files powered by Tesseract & FastAPI.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="antialiased min-h-screen flex flex-col justify-between">
                {children}
            </body>
        </html>
    );
}
