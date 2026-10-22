'use client';

import React, { useEffect, useRef } from 'react';

interface TurnstileWidgetProps {
    siteKey: string;
    onVerify: (token: string) => void;
    onError?: () => void;
    onExpire?: () => void;
    theme?: 'light' | 'dark' | 'auto';
    className?: string;
}

declare global {
    interface Window {
        turnstile?: {
            render: (
                container: HTMLElement | string,
                options: {
                    sitekey: string;
                    callback?: (token: string) => void;
                    'error-callback'?: () => void;
                    'expired-callback'?: () => void;
                    theme?: string;
                    size?: string;
                }
            ) => string;
            reset: (widgetId: string) => void;
            remove: (widgetId: string) => void;
        };
        onloadTurnstileCallback?: () => void;
    }
}

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({
    siteKey,
    onVerify,
    onError,
    onExpire,
    theme = 'dark',
    className = ''
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (!siteKey || siteKey === '<no value>') return;

        let isMounted = true;

        const renderWidget = () => {
            if (!containerRef.current || !window.turnstile || widgetIdRef.current) return;

            try {
                const id = window.turnstile.render(containerRef.current, {
                    sitekey: siteKey,
                    callback: (token: string) => {
                        if (isMounted) onVerify(token);
                    },
                    'error-callback': () => {
                        if (isMounted && onError) onError();
                    },
                    'expired-callback': () => {
                        if (isMounted && onExpire) onExpire();
                    },
                    theme,
                });
                widgetIdRef.current = id;
            } catch (err) {
                console.warn('[Turnstile Notice] Render initialization deferred:', err);
            }
        };

        // Load Turnstile Script if not already present
        if (!document.getElementById('cloudflare-turnstile-script')) {
            const script = document.createElement('script');
            script.id = 'cloudflare-turnstile-script';
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
            script.async = true;
            script.defer = true;
            script.onload = () => {
                if (isMounted) renderWidget();
            };
            document.head.appendChild(script);
        } else if (window.turnstile) {
            renderWidget();
        } else {
            const timer = setInterval(() => {
                if (window.turnstile) {
                    clearInterval(timer);
                    if (isMounted) renderWidget();
                }
            }, 100);
            return () => clearInterval(timer);
        }

        return () => {
            isMounted = false;
            if (widgetIdRef.current && window.turnstile) {
                try {
                    window.turnstile.remove(widgetIdRef.current);
                } catch {
                    // Ignore cleanup error on unmount
                }
                widgetIdRef.current = null;
            }
        };
    }, [siteKey, theme]);

    if (!siteKey || siteKey === '<no value>') {
        return null;
    }

    return (
        <div className={`my-3 flex justify-center ${className}`}>
            <div ref={containerRef} className="cf-turnstile" />
        </div>
    );
};
