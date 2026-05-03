import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export default forwardRef(function TextInput(
    { type = 'text', className = '', isFocused = false, hasError = false, ...props },
    ref,
) {
    const localRef = useRef(null);

    useImperativeHandle(ref, () => ({
        focus: () => localRef.current?.focus(),
    }));

    useEffect(() => {
        if (isFocused) {
            localRef.current?.focus();
        }
    }, [isFocused]);

    return (
        <input
            {...props}
            type={type}
            className={
                `rounded-xl shadow-sm transition-all duration-500 outline-none ${
                    hasError 
                        ? 'border-rose-300 bg-rose-50/50 text-rose-900 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/20' 
                        : 'border-stone-200 bg-white text-stone-900 focus:border-clay-500 focus:ring-4 focus:ring-clay-500/20 hover:border-stone-300'
                } ` + className
            }
            ref={localRef}
        />
    );
});
