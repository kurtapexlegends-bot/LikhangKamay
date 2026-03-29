import Dropdown from '@/Components/Dropdown';
import { Link, usePage } from '@inertiajs/react';

export default function WorkspaceLogoutLink({
    children,
    className = '',
    variant = 'dropdown',
}) {
    const user = usePage().props.auth?.user;
    const isStaff = user?.role === 'staff';
    const href = isStaff ? route('staff.logout.confirm') : route('logout');
    const submitProps = isStaff ? {} : { method: 'post', as: 'button' };

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
            {...submitProps}
        >
            {children}
        </Dropdown.Link>
    );
}
