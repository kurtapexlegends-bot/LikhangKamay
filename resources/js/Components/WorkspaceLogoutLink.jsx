import Dropdown, { DropDownContext } from '@/Components/Dropdown';
import { Link, usePage } from '@inertiajs/react';
import { useContext } from 'react';

export default function WorkspaceLogoutLink({
    children,
    className = '',
    variant = 'dropdown',
}) {
    const user = usePage().props.auth?.user;
    const isStaff = user?.role === 'staff';
    const dropdownContext = useContext(DropDownContext);
    const href = isStaff ? route('staff.logout.direct') : route('logout');
    const submitProps = { method: 'post', as: 'button' };
    const baseDropdownClassName = 'block w-full px-4 py-2 text-left text-sm leading-5 text-gray-700 transition duration-150 ease-in-out hover:bg-gray-100 focus:bg-gray-100 focus:outline-none';

    if (variant === 'button') {
        return (
            <Link
                href={href}
                className={className}
                {...submitProps}
            >
                {children}
            </Link>
        );
    }

    return (
        <Dropdown.Link
            href={href}
            className={className}
            onClick={() => dropdownContext?.setOpen?.(false)}
            {...submitProps}
        >
            {children}
        </Dropdown.Link>
    );
}
