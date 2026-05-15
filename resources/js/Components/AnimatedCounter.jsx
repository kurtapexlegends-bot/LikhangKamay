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

    useEffect(() => {
        if (!nodeRef.current) return;

        const controls = animate(0, value, {
            duration: duration,
            onUpdate(value) {
                if (nodeRef.current) {
                    nodeRef.current.textContent = formatter(value);
                }
            },
        });

        return () => controls.stop();
    }, [value, duration, formatter]);

    return <span ref={nodeRef}>{formatter(0)}</span>;
};

export default AnimatedCounter;
