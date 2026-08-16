import React from 'react';
import ProductCard from '@/Pages/Consumer/Shop/Partials/ProductCard';

export default function RelatedProductsGrid({ relatedProducts }) {
    if (!relatedProducts || relatedProducts.length === 0) return null;

    return (
        <div className="max-w-6xl mx-auto px-4 py-4 mb-6">
            <div className="mb-3.5 border-b border-stone-200/60 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-clay-600 block mb-0.5">Related Pieces</span>
                <h2 className="text-base sm:text-lg font-bold text-stone-900 leading-tight">You Might Also Like</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {relatedProducts.map((related) => (
                    <ProductCard 
                        key={related.id} 
                        product={{
                            ...related,
                            image: related.image || related.img,
                            seller: related.seller || related.seller_name,
                            location: related.location || 'Philippines',
                        }} 
                    />
                ))}
            </div>
        </div>
    );
}
