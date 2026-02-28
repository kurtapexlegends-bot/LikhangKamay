import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import SellerSidebar from '@/Components/SellerSidebar';
import Dropdown from '@/Components/Dropdown';
import NotificationDropdown from '@/Components/NotificationDropdown'; 
import { 
    Star, MessageSquare, Image as ImageIcon, Search, Filter,
    Menu, ChevronDown, User, LogOut
} from 'lucide-react';

export default function Reviews({ auth, reviews, stats }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [filter, setFilter] = useState('All');

    const filteredReviews = filter === 'All' 
        ? reviews 
        : reviews.filter(r => r.rating === parseInt(filter));

    return (
        <div className="min-h-screen bg-[#FDFBF9] flex font-sans text-gray-800">
            <Head title="Shop Reviews" />
            
            <SellerSidebar 
                active="reviews" 
                user={auth.user} 
                mobileOpen={sidebarOpen} 
                onClose={() => setSidebarOpen(false)} 
            />

            <div className="flex-1 flex flex-col min-w-0 lg:ml-56 transition-all duration-300">
                
                {/* --- STANDARDIZED HEADER --- */}
                <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-40">
                    
                    {/* LEFT: Title */}
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-clay-600">
                            <Menu size={24} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Customer Ratings</h1>
                            <p className="text-xs text-gray-500 font-medium mt-0.5 hidden sm:block">Shop quality feedback & reviews</p>
                        </div>
                    </div>

                    {/* RIGHT: Actions & Profile */}
                    <div className="flex items-center gap-6">
                        
                        {/* 1. Action Buttons */}
                        <div className="flex items-center gap-3">
                            <NotificationDropdown />
                        </div>

                        {/* Divider */}
                        <div className="h-8 w-px bg-gray-200"></div>

                        {/* 2. Profile Dropdown (Classic Layout) */}
                        <div className="relative">
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <span className="inline-flex rounded-md">
                                        <button type="button" className="inline-flex items-center gap-3 px-1 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-transparent hover:text-gray-700 focus:outline-none transition ease-in-out duration-150">
                                            <div className="text-right hidden sm:block">
                                                <p className="text-sm font-bold text-gray-900">{auth.user.shop_name || auth.user.name}</p>
                                                <p className="text-[10px] text-gray-500">Seller Account</p>
                                            </div>
                                            <div className="w-9 h-9 rounded-full bg-clay-100 flex items-center justify-center text-clay-700 font-bold border border-clay-200 uppercase overflow-hidden">
                                                {auth.user.avatar ? (
                                                    <img 
                                                        src={auth.user.avatar.startsWith('http') ? auth.user.avatar : `/storage/${auth.user.avatar}`} 
                                                        alt={auth.user.name} 
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    (auth.user.shop_name || auth.user.name).charAt(0)
                                                )}
                                            </div>
                                            <ChevronDown size={16} className="text-gray-400" />
                                        </button>
                                    </span>
                                </Dropdown.Trigger>

                                <Dropdown.Content>
                                    <Dropdown.Link href={route('profile.edit')} className="flex items-center gap-2">
                                        <User size={16} /> Profile
                                    </Dropdown.Link>
                                    <Dropdown.Link href={route('logout')} method="post" as="button" className="flex items-center gap-2 text-red-600 hover:text-red-700">
                                        <LogOut size={16} /> Log Out
                                    </Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-6 overflow-y-auto space-y-6">
                    
                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Overall Rating Card */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Shop Rating</h3>
                            <h1 className="text-6xl font-black text-gray-900 mb-4">{stats.average ? stats.average.toFixed(1) : '0.0'}</h1>
                            <div className="flex items-center gap-1 mb-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star 
                                        key={star} 
                                        size={24} 
                                        className={star <= Math.round(stats.average || 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} 
                                    />
                                ))}
                            </div>
                            <p className="text-sm text-gray-500 font-medium">Based on {stats.total || 0} reviews</p>
                        </div>

                        {/* Breakdown Progress Bars */}
                        <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
                            <h3 className="text-lg font-bold text-gray-900 mb-6">Rating Distribution</h3>
                            <div className="space-y-4">
                                {[5, 4, 3, 2, 1].map((star) => {
                                    const count = stats.stars ? stats.stars[star] : 0;
                                    const percentage = (stats.total > 0) ? ((count || 0) / stats.total) * 100 : 0;
                                    return (
                                        <div key={star} className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setFilter(star.toString())}>
                                            <div className="flex items-center justify-end gap-1 w-12">
                                                <span className="text-sm font-bold text-gray-700">{star}</span>
                                                <Star size={14} className="fill-amber-400 text-amber-400" />
                                            </div>
                                            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-amber-400 rounded-full" 
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                            <span className="text-sm font-medium text-gray-500 w-12 text-right">{count || 0}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Filters & List */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
                        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Recent Customer Reviews</h3>
                                <p className="text-sm text-gray-500">Read what your customers are saying</p>
                            </div>
                            
                            <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto">
                                {['All', '5', '4', '3', '2', '1'].map((option) => (
                                    <button
                                        key={option}
                                        onClick={() => setFilter(option)}
                                        className={`px-4 py-1.5 whitespace-nowrap rounded-md text-xs font-bold transition-all ${
                                            filter === option 
                                                ? 'bg-white text-clay-900 shadow-sm' 
                                                : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        {option === 'All' ? 'All Reviews' : `${option} Star`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="divide-y divide-gray-50">
                            {filteredReviews.length > 0 ? (
                                filteredReviews.map((review) => (
                                    <div key={review.id} className="p-6 hover:bg-gray-50/50 transition-colors">
                                        <div className="flex flex-col sm:flex-row gap-6">
                                            {/* Product Image */}
                                            <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gray-100 overflow-hidden border border-gray-200">
                                                {review.product_image ? (
                                                    <img 
                                                        src={review.product_image.startsWith('http') || review.product_image.startsWith('/storage') ? review.product_image : `/storage/${review.product_image}`} 
                                                        alt={review.product_name} 
                                                        className="w-full h-full object-cover" 
                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                        <ImageIcon size={24} />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                                                    <div>
                                                        <h4 className="font-bold text-gray-900">{review.customer}</h4>
                                                        <p className="text-sm text-gray-500">Purchased: <span className="font-medium text-gray-700">{review.product_name}</span></p>
                                                    </div>
                                                    <span className="text-xs font-medium text-gray-400">{review.date}</span>
                                                </div>

                                                <div className="flex items-center gap-1 mb-3">
                                                    {[1, 2, 3, 4, 5].map((s) => (
                                                        <Star 
                                                            key={s} 
                                                            size={14} 
                                                            className={s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}
                                                        />
                                                    ))}
                                                </div>

                                                {review.comment && (
                                                    <p className="text-gray-700 leading-relaxed text-sm mb-4">
                                                        {review.comment}
                                                    </p>
                                                )}

                                                {review.photos && review.photos.length > 0 && (
                                                    <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                                                        {review.photos.map((photo, idx) => (
                                                            <div key={idx} className="w-20 h-20 rounded-xl overflow-hidden border border-gray-200 shrink-0">
                                                                <img 
                                                                    src={photo.startsWith('http') ? photo : `/storage/${photo}`} 
                                                                    alt={`Review photo ${idx + 1}`} 
                                                                    className="w-full h-full object-cover cursor-pointer hover:opacity-90"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-12 text-center flex flex-col items-center justify-center">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                                        <MessageSquare size={24} className="text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">No reviews found</h3>
                                    <p className="text-gray-500">There are no reviews matching your current filter.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
