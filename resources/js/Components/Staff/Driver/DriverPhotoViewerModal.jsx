import React from 'react';
import ProductImageLightboxModal from '@/Components/Consumer/Shop/ProductShow/ProductImageLightboxModal';
import { resolveImageUrl } from '@/lib/media';

export default function DriverPhotoViewerModal({
    isOpen,
    onClose,
    title = 'Driver Verification Photo',
    photoUrl,
}) {
    if (!isOpen || !photoUrl) return null;

    const normalizedUrl = resolveImageUrl(photoUrl);

    return (
        <ProductImageLightboxModal
            isOpen={isOpen}
            onClose={onClose}
            productName={title}
            gallery={[normalizedUrl]}
            activeIndex={0}
            has3D={false}
        />
    );
}
