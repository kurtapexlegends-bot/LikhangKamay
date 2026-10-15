import React from 'react';
import ProductImageLightboxModal from '@/Components/Consumer/Shop/ProductShow/ProductImageLightboxModal';
import { resolveImageUrl } from '@/lib/media';

export default function DisputeLightboxModal({
    isOpen,
    onClose,
    photos = [],
    currentIndex = 0,
    onChangeIndex,
    onNext,
    onPrev,
    title = 'Dispute Proof Evidence'
}) {
    if (!isOpen || !photos || photos.length === 0) return null;

    const normalizedGallery = photos.map(photo => {
        if (!photo) return '/images/placeholder.svg';
        return resolveImageUrl(photo);
    });

    const handleChangeIndex = (index) => {
        if (onChangeIndex) {
            onChangeIndex(index);
        } else if (index > currentIndex && onNext) {
            onNext();
        } else if (index < currentIndex && onPrev) {
            onPrev();
        }
    };

    return (
        <ProductImageLightboxModal
            isOpen={isOpen}
            onClose={onClose}
            productName={title}
            gallery={normalizedGallery}
            activeIndex={currentIndex}
            onChangeIndex={handleChangeIndex}
            has3D={false}
        />
    );
}
