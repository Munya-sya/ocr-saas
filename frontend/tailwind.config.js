/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#ecfeff',
                    100: '#cffafe',
                    400: '#22d3ee',
                    500: '#06b6d4',
                    600: '#0891b2',
                    700: '#0e7490',
                    900: '#164e63',
                },
                accent: {
                    500: '#8b5cf6',
                    600: '#7c3aed',
                    700: '#6d28d9',
                }
            },
            keyframes: {
                'laser-scan': {
                    '0%': { top: '4px' },
                    '50%': { top: '32px' },
                    '100%': { top: '4px' },
                },
                'pulse-glow': {
                    '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
                    '50%': { opacity: '0.8', transform: 'scale(1.05)' },
                }
            },
            animation: {
                'laser-scan': 'laser-scan 1.5s ease-in-out infinite',
                'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
            }
        },
    },
    plugins: [],
};
