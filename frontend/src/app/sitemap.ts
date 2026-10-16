import { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://scantext-ocr.com';

export default function sitemap(): MetadataRoute.Sitemap {
    const routes = [
        { path: '', priority: 1.0, changeFrequency: 'daily' as const },
        { path: '/how-to-extract-text-from-image', priority: 0.9, changeFrequency: 'weekly' as const },
        { path: '/jpg-to-text', priority: 0.8, changeFrequency: 'weekly' as const },
        { path: '/png-to-text', priority: 0.8, changeFrequency: 'weekly' as const },
        { path: '/pdf-to-text', priority: 0.8, changeFrequency: 'weekly' as const },
        { path: '/screenshot-to-text', priority: 0.8, changeFrequency: 'weekly' as const },
        { path: '/how-to-improve-ocr-accuracy', priority: 0.8, changeFrequency: 'weekly' as const },
        { path: '/pricing', priority: 0.7, changeFrequency: 'weekly' as const },
        { path: '/about', priority: 0.6, changeFrequency: 'monthly' as const },
        { path: '/contact', priority: 0.6, changeFrequency: 'monthly' as const },
        { path: '/privacy', priority: 0.5, changeFrequency: 'monthly' as const },
        { path: '/terms', priority: 0.5, changeFrequency: 'monthly' as const },
        { path: '/cookies', priority: 0.5, changeFrequency: 'monthly' as const },
    ];

    return routes.map((item) => ({
        url: `${siteUrl}${item.path}`,
        lastModified: new Date(),
        changeFrequency: item.changeFrequency,
        priority: item.priority,
    }));
}
