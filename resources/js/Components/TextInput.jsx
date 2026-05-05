import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export default forwardRef(function TextInput(
    { type = 'text', className = '', isFocused = false, hasError = false, floatingLabel = '', withIcon = false, ...props },
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

    const inputClasses = `rounded-xl shadow-sm transition-all duration-500 outline-none disabled:bg-stone-100 disabled:text-stone-500 disabled:border-stone-200 disabled:shadow-none disabled:cursor-not-allowed ${
        hasError 
            ? 'border-rose-300 bg-rose-50/50 text-rose-900 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/20' 
            : 'border-stone-200 bg-white text-stone-900 focus:border-clay-500 focus:ring-4 focus:ring-clay-500/20 hover:border-stone-300 disabled:hover:border-stone-200'
    } ${floatingLabel ? 'peer pt-6 pb-2 px-4 placeholder-transparent' : ''} ${className}`;

    const inputElement = (
        <input
            {...props}
            type={type}
            className={inputClasses}
            placeholder={floatingLabel || props.placeholder}
            ref={localRef}
        />
    );

    if (floatingLabel) {
        const labelLeftClass = withIcon ? 'left-11' : 'left-4';
        
        return (
            <div className="relative w-full">
                {inputElement}
                <label className={`absolute text-sm text-stone-500 duration-300 transform -translate-y-3 scale-75 top-4 z-10 origin-[0] ${labelLeftClass} peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3 peer-focus:text-clay-600 pointer-events-none`}>
                    {floatingLabel}
                </label>
            </div>
        );
    }

    return inputElement;
});
