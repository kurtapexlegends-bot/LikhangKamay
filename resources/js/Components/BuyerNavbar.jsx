import React, { useState } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import Dropdown from '@/Components/Dropdown'; 
import { 
    MessageCircle, ChevronDown, ShoppingBag, 
    Search, ShoppingCart, User, LogOut 
} from 'lucide-react';

export default function BuyerNavbar() {
    const { auth, cartCount } = usePage().props;
    const user = auth?.user;

    const params = new URLSearchParams(window.location.search);
    const [term, setTerm] = useState(params.get('search') || '');

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('shop.index'), { search: term }, { preserveState: true });
    };

    return (
        <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20 gap-8">
                    
                    {/* LOGO */}
                    <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
                        <img src="/images/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
                        <div className="flex flex-col">
                            <span className="font-serif text-xl font-bold text-gray-900 leading-none tracking-tight">LikhangKamay</span>
                            <span className="text-[10px] text-clay-600 font-bold tracking-widest uppercase mt-0.5">Artisan Marketplace</span>
                        </div>
                    </Link>

                    {/* SEARCH */}
                    <div className="flex-1 max-w-3xl hidden md:block">
                        <form onSubmit={handleSearch} className="relative group">
                            <input 
                                type="text" 
                                placeholder="Search pottery, vases, artisans..." 
                                className="w-full pl-12 pr-32 py-3 bg-gray-50 border border-gray-200 rounded-full text-sm focus:bg-white focus:border-clay-300 focus:ring-4 focus:ring-clay-100/50 transition-all shadow-sm placeholder-gray-400 text-gray-800"
                                value={term}
                                onChange={(e) => setTerm(e.target.value)}
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-clay-600 transition-colors" size={20} />
                            <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-clay-600 text-white px-6 py-2 rounded-full text-xs font-bold hover:bg-clay-700 hover:shadow-md transition-all active:scale-95">
                                Search
                            </button>
                        </form>
                    </div>

                    {/* ACTIONS */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                        {user ? (
                            <>
                                <Link href={route('buyer.chat')} className="p-2.5 text-gray-400 hover:text-clay-600 hover:bg-clay-50 rounded-full transition relative group">
                                    <MessageCircle size={22} className="group-hover:scale-110 transition-transform" />
                                </Link>

                                {/* FIX: Changed <button> to <Link> pointing to cart.index */}
                                <Link 
                                    href={route('cart.index')} 
                                    className="p-2.5 text-gray-400 hover:text-clay-600 hover:bg-clay-50 rounded-full transition relative group"
                                >
                                    <ShoppingCart size={22} className="group-hover:scale-110 transition-transform" />
                                    {cartCount > 0 && (
                                        <span className="absolute top-0 right-0 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                                            {cartCount}
                                        </span>
                                    )}
                                </Link>

                                <div className="h-8 w-px bg-gray-200 mx-1"></div>

                                <div className="relative">
                                    <Dropdown>
                                        <Dropdown.Trigger>
                                            <button className="flex items-center gap-3 pl-1 pr-2 py-1 rounded-full hover:bg-gray-50 transition border border-transparent hover:border-gray-200 group">
                                                {user.avatar ? (
                                                    <img 
                                                        src={user.avatar.startsWith('http') ? user.avatar : `/storage/${user.avatar}`} 
                                                        alt={user.name} 
                                                        className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm group-hover:border-clay-200 transition-colors"
                                                    />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-full bg-clay-100 flex items-center justify-center text-clay-700 font-bold border-2 border-white shadow-sm uppercase group-hover:border-clay-200 transition-colors">
                                                        {(user.shop_name || user.name).charAt(0)}
                                                    </div>
                                                )}
                                                <div className="text-left hidden sm:block">
                                                    <p className="text-sm font-bold text-gray-900 leading-none">{user.name}</p>
                                                </div>
                                                <ChevronDown size={16} className="text-gray-400 group-hover:text-clay-600" />
                                            </button>
                                        </Dropdown.Trigger>
                                        <Dropdown.Content width="56">
                                            <div className="px-4 py-3 border-b border-gray-100 mb-1 bg-gray-50/50">
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Signed in as</p>
                                                <p className="text-sm font-bold text-gray-900 truncate">{user.email}</p>
                                            </div>
                                            <Dropdown.Link href={route('profile.edit')}><User size={16} className="inline mr-2"/> Profile Settings</Dropdown.Link>
                                            <Dropdown.Link href={route('my-orders.index')}><ShoppingBag size={16} className="inline mr-2"/> My Purchases</Dropdown.Link>
                                            
                                            {/* SELLER LINK */}
                                            {user.role === 'artisan' && (
                                                <Dropdown.Link href={route('dashboard')} className="text-clay-600 font-bold bg-clay-50/50">
                                                    <span className="flex items-center">
                                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                        Seller Dashboard
                                                    </span>
                                                </Dropdown.Link>
                                            )}
                                            <div className="border-t border-gray-100 my-1"></div>
                                            <Dropdown.Link href={route('logout')} method="post" as="button" className="text-red-600 hover:bg-red-50"><LogOut size={16} className="inline mr-2"/> Log Out</Dropdown.Link>
                                        </Dropdown.Content>
                                    </Dropdown>
                                </div>
                            </>
                        ) : (
                            <div className="flex gap-2">
                                <Link href={route('login')} className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-clay-600">Log In</Link>
                                <Link href={route('register')} className="px-4 py-2 bg-clay-600 text-white rounded-full text-sm font-bold hover:bg-clay-700">Sign Up</Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}