export default function InputLabel({
    value,
    className = '',
    children,
    ...props
}) {
    return (
        <label
            {...props}
            className={
                `block text-[13px] font-bold text-stone-800 tracking-wide ` +
                className
            }
        >
            {value ? value : children}
        </label>
    );
}
