import React from 'react';
import {
    Dialog,
    DialogPanel,
    Transition,
    TransitionChild,
} from '@headlessui/react';

export default function Modal({
    children,
    show = false,
    maxWidth = '2xl',
    closeable = true,
    bottomSheet = false,
    onClose = () => {},
    afterLeave = () => {},
}) {
    const close = () => {
        if (closeable) {
            onClose();
        }
    };

    // Auto-enable bottomSheet on mobile for better ergonomics
    const [isMobile, setIsMobile] = React.useState(false);
    
    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 640);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const effectiveBottomSheet = bottomSheet || isMobile;

    const maxWidthClass = {
        sm: 'sm:max-w-sm',
        md: 'sm:max-w-md',
        lg: 'sm:max-w-lg',
        xl: 'sm:max-w-xl',
        '2xl': 'sm:max-w-2xl',
        '3xl': 'sm:max-w-3xl',
        '4xl': 'sm:max-w-4xl',
        '5xl': 'sm:max-w-5xl',
    }[maxWidth];

    return (
        <Transition show={show} leave="duration-300 ease-in" afterLeave={afterLeave}>
            <Dialog
                as="div"
                id="modal"
                className={`fixed inset-0 z-50 flex transform transition-all p-0 sm:px-4 sm:py-4 ${effectiveBottomSheet ? 'items-end sm:items-center' : 'items-center overflow-y-auto px-3 py-3'}`}
                onClose={close}
            >
                <TransitionChild
                    enter="ease-out duration-500"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-300"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md transition-opacity" />
                </TransitionChild>

                <TransitionChild
                    enter="ease-out duration-500 cubic-bezier(0.16, 1, 0.3, 1)"
                    enterFrom={`opacity-0 ${effectiveBottomSheet ? 'translate-y-full sm:translate-y-0 sm:scale-95' : 'translate-y-12 sm:translate-y-0 sm:scale-[0.92]'}`}
                    enterTo="opacity-100 translate-y-0 sm:scale-100"
                    leave="ease-in duration-300 cubic-bezier(0.7, 0, 0.84, 0)"
                    leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                    leaveTo={`opacity-0 ${effectiveBottomSheet ? 'translate-y-full sm:translate-y-0 sm:scale-95' : 'translate-y-12 sm:translate-y-0 sm:scale-[0.92]'}`}
                >
                    <DialogPanel
                        className={`relative transform overflow-y-auto bg-white shadow-2xl transition-all max-h-[92vh] sm:rounded-2xl sm:mx-auto sm:w-full ${maxWidthClass} ${effectiveBottomSheet ? 'rounded-t-[2.5rem] sm:rounded-2xl w-full' : 'rounded-2xl'}`}
                    >
                        {effectiveBottomSheet && (
                            <div className="sm:hidden w-full flex justify-center pt-3 pb-1">
                                <div className="w-12 h-1.5 bg-stone-200/60 rounded-full" />
                            </div>
                        )}
                        {children}
                    </DialogPanel>
                </TransitionChild>
            </Dialog>
        </Transition>
    );
}
