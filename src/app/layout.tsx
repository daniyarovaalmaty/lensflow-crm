import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SessionProvider } from '@/components/auth/SessionProvider';
import Script from 'next/script';
import { Toaster } from 'react-hot-toast';

const inter = Inter({
    subsets: ['latin', 'cyrillic'],
    variable: '--font-inter',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'LensFlow CRM',
    description: 'CRM для производства ортокератологических линз',
    manifest: '/manifest.json',
    icons: {
        icon: '/favicon.ico',
        apple: '/icons/apple-touch-icon.png',
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'LensFlow',
    },
    formatDetection: {
        telephone: false,
    },
};

export const viewport: Viewport = {
    themeColor: '#3B82F6',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ru" className={inter.variable}>
            <head>
                <meta name="mobile-web-app-capable" content="yes" />
            </head>
            <body className="min-h-screen">
                <Toaster position="top-center" />
                <SessionProvider>
                    {children}
                </SessionProvider>
                <Script id="sw-cleanup" strategy="beforeInteractive">
                    {`
                        // Auto-heal: a previous deploy registered a service worker that
                        // intercepted POST requests and broke API calls (orders/sales).
                        // Unregister it, clear its caches, and reload once so the current
                        // page is no longer controlled by it.
                        if ('serviceWorker' in navigator) {
                            navigator.serviceWorker.getRegistrations().then(function (regs) {
                                if (!regs.length) return;
                                Promise.all(regs.map(function (r) { return r.unregister(); }))
                                    .then(function () {
                                        if (window.caches && caches.keys) {
                                            return caches.keys().then(function (keys) {
                                                return Promise.all(keys.map(function (k) { return caches.delete(k); }));
                                            });
                                        }
                                    })
                                    .then(function () {
                                        if (navigator.serviceWorker.controller && !sessionStorage.getItem('sw-healed')) {
                                            sessionStorage.setItem('sw-healed', '1');
                                            location.reload();
                                        }
                                    })
                                    .catch(function () {});
                            }).catch(function () {});
                        }
                    `}
                </Script>
            </body>
        </html>
    );
}
// dev environment
