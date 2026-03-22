import React, { useState, useRef } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import SellerSidebar from '@/Components/SellerSidebar';
import Dropdown from '@/Components/Dropdown';
import NotificationDropdown from '@/Components/NotificationDropdown'; 
import Modal from '@/Components/Modal';
import { 
    Star, MessageSquare, Image as ImageIcon, Search, Filter, Pin, PinOff,
    Menu, ChevronDown, User, LogOut, Send, Bold, Italic, X,
    CheckCircle, AlertCircle, Edit2, Trash2, Zap, Reply
} from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceAccountSummary from '@/Components/WorkspaceAccountSummary';

// --- Simple Rich Text Toolbar ---
const RichTextEditor = ({ value, onChange, placeholder }) => {
    const editorRef = useRef(null);

    React.useEffect(() => {
        if (editorRef.current && value !== editorRef.current.innerHTML) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    const exec = (cmd, val = null) => {
        document.execCommand(cmd, false, val);
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-clay-200 focus-within:border-clay-400 transition-all">
            <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 border-b border-gray-200">
                <button type="button" onClick={() => exec('bold')} className="p-1.5 rounded-md hover:bg-gray-200 text-gray-600 transition" title="Bold">
                    <Bold size={14} />
                </button>
                <button type="button" onClick={() => exec('italic')} className="p-1.5 rounded-md hover:bg-gray-200 text-gray-600 transition" title="Italic">
                    <Italic size={14} />
                </button>
            </div>
            <div
                ref={editorRef}
                contentEditable
                className="min-h-[80px] max-h-[200px] overflow-y-auto p-3 text-sm text-gray-700 focus:outline-none"
                onInput={() => onChange(editorRef.current?.innerHTML || '')}
                data-placeholder={placeholder}
                suppressContentEditableWarning
            />
        </div>
    );
};

export default function Reviews({ auth, reviews, stats, flash }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [filter, setFilter] = useState('All');
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('success');
    const [confirmingDelete, setConfirmingDelete] = useState(null);

    React.useEffect(() => {
        if (flash?.success) {
            setToastType('success');
            setToastMessage(flash.success);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        }
        if (flash?.error) {
            setToastType('error');
            setToastMessage(flash.error);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 5000);
        }
    }, [flash]);

    const QUICK_REPLIES = [
        "Thank you for your purchase and your kind words! We truly appreciate your support and hope to serve you again.",
        "We are thrilled to hear that you are satisfied with your order! Please don't hesitate to reach out if you need anything else.",
        "Thank you for sharing your feedback. We are always striving to improve and your input is incredibly valuable to us."
    ];

    const filteredReviews = filter === 'All' 
        ? reviews 
        : reviews.filter(r => r.rating === parseInt(filter));

    // Sort: pinned first, then by date (already sorted by latest from backend)
    const sortedReviews = [...filteredReviews].sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return 0;
    });

    const openReply = (reviewId) => {
        setReplyingTo(reviewId);
        setReplyText('');
        setTimeout(() => {
            const formElement = document.getElementById(`reply-form-${reviewId}`);
            if (formElement) {
                formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 50);
    };

    const openEditReply = (reviewId, text) => {
        setReplyingTo(reviewId);
        setReplyText(text);
        setTimeout(() => {
            const formElement = document.getElementById(`reply-form-${reviewId}`);
            if (formElement) {
                formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 50);
    };

    const submitReply = (reviewId) => {
        if (!replyText.trim()) return;
        router.post(route('reviews.reply', reviewId), { seller_reply: replyText }, {
            preserveScroll: true,
            onSuccess: () => {
                setReplyingTo(null);
                setReplyText('');
            }
        });
    };

    const togglePin = (reviewId) => {
        router.post(route('reviews.toggle-pin', reviewId), {}, { preserveScroll: true });
    };

    const handleQuickReply = (reviewId, text) => {
        router.post(route('reviews.reply', reviewId), { seller_reply: text }, {
            preserveScroll: true,
        });
    };

    const deleteReply = () => {
        if (confirmingDelete) {
            router.delete(route('reviews.destroy-reply', confirmingDelete), {
                preserveScroll: true,
                onSuccess: () => setConfirmingDelete(null),
            });
        }
    };

    const plainTextLength = replyText ? replyText.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim().length : 0;

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
                
                {/* --- HEADER --- */}
                <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-40">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-clay-600">
                            <Menu size={24} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Customer Ratings</h1>
                            <p className="text-xs text-gray-500 font-medium mt-0.5 hidden sm:block">Shop quality feedback & reviews</p>
                        </div>
                    </div>

                                        
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <NotificationDropdown />
                        </div>
                        <div className="h-8 w-px bg-gray-200"></div>
                        <div className="relative">
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <span className="inline-flex rounded-md">
                                        <button type="button" className="inline-flex items-center gap-3 px-1 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-transparent hover:text-gray-700 focus:outline-none transition ease-in-out duration-150">
                                            <WorkspaceAccountSummary user={auth.user} />
                                            <UserAvatar user={auth.user} />
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Shop Rating</h3>
                            <h1 className="text-5xl font-black text-gray-900 mb-3">{stats.average ? stats.average.toFixed(1) : '0.0'}</h1>
                            <div className="flex items-center gap-0.5 mb-1.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star 
                                        key={star} 
                                        size={20} 
                                        className={star <= Math.round(stats.average || 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} 
                                    />
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 font-medium">Based on {stats.total || 0} reviews</p>
                        </div>

                        <div className="md:col-span-2 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
                            <h3 className="text-base font-bold text-gray-900 mb-4">Rating Distribution</h3>
                            <div className="space-y-3">
                                {[5, 4, 3, 2, 1].map((star) => {
                                    const count = stats.stars ? stats.stars[star] : 0;
                                    const percentage = (stats.total > 0) ? ((count || 0) / stats.total) * 100 : 0;
                                    return (
                                        <div key={star} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setFilter(star.toString())}>
                                            <div className="flex items-center justify-end gap-1 w-10">
                                                <span className="text-xs font-bold text-gray-700">{star}</span>
                                                <Star size={12} className="fill-amber-400 text-amber-400" />
                                            </div>
                                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-amber-400 rounded-full" 
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-medium text-gray-500 w-10 text-right">{count || 0}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Reviews List */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mt-4 relative z-10">
                        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Recent Customer Reviews</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Read what your customers are saying</p>
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
                            {sortedReviews.length > 0 ? (
                                sortedReviews.map((review, index) => (
                                    <div key={review.id} className={`p-4 sm:p-5 hover:bg-gray-50/50 transition-colors ${review.is_pinned ? 'bg-amber-50/30 border-l-4 border-amber-400' : ''} ${index === sortedReviews.length - 1 ? 'rounded-b-2xl' : ''}`}>
                                        
                                        {/* Pinned Badge */}
                                        {review.is_pinned && (
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <Pin size={10} className="text-amber-500 fill-amber-500" />
                                                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Pinned Focus</span>
                                            </div>
                                        )}

                                        <div className="flex flex-col sm:flex-row gap-4">
                                            {/* Product Image */}
                                            <div className="shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-gray-100 overflow-hidden border border-gray-200">
                                                {review.product_image ? (
                                                    <img 
                                                        src={review.product_image.startsWith('http') || review.product_image.startsWith('/storage') ? review.product_image : `/storage/${review.product_image}`} 
                                                        alt={review.product_name} 
                                                        className="w-full h-full object-cover" 
                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                        <ImageIcon size={18} />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 mb-1.5">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <h4 className="font-bold text-sm text-gray-900">{review.customer}</h4>
                                                            <div className="flex items-center gap-0.5">
                                                                {[1, 2, 3, 4, 5].map((s) => (
                                                                    <Star 
                                                                        key={s} 
                                                                        size={12} 
                                                                        className={s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <p className="text-[11px] text-gray-500">Item: <span className="font-medium text-gray-700">{review.product_name}</span></p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[11px] font-medium text-gray-400">{review.date}</span>
                                                        {/* Pin Button */}
                                                        <button
                                                            onClick={() => togglePin(review.id)}
                                                            className={`p-1.5 rounded-lg transition-all ${review.is_pinned ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'}`}
                                                            title={review.is_pinned ? 'Unpin review' : 'Pin to top'}
                                                        >
                                                            {review.is_pinned ? <PinOff size={12} /> : <Pin size={12} />}
                                                        </button>
                                                    </div>
                                                </div>

                                                {review.comment && (
                                                    <p className="text-gray-700 leading-snug text-sm mb-3 mt-2">
                                                        {review.comment}
                                                    </p>
                                                )}

                                                {review.photos && review.photos.length > 0 && (
                                                    <div className="flex gap-2 mt-2 mb-3 overflow-x-auto pb-1">
                                                        {review.photos.map((photo, idx) => (
                                                            <div key={idx} className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                                                                <img 
                                                                    src={photo.startsWith('http') ? photo : `/storage/${photo}`} 
                                                                    alt={`Review photo ${idx + 1}`} 
                                                                    className="w-full h-full object-cover cursor-pointer hover:opacity-90"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Existing Seller Reply */}
                                                {review.seller_reply && replyingTo !== review.id && (
                                                    <div className="mt-2 p-3 bg-clay-50/70 border border-clay-100 rounded-xl relative group">
                                                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => openEditReply(review.id, review.seller_reply)} className="p-1 text-gray-400 hover:text-clay-600 hover:bg-white rounded pl-1.5 pr-1.5 transition border border-transparent hover:border-gray-200 shadow-sm text-xs flex items-center gap-1" title="Edit Reply">
                                                                <Edit2 size={12} /> Edit
                                                            </button>
                                                            <button onClick={() => setConfirmingDelete(review.id)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-white rounded pl-1.5 pr-1.5 transition border border-transparent hover:border-red-100 shadow-sm text-xs flex items-center gap-1" title="Delete Reply">
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                        <div className="flex items-center gap-2 mb-2 pr-16">
                                                            <UserAvatar user={auth.user} className="w-5 h-5 shadow-sm" />
                                                            <span className="text-[11px] font-bold text-gray-900">{auth.user.shop_name || auth.user.name}</span>
                                                            <span className="text-[9px] font-bold tracking-wider uppercase text-clay-600 bg-clay-100/50 px-1 py-0.5 rounded border border-clay-200/50">Seller Reply</span>
                                                        </div>
                                                        <div className="text-[13px] text-gray-700 leading-snug prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: review.seller_reply }} />
                                                    </div>
                                                )}

                                                {/* Reply Actions */}
                                                {!review.seller_reply && replyingTo !== review.id && (
                                                    <div className="mt-3 flex items-center gap-2">
                                                        <button
                                                            onClick={() => openReply(review.id)}
                                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition shadow-sm"
                                                        >
                                                            <Reply size={13} className="text-gray-500" /> Reply
                                                        </button>
                                                        <Dropdown>
                                                            <Dropdown.Trigger>
                                                                <button
                                                                    type="button"
                                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition shadow-sm"
                                                                    title="Choose a quick reply"
                                                                >
                                                                    <Zap size={13} className="text-amber-500 fill-amber-500" /> Quick Reply
                                                                </button>
                                                            </Dropdown.Trigger>
                                                            <Dropdown.Content align="top-left" width="custom" noStyle={true} contentClasses="sm:w-[350px] w-64 flex flex-col gap-1.5 pb-2">
                                                                {QUICK_REPLIES.map((qs, idx) => (
                                                                    <button
                                                                        key={idx}
                                                                        onClick={() => handleQuickReply(review.id, qs)}
                                                                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm text-xs text-left font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all leading-snug"
                                                                    >
                                                                        {qs}
                                                                    </button>
                                                                ))}
                                                            </Dropdown.Content>
                                                        </Dropdown>
                                                    </div>
                                                )}

                                                {/* Reply Editor */}
                                                {replyingTo === review.id && (
                                                    <div id={`reply-form-${review.id}`} className="mt-3 space-y-2">
                                                        <RichTextEditor 
                                                            value={replyText} 
                                                            onChange={setReplyText} 
                                                            placeholder="Write your reply..."
                                                        />
                                                        <div className="flex items-center justify-between gap-4 pt-1">
                                                            <span className={`text-[10px] font-bold ${plainTextLength > 500 ? 'text-red-500' : 'text-gray-400'}`}>
                                                                {plainTextLength} / 500
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => { setReplyingTo(null); setReplyText(''); }}
                                                                    className="px-3 py-1.5 text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    onClick={() => submitReply(review.id)}
                                                                    disabled={!replyText.trim() || plainTextLength > 500}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-clay-600 rounded-lg hover:bg-clay-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    <Send size={12} /> Post Reply
                                                                </button>
                                                            </div>
                                                        </div>
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

            <Modal show={confirmingDelete !== null} onClose={() => setConfirmingDelete(null)} maxWidth="sm">
                <div className="p-6">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4 mx-auto">
                        <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 text-center mb-2">Delete Reply?</h2>
                    <p className="text-sm text-gray-500 text-center mb-6">
                        Are you sure you want to delete your reply? This action cannot be undone.
                    </p>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm rounded-xl transition"
                            onClick={() => setConfirmingDelete(null)}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition shadow-md shadow-red-500/20"
                            onClick={deleteReply}
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </Modal>

            {/* --- TOAST --- */}
            <div className={`fixed bottom-6 right-6 z-[100] transition-all duration-500 transform ${showToast ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border ${toastType === 'success' ? 'bg-white border-green-100' : 'bg-white border-red-100'}`}>
                    <div className={`p-2 rounded-full ${toastType === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {toastType === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    </div>
                    <div>
                        <h4 className={`text-sm font-bold ${toastType === 'success' ? 'text-green-900' : 'text-red-900'}`}>
                            {toastType === 'success' ? 'Success' : 'Error'}
                        </h4>
                        <p className="text-xs text-gray-500">{toastMessage}</p>
                    </div>
                    <button onClick={() => setShowToast(false)} className="ml-2 text-gray-400 hover:text-gray-600"><X size={14} /></button>
                </div>
            </div>
        </div>
    );
}

