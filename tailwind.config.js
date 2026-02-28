import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.jsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Figtree', ...defaultTheme.fontFamily.sans],
                serif: ['Playfair Display', 'serif'], // Optional: Good for pottery vibes
            },
            colors: {
                // Custom Earthy Palette
                clay: {
                    50: '#fbf7f5',
                    100: '#f5ebe6',
                    200: '#ebd5c8',
                    300: '#dfb8a3',
                    400: '#cf9276',
                    500: '#c07251', // <--- Your Primary Terracotta
                    600: '#a65638',
                    700: '#89432d',
                    800: '#723929',
                    900: '#5e3125',
                },
                sage: {
                    50: '#f4f7f4',
                    100: '#e3ebe3',
                    500: '#8da38d', // <--- Secondary Earthy Green
                    600: '#6f856f',
                }
            }
        },
    },

    plugins: [forms],
};