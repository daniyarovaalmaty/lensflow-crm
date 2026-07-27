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
                        if ('serviceWorker' in navigator) {
                            navigator.serviceWorker.getRegistrations().then(function (regs) {
                                for (var i = 0; i < regs.length; i++) {
                                    regs[i].unregister();
                                }
                            }).catch(function () {});
                        }
                        if (window.caches && caches.keys) {
                            caches.keys().then(function (keys) {
                                keys.forEach(function (k) { caches.delete(k); });
                            }).catch(function () {});
                        }
                    `}
                </Script>
            </body>
        </html>
    );
}
// dev environment
