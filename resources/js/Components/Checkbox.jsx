export default function Checkbox({ className = '', ...props }) {
    return (
        <input
            {...props}
            type="checkbox"
            className={
                'rounded border-gray-300 text-clay-600 shadow-sm transition-all duration-300 focus:ring-clay-500 hover:scale-105 active:scale-95 ' +
                className
            }
        />
    );
}
