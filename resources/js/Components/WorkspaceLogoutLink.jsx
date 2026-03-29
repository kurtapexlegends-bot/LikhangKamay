import Dropdown, { DropDownContext } from '@/Components/Dropdown';
import StaffLogoutModal from '@/Components/StaffLogoutModal';
import { Link, usePage } from '@inertiajs/react';
import { useContext, useState } from 'react';

export default function WorkspaceLogoutLink({
    children,
    className = '',
    variant = 'dropdown',
}) {
    const user = usePage().props.auth?.user;
    const attendance = usePage().props.attendance || null;
    const isStaff = user?.role === 'staff';
    const [showModal, setShowModal] = useState(false);
    const dropdownContext = useContext(DropDownContext);
    const href = route('logout');
    const submitProps = isStaff ? {} : { method: 'post', as: 'button' };
    const baseDropdownClassName = 'block w-full px-4 py-2 text-left text-sm leading-5 text-gray-700 transition duration-150 ease-in-out hover:bg-gray-100 focus:bg-gray-100 focus:outline-none';

    const openModal = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        dropdownContext?.setOpen?.(false);
    };

    if (variant === 'button') {
        if (isStaff) {
            return (
                <>
                    <button
                        type="button"
                        onClick={openModal}
                        className={className}
                    >
                        {children}
                    </button>
                    <StaffLogoutModal open={showModal} attendance={attendance} onClose={closeModal} />
                </>
            );
        }

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

    if (isStaff) {
        return (
            <>
                <button
                    type="button"
                    onClick={openModal}
                    className={`${baseDropdownClassName} ${className}`.trim()}
                >
                    {children}
                </button>
                <StaffLogoutModal open={showModal} attendance={attendance} onClose={closeModal} />
            </>
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
