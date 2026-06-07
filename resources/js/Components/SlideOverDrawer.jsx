import { Fragment } from 'react';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { X } from 'lucide-react';

export default function SlideOverDrawer({
    show = false,
    onClose,
    title,
    children,
    footer = null,
    widthClass = 'max-w-md', // Default to medium width, can be overridden with 'max-w-2xl', etc.
    bodyClassName = 'relative flex-1 overflow-y-auto custom-scrollbar p-6'
}) {
    return (
        <Transition show={show} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                {/* Backdrop */}
                <TransitionChild
                    as={Fragment}
                    enter="ease-in-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in-out duration-300"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity" />
                </TransitionChild>

                {/* Sliding Panel */}
                <div className="fixed inset-0 overflow-hidden">
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
                            <TransitionChild
                                as={Fragment}
                                enter="transform transition ease-in-out duration-400 sm:duration-500"
                                enterFrom="translate-x-full"
                                enterTo="translate-x-0"
                                leave="transform transition ease-in-out duration-400 sm:duration-500"
                                leaveFrom="translate-x-0"
                                leaveTo="translate-x-full"
                            >
                                <DialogPanel className={`pointer-events-auto w-screen ${widthClass}`}>
                                    <div className="flex h-full flex-col bg-white shadow-2xl">
                                        {/* Header */}
                                        {title && (
                                            <div className="flex items-center justify-between border-b border-stone-100 px-6 py-5 shrink-0">
                                                <h2 className="text-lg font-bold text-stone-900 tracking-tight">
                                                    {title}
                                                </h2>
                                                <button
                                                    type="button"
                                                    className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors focus:outline-none focus:ring-2 focus:ring-clay-500/50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                                    onClick={onClose}
                                                >
                                                    <span className="sr-only">Close panel</span>
                                                    <X size={20} aria-hidden="true" />
                                                </button>
                                            </div>
                                        )}
                                        
                                        {/* Body */}
                                        <div className={bodyClassName}>
                                            {children}
                                        </div>

                                        {/* Footer */}
                                        {footer && (
                                            <div className="border-t border-stone-100 bg-stone-50/50 px-6 py-4 shrink-0">
                                                {footer}
                                            </div>
                                        )}
                                    </div>
                                </DialogPanel>
                            </TransitionChild>
                        </div>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}