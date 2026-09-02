import React from 'react';
import Modal from '@/Components/Modal';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function DisputeLightboxModal({
    isOpen,
    onClose,
    photos = [],
    currentIndex = 0,
    onNext,
    onPrev
}) {
    if (!isOpen || photos.length === 0) return null;

    const currentPhoto = photos[currentIndex];
    const photoUrl = currentPhoto?.startsWith('http') || currentPhoto?.startsWith('/storage')
        ? currentPhoto
        : `/storage/${currentPhoto}`;

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="2xl">
            <div className="p-4 bg-stone-950 text-white rounded-2xl overflow-hidden relative">
                <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                    <span className="text-xs font-bold text-stone-300">
                        Proof Photo {currentIndex + 1} of {photos.length}
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg bg-stone-800 text-stone-300 hover:text-white hover:bg-stone-700 transition cursor-pointer"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="relative my-4 flex items-center justify-center min-h-[300px] max-h-[70vh]">
                    <img
                        src={photoUrl}
                        alt={`Proof evidence ${currentIndex + 1}`}
                        className="max-h-[65vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
                    />

                    {photos.length > 1 && (
                        <>
                            <button
                                type="button"
                                onClick={onPrev}
                                className="absolute left-2 p-2 rounded-full bg-stone-900/80 hover:bg-stone-800 text-white transition border border-stone-700 cursor-pointer shadow-md"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                type="button"
                                onClick={onNext}
                                className="absolute right-2 p-2 rounded-full bg-stone-900/80 hover:bg-stone-800 text-white transition border border-stone-700 cursor-pointer shadow-md"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </Modal>
    );
}
