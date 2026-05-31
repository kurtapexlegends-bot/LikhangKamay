import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default forwardRef(function TextInput(
    { 
        type = 'text', 
        className = '', 
        isFocused = false, 
        hasError = false, 
        floatingLabel = '', 
        label = '',
        icon: Icon = null, 
        withIcon = false, 
        ...props 
    },
    ref,
) {
    const localRef = useRef(null);
    const [showPassword, setShowPassword] = useState(false);

    useImperativeHandle(ref, () => ({
        focus: () => localRef.current?.focus(),
    }));

    useEffect(() => {
        if (isFocused) {
            localRef.current?.focus();
        }
    }, [isFocused]);

    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    const hasPrefixIcon = Icon !== null || withIcon;
    const paddingLeftClass = hasPrefixIcon ? 'pl-10' : 'pl-4';
    const paddingRightClass = isPassword ? 'pr-10' : 'pr-4';

    const labelVal = label || floatingLabel;

    const inputClasses = `w-full rounded-xl shadow-sm transition-all duration-300 outline-none disabled:bg-stone-100 disabled:text-stone-500 disabled:border-stone-200 disabled:shadow-none disabled:cursor-not-allowed ${
        hasError 
            ? 'border-rose-355 bg-rose-50/50 text-rose-900 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/20' 
            : 'border-stone-200 bg-stone-50/40 focus:bg-white focus:border-clay-500 focus:ring-4 focus:ring-clay-500/10 hover:border-stone-300 disabled:hover:border-stone-200'
    } ${paddingLeftClass} ${paddingRightClass} py-3.5 text-sm font-medium text-stone-900 ${className}`;

    const renderIcon = () => {
        if (!Icon) return null;
        return (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-20">
                <Icon className="w-4 h-4 text-stone-400 group-focus-within:text-clay-500 transition-colors duration-300" />
            </div>
        );
    };

    const renderPasswordToggle = () => {
        if (!isPassword) return null;
        return (
            <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-stone-400 hover:text-clay-600 transition-colors duration-300 z-30"
                tabIndex="-1"
            >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
        );
    };

    const inputElement = (
        <div className="relative w-full group">
            {renderIcon()}
            <input
                {...props}
                type={inputType}
                className={inputClasses}
                placeholder={props.placeholder || (labelVal ? `Enter ${labelVal.toLowerCase()}` : '')}
                ref={localRef}
            />
            {renderPasswordToggle()}
        </div>
    );

    if (labelVal) {
        return (
            <div className="w-full flex flex-col items-start group">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5 select-none transition-colors duration-300 group-focus-within:text-clay-600">
                    {labelVal}
                </label>
                {inputElement}
            </div>
        );
    }

    return inputElement;
});
