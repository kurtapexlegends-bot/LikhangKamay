import { useState, useEffect } from 'react';

/**
 * Custom hook that listens to CSS media queries and returns a boolean value.
 * Utilizes native window.matchMedia for performance, firing updates only
 * when screen boundaries are crossed.
 * 
 * @param {string} query - The CSS media query to listen to (e.g., '(max-width: 1023px)')
 * @returns {boolean} Whether the media query matches the screen dimensions
 */
export function useMediaQuery(query) {
    const [matches, setMatches] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.matchMedia(query).matches;
        }
        return false;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const media = window.matchMedia(query);
        setMatches(media.matches);

        const listener = (e) => {
            setMatches(e.matches);
        };

        if (media.addEventListener) {
            media.addEventListener('change', listener);
            return () => media.removeEventListener('change', listener);
        } else {
            media.addListener(listener);
            return () => media.removeListener(listener);
        }
    }, [query]);

    return matches;
}
