export default function Checkbox({ className = '', ...props }) {
    return (
        <input
            {...props}
            type="checkbox"
            className={
                'rounded border-stone-200 bg-white text-clay-600 shadow-sm transition-all duration-300 outline-none focus:border-clay-500 focus:ring-4 focus:ring-clay-500/20 hover:border-stone-300 active:scale-95 ' +
                className
            }
        />
    );
}
