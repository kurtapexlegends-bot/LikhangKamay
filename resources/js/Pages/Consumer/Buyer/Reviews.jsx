import React from 'react';
import ShopLayout from '@/Layouts/ShopLayout';
import { Head, Link } from '@inertiajs/react';
import { Star, MessageSquare, Package, ArrowRight, Edit2, Trash2 } from 'lucide-react';

export default function Reviews({ reviews = [] }) {
    return (
        <ShopLayout>
            <Head title="My Reviews" />

            <div className="max-w-3xl mx-auto py-10 px-4">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-stone-900">My Reviews</h1>
                    <p className="text-stone-500 text-sm">Manage the feedback you've shared with artisans.</p>
                </div>

                {reviews.length > 0 ? (
                    <div className="space-y-4">
                        {reviews.map((review) => (
                            <div key={review.id} className="bg-white rounded-3xl border border-stone-100 shadow-sm p-6">
                                <div className="flex gap-4 items-start mb-4">
                                    <div className="w-16 h-16 rounded-2xl bg-stone-100 overflow-hidden shrink-0 border border-stone-50">
                                        {review.product?.image ? (
                                            <img src={review.product.image} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-stone-300">
                                                <Package size={24} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-stone-900 truncate mb-1">
                                            {review.product?.name || 'Deleted Product'}
                                        </h3>
                                        <div className="flex items-center gap-1">
                                            {[...Array(5)].map((_, i) => (
                                                <Star 
                                                    key={i} 
                                                    size={14} 
                                                    className={i < review.rating ? "fill-amber-400 text-amber-400" : "text-stone-200"} 
                                                />
                                            ))}
                                            <span className="text-xs text-stone-400 ml-2 font-medium">{review.date}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-stone-50 rounded-2xl p-4 mb-4">
                                    <p className="text-sm text-stone-700 leading-relaxed italic">
                                        "{review.comment || 'No comment provided.'}"
                                    </p>
                                </div>

                                {review.seller_reply && (
                                    <div className="ml-6 pl-4 border-l-2 border-clay-200 mb-4">
                                        <p className="text-[11px] font-black uppercase tracking-widest text-clay-600 mb-1">Artisan's Reply</p>
                                        <p className="text-sm text-stone-600 italic">
                                            "{review.seller_reply}"
                                        </p>
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-stone-500 hover:text-stone-900 transition-colors">
                                        <Edit2 size={14} /> Edit
                                    </button>
                                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                                        <Trash2 size={14} /> Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-stone-50 rounded-3xl border border-dashed border-stone-200">
                        <MessageSquare size={48} className="mx-auto text-stone-300 mb-4" />
                        <h3 className="text-stone-900 font-bold">No reviews yet</h3>
                        <p className="text-stone-500 text-sm mt-1">You haven't reviewed any products yet.</p>
                        <Link href={route('my-orders.index')} className="inline-flex mt-6 px-6 py-2.5 bg-stone-900 text-white rounded-full text-sm font-bold">
                            View My Purchases
                        </Link>
                    </div>
                )}
            </div>
        </ShopLayout>
    );
}
