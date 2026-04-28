export default function SecondaryButton({
    type = 'button',
    className = '',
    disabled,
    children,
    ...props
}) {
    return (
        <button
            {...props}
            type={type}
            className={
                `inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-widest text-clay-700 shadow-sm transition-all duration-300 ease-in-out hover:bg-clay-50 hover:-translate-y-0.5 hover:shadow focus:outline-none focus:ring-2 focus:ring-clay-500 focus:ring-offset-2 disabled:opacity-25 active:scale-95 active:shadow-sm ${
                    disabled && 'opacity-25'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
