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
        <Transition show={show} leave="duration-200" afterLeave={afterLeave}>
            <Dialog
                as="div"
                id="modal"
                className={`fixed inset-0 z-50 flex transform transition-all p-0 sm:px-4 sm:py-4 ${bottomSheet ? 'items-end sm:items-center' : 'items-center overflow-y-auto px-3 py-3'}`}
                onClose={close}
            >
                <TransitionChild
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity" />
                </TransitionChild>

                <TransitionChild
                    enter="ease-out duration-300"
                    enterFrom={`opacity-0 ${bottomSheet ? 'translate-y-full sm:translate-y-0 sm:scale-95' : 'translate-y-8 sm:translate-y-0 sm:scale-95'}`}
                    enterTo="opacity-100 translate-y-0 sm:scale-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                    leaveTo={`opacity-0 ${bottomSheet ? 'translate-y-full sm:translate-y-0 sm:scale-95' : 'translate-y-8 sm:translate-y-0 sm:scale-95'}`}
                >
                    <DialogPanel
                        className={`relative transform overflow-y-auto bg-white shadow-2xl transition-all max-h-[90vh] sm:rounded-2xl sm:mx-auto sm:w-full ${maxWidthClass} ${bottomSheet ? 'rounded-t-[2.5rem] sm:rounded-2xl w-full' : 'rounded-2xl'}`}
                    >
                        {bottomSheet && (
                            <div className="sm:hidden w-full flex justify-center pt-3 pb-1">
                                <div className="w-12 h-1.5 bg-stone-200 rounded-full" />
                            </div>
                        )}
                        {children}
                    </DialogPanel>
                </TransitionChild>
            </Dialog>
        </Transition>
    );
}
