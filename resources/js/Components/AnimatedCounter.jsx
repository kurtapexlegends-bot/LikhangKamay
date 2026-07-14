import React, { useEffect, useRef } from 'react';
import { animate } from 'framer-motion';

/**
 * A reusable component that animates a number from 0 to a target value.
 * 
 * @param {number} value - The target value to animate to.
 * @param {function} formatter - Optional formatter function for the display text.
 * @param {number} duration - Animation duration in seconds.
 */
const AnimatedCounter = ({ 
    value, 
    formatter = (v) => Math.round(v).toLocaleString(), 
    duration = 1.5 
}) => {
    const nodeRef = useRef(null);
    const formatterRef = useRef(formatter);

    // Keep the ref updated with the latest formatter function reference
    useEffect(() => {
        formatterRef.current = formatter;
    }, [formatter]);

    useEffect(() => {
        if (!nodeRef.current) return;

        const controls = animate(0, value, {
            duration: duration,
            onUpdate(v) {
                if (nodeRef.current) {
                    nodeRef.current.textContent = formatterRef.current(v);
                }
            },
        });

        return () => controls.stop();
    }, [value, duration]); // formatter is safely omitted since it's referenced via ref

    return <span ref={nodeRef}>{formatter(0)}</span>;
};

export default AnimatedCounter;
