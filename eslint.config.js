import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [
    js.configs.recommended,
    {
        files: ["resources/js/**/*.{js,jsx}"],
        plugins: {
            react,
            "react-hooks": reactHooks,
        },
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            parserOptions: {
                ecmaFeatures: { jsx: true },
            },
            globals: {
                window: "readonly",
                document: "readonly",
                console: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
                fetch: "readonly",
                FormData: "readonly",
                URL: "readonly",
                URLSearchParams: "readonly",
                File: "readonly",
                FileReader: "readonly",
                Blob: "readonly",
                navigator: "readonly",
                location: "readonly",
                history: "readonly",
                localStorage: "readonly",
                sessionStorage: "readonly",
                alert: "readonly",
                confirm: "readonly",
                Promise: "readonly",
                Map: "readonly",
                Set: "readonly",
            },
        },
        settings: {
            react: { version: "detect" },
        },
        rules: {
            ...react.configs.recommended.rules,
            ...reactHooks.configs.recommended.rules,
            "react/react-in-jsx-scope": "off", // Not needed with React 17+
            "react/prop-types": "off",          // Skip prop-types enforcement
            "no-unused-vars": "warn",
            "no-undef": "warn",
        },
    },
    {
        ignores: [
            "node_modules/**",
            "vendor/**",
            "public/**",
            "storage/**",
            "bootstrap/cache/**",
        ],
    },
];
