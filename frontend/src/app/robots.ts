import { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://scantext.dev';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/admin/',
                    '/api/',
                    '/dashboard/',
                    '/login',
                    '/register',
                    '/reset-password',
                ],
            },
        ],
        sitemap: `${siteUrl}/sitemap.xml`,
    };
}
