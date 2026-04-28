import { Link } from '@inertiajs/react';

export default function NavLink({
    active = false,
    className = '',
    children,
    ...props
}) {
    return (
        <Link
            {...props}
            className={
                'inline-flex items-center border-b-2 px-1 pt-1 text-[13px] font-bold tracking-wide leading-5 transition-all duration-300 ease-in-out focus:outline-none ' +
                (active
                    ? 'border-clay-600 text-clay-700 focus:border-clay-700'
                    : 'border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-800 focus:border-stone-300 focus:text-stone-800') +
                className
            }
        >
            {children}
        </Link>
    );
}
