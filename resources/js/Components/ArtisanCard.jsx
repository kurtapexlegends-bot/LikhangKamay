import React from 'react';
import { Link } from '@inertiajs/react';

export default function ArtisanCard({ name, location, rating, image, avatar, tags }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition duration-300 group cursor-pointer">
            {/* Cover Image */}
            <div className="h-32 bg-gray-100 overflow-hidden relative">
                <img src={image} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
            </div>
            
            {/* Artisan Info */}
            <div className="p-5 relative">
                {/* Avatar overlapping cover */}
                <div className="absolute -top-10 left-5">
                    <div className="h-16 w-16 rounded-full border-4 border-white bg-clay-100 shadow-sm overflow-hidden flex items-center justify-center">
                         {/* Avatar Logic */}
                         {avatar ? (
                            <img src={avatar} alt={name} className="w-full h-full object-cover" />
                         ) : (
                            <span className="text-2xl font-bold text-clay-600 uppercase">
                                {name.charAt(0)}
                            </span>
                         )}
                    </div>
                </div>

                <div className="mt-6 flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">{name}</h3>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                            <span>📍</span> {location}
                        </p>
                    </div>
                    <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded text-xs font-bold text-yellow-700">
                        <span>★</span> {rating}
                    </div>
                </div>

                {/* Tags (What they sell) */}
                <div className="mt-4 flex flex-wrap gap-2">
                    {tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] uppercase font-bold tracking-wide rounded">
                            {tag}
                        </span>
                    ))}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                    <Link href="#" className="text-sm text-clay-600 font-medium hover:underline">
                        Visit Shop &rarr;
                    </Link>
                </div>
            </div>
        </div>
    );
}