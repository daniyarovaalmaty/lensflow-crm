/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: 'hsl(210, 100%, 97%)',
                    100: 'hsl(210, 100%, 94%)',
                    200: 'hsl(210, 100%, 88%)',
                    300: 'hsl(210, 100%, 78%)',
                    400: 'hsl(210, 100%, 65%)',
                    500: 'hsl(210, 100%, 50%)',
                    600: 'hsl(210, 100%, 42%)',
                    700: 'hsl(210, 100%, 35%)',
                    800: 'hsl(210, 100%, 28%)',
                    900: 'hsl(210, 100%, 20%)',
                },
                surface: {
                    DEFAULT: 'hsl(0, 0%, 98%)',
                    secondary: 'hsl(0, 0%, 95%)',
                    elevated: 'hsl(0, 0%, 100%)',
                },
                border: {
                    DEFAULT: 'hsl(0, 0%, 90%)',
                    hover: 'hsl(0, 0%, 80%)',
                },
            },
            borderRadius: {
                lg: '12px',
                md: '8px',
                sm: '6px',
            },
            boxShadow: {
                sm: '0 1px 3px rgba(0, 0, 0, 0.08)',
                md: '0 4px 12px rgba(0, 0, 0, 0.08)',
                lg: '0 8px 24px rgba(0, 0, 0, 0.12)',
            },
            transitionTimingFunction: {
                'ag': 'cubic-bezier(0.4, 0, 0.2, 1)',
            },
            transitionDuration: {
                'ag': '200ms',
            },
            fontFamily: {
                sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
