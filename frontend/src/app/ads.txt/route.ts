import { NextResponse } from 'next/server';

export async function GET() {
    let cleanPub = 'pub-8167471318692318';
    try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000';
        const res = await fetch(`${apiUrl}/api/v1/config/ads`, { next: { revalidate: 300 } });
        if (res.ok) {
            const data = await res.json();
            if (data.clientId) {
                cleanPub = data.clientId.replace('ca-', '').trim();
            }
        }
    } catch {
        // Safe fallback to user's AdSense ID
    }

    const content = `google.com, ${cleanPub}, DIRECT, f08c47fec0942fa0\n`;

    return new NextResponse(content, {
        headers: {
            'Content-Type': 'text/plain',
            'Cache-Control': 'public, max-age=3600',
        },
    });
}
