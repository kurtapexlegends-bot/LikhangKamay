import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, ShoppingBag, Truck, ShieldCheck } from 'lucide-react';

export default function ProductDetails({ auth, product }) {
    return (
        <div className="min-h-screen bg-[#FDFBF9] font-sans text-gray-800">
            <Head title={product.name} />

            {/* Navbar (Simplified) */}
            <nav className="h-20 bg-white border-b border-gray-100 flex items-center px-8 sticky top-0 z-50">
                <Link href={route('shop.index')} className="flex items-center gap-2 text-gray-500 hover:text-clay-600 transition font-bold text-sm">
                    <ArrowLeft size={18} /> Back to Shop
                </Link>
                <div className="mx-auto font-serif text-xl font-bold text-gray-900">LikhangKamay</div>
                <div className="w-20"></div> {/* Spacer */}
            </nav>

            <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    
                    {/* Left: Image */}
                    <div className="space-y-4">
                        <div className="aspect-square w-full bg-gray-100 rounded-3xl overflow-hidden border border-gray-200 shadow-sm">
                            <img src={product.img} alt={product.name} className="w-full h-full object-cover" />
                        </div>
                    </div>

                    {/* Right: Details */}
                    <div className="flex flex-col justify-center">
                        <div className="mb-6">
                            <span className="inline-block px-3 py-1 bg-clay-50 text-clay-700 text-xs font-bold uppercase tracking-wider rounded-full mb-3">
                                {product.category}
                            </span>
                            <h1 className="text-4xl font-serif font-bold text-gray-900 mb-2">{product.name}</h1>
                            <p className="text-2xl font-bold text-clay-600">₱{Number(product.price).toLocaleString()}</p>
                        </div>

                        <p className="text-gray-600 leading-relaxed mb-8 border-b border-gray-100 pb-8">
                            {product.description || "No description available for this handcrafted masterpiece."}
                        </p>

                        {/* Action Buttons */}
                        <div className="flex gap-4 mb-8">
                            {/* LINK TO CHECKOUT with Product ID */}
                            <Link 
                                href={route('checkout.create', { product_id: product.id })} 
                                className="flex-1 bg-clay-600 text-white py-4 rounded-xl font-bold shadow-xl shadow-clay-200 hover:bg-clay-700 transition active:scale-95 text-center flex justify-center items-center gap-2"
                            >
                                <ShoppingBag size={20} /> Buy Now
                            </Link>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-white border border-gray-100 rounded-xl flex items-center gap-3 shadow-sm">
                                <Truck className="text-clay-500" />
                                <div className="text-xs">
                                    <p className="font-bold text-gray-900">Fast Delivery</p>
                                    <p className="text-gray-500">Ships in 2-3 days</p>
                                </div>
                            </div>
                            <div className="p-4 bg-white border border-gray-100 rounded-xl flex items-center gap-3 shadow-sm">
                                <ShieldCheck className="text-clay-500" />
                                <div className="text-xs">
                                    <p className="font-bold text-gray-900">Authentic</p>
                                    <p className="text-gray-500">100% Handcrafted</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}