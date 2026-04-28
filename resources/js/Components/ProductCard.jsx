import React from 'react';
import { Link } from '@inertiajs/react';

export default function ProductCard({ image, title, price, category }) {
    return (
        <div className="group relative bg-white rounded-xl p-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-clay-900/5 border border-transparent hover:border-clay-100">
            <div className="aspect-[4/5] w-full overflow-hidden rounded-lg bg-gray-100 relative shadow-sm">
                <img 
                    src={image} 
                    alt={title} 
                    className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-in-out"
                />
                {/* Quick Add Overlay - Professional Touch */}
                <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex justify-center bg-gradient-to-t from-black/50 to-transparent">
                    <button className="bg-white text-gray-900 px-6 py-2 rounded-xl shadow-md text-sm font-medium transition-all duration-300 hover:bg-clay-600 hover:text-white active:scale-95">
                        Quick View
                    </button>
                </div>
            </div>
            <div className="mt-4 flex justify-between items-start">
                <div>
                    <p className="text-xs text-clay-600 mb-1">{category}</p>
                    <h3 className="text-lg font-serif font-medium text-gray-900">
                        <Link href="#">
                            <span aria-hidden="true" className="absolute inset-0" />
                            {title}
                        </Link>
                    </h3>
                </div>
                <p className="text-sm font-medium text-gray-900">{price}</p>
            </div>
        </div>
    );
}
