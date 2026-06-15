import React, { useMemo, useState, useEffect } from 'react';
import { Star, Image as ImageIcon, ShieldAlert, Pin, PinOff, Edit2, Trash2, AlertCircle, Reply, Zap, Send } from 'lucide-react';
import Dropdown from '@/Components/Dropdown';
import UserAvatar from '@/Components/UserAvatar';
import RichTextEditor from '@/Components/Seller/Chat/RichTextEditor';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import { moderationStatusLabel, moderationOutcomeLabel, moderationOutcomeTone } from '@/utils/reviewHelpers';

export default function ReviewListItem({
    review,
    auth,
    canEditReviews,
    replyingTo,
    replyText,
    setReplyText,
    openReply,
    openEditReply,
    onCancelReply,
    onSubmitReply,
    onTogglePin,
    onQuickReply,
    onOpenDispute,
    onConfirmDeleteDispute,
    onConfirmDeleteReply,
    quickReplies
}) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const plainTextLength = useMemo(() => {
        return replyText 
            ? replyText.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim().length 
            : 0;
    }, [replyText]);

    return (
        <div className={`p-4 sm:p-5 hover:bg-stone-50/50 transition-colors ${review.is_pinned ? 'bg-amber-50/30 border-l-4 border-amber-400' : ''} md:border md:border-stone-200 md:rounded-2xl md:bg-white md:shadow-sm lg:border-0 lg:rounded-none lg:bg-transparent lg:shadow-none`}>
            {/* Pinned Badge */}
            {review.is_pinned && (
                <div className="flex items-center gap-1.5 mb-2">
                    <Pin size={10} className="text-amber-500 fill-amber-500" />
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Pinned Review</span>
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
                {/* Product Image */}
                <div className="shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-stone-100 overflow-hidden border border-stone-200">
                    {review.product_image ? (
                        <img
                            src={review.product_image.startsWith('http') || review.product_image.startsWith('/storage') ? review.product_image : `/storage/${review.product_image}`}
                            alt={review.product_name}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-400">
                            <ImageIcon size={18} />
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 mb-1.5">
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <h4 className="font-bold text-sm text-stone-900">{review.customer}</h4>
                                <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <Star
                                            key={s}
                                            size={12}
                                            className={s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-200'}
                                        />
                                    ))}
                                </div>
                            </div>
                            <p className="text-[11px] text-stone-500">Item: <span className="font-medium text-stone-700">{review.product_name}</span></p>
                        </div>
                        
                        {/* Actions buttons */}
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-medium text-stone-400">{review.date}</span>
                            {!review.dispute && (
                                <button
                                    type="button"
                                    disabled={!canEditReviews}
                                    onClick={() => canEditReviews && onOpenDispute(review)}
                                    className="rounded-xl border border-rose-100 bg-rose-50 p-2.5 sm:p-1.5 text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                    title="Request moderation"
                                >
                                    <ShieldAlert size={14} />
                                </button>
                            )}
                            {/* Pin Button */}
                            <button
                                disabled={!canEditReviews || review.is_hidden_from_marketplace}
                                onClick={() => onTogglePin(review.id)}
                                className={`p-2.5 sm:p-1.5 rounded-xl transition-all disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center ${review.is_pinned ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'text-stone-400 hover:text-amber-500 hover:bg-amber-50'}`}
                                title={review.is_hidden_from_marketplace ? 'Hidden reviews cannot be pinned' : review.is_pinned ? 'Unpin review' : 'Pin to top'}
                            >
                                {review.is_pinned ? <PinOff size={14} /> : <Pin size={14} />}
                            </button>
                        </div>
                    </div>

                    {review.comment && (
                        <p className="text-stone-700 leading-snug text-sm mb-3 mt-2">
                            {review.comment}
                        </p>
                    )}

                    {review.dispute && (
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                                <ShieldAlert size={12} />
                                {moderationStatusLabel(review.dispute.status)}
                            </div>
                            <div className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${moderationOutcomeTone(review.dispute)}`}>
                                {moderationOutcomeLabel(review.dispute)}
                            </div>
                            {['pending', 'under_review'].includes(review.dispute.status) && (
                                <>
                                    <button
                                        type="button"
                                        disabled={!canEditReviews}
                                        onClick={() => canEditReviews && onOpenDispute(review, 'edit')}
                                        className="inline-flex items-center justify-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-stone-600 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] sm:min-h-0"
                                    >
                                        <Edit2 size={11} />
                                        Edit Request
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!canEditReviews}
                                        onClick={() => canEditReviews && onConfirmDeleteDispute(review.dispute)}
                                        className="inline-flex items-center justify-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] sm:min-h-0"
                                    >
                                        <Trash2 size={11} />
                                        Remove Request
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {!review.dispute && review.is_hidden_from_marketplace && (
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-700">
                                <AlertCircle size={12} />
                                Hidden from marketplace
                            </div>
                        </div>
                    )}

                    {review.photos && review.photos.length > 0 && (
                        <div className="flex gap-2 mt-2 mb-3 overflow-x-auto pb-1 flex-nowrap">
                            {review.photos.map((photo, idx) => (
                                <div key={idx} className="w-16 h-16 rounded-lg overflow-hidden border border-stone-200 shrink-0">
                                    <img
                                        src={photo.startsWith('http') ? photo : `/storage/${photo}`}
                                        alt={`Review photo ${idx + 1}`}
                                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 animate-page-enter"
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Existing Seller Reply */}
                    {review.seller_reply && replyingTo !== review.id && (
                        <div className="mt-2 p-3 bg-clay-50/70 border border-clay-100 rounded-xl relative group">
                            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    disabled={!canEditReviews} 
                                    onClick={() => canEditReviews && openEditReply(review.id, review.seller_reply)} 
                                    className="p-1 text-stone-400 hover:text-clay-600 hover:bg-white rounded pl-1.5 pr-1.5 transition border border-transparent hover:border-stone-200 shadow-sm text-xs flex items-center gap-1 disabled:cursor-not-allowed disabled:opacity-50 min-h-[32px] sm:min-h-0" 
                                    title="Edit Reply"
                                >
                                    <Edit2 size={12} /> Edit
                                </button>
                                <button 
                                    disabled={!canEditReviews} 
                                    onClick={() => canEditReviews && onConfirmDeleteReply(review.id)} 
                                    className="p-1 text-stone-400 hover:text-rose-600 hover:bg-white rounded pl-1.5 pr-1.5 transition border border-transparent hover:border-rose-100 shadow-sm text-xs flex items-center gap-1 disabled:cursor-not-allowed disabled:opacity-50 min-h-[32px] sm:min-h-0" 
                                    title="Delete Reply"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                            <div className="flex items-center gap-2 mb-2 pr-16">
                                <UserAvatar user={auth.user} className="w-5 h-5 shadow-sm" />
                                <span className="text-[11px] font-bold text-stone-900">{auth.user.shop_name || auth.user.name}</span>
                                <span className="text-[9px] font-bold tracking-wider uppercase text-clay-600 bg-clay-100/50 px-1 py-0.5 rounded border border-clay-200/50">Seller Reply</span>
                            </div>
                            <div className="text-[13px] text-stone-700 leading-snug prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: review.seller_reply }} />
                        </div>
                    )}

                    {/* Reply Action Triggers */}
                    {!review.seller_reply && replyingTo !== review.id && (
                        <div className="mt-3 flex items-center gap-2">
                            <button
                                disabled={!canEditReviews}
                                onClick={() => canEditReviews && openReply(review.id)}
                                className="flex items-center justify-center gap-1 px-4 py-2 sm:px-3 sm:py-1.5 text-xs font-bold text-stone-700 bg-white border border-stone-200 rounded-lg hover:border-stone-300 hover:bg-stone-50 transition shadow-sm disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] sm:min-h-0"
                            >
                                <Reply size={13} className="text-stone-500" /> Reply
                            </button>
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <button
                                        type="button"
                                        disabled={!canEditReviews}
                                        className="flex items-center justify-center gap-1 px-4 py-2 sm:px-3 sm:py-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition shadow-sm disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] sm:min-h-0"
                                        title="Choose a quick reply"
                                    >
                                        <Zap size={13} className="text-amber-500 fill-amber-500" /> Quick Reply
                                    </button>
                                </Dropdown.Trigger>
                                <Dropdown.Content align="top-left" width="custom" noStyle={true} contentClasses="sm:w-[350px] w-64 flex flex-col gap-1.5 pb-2">
                                    {quickReplies.map((qs, idx) => (
                                        <button
                                            key={idx}
                                            disabled={!canEditReviews}
                                            onClick={() => onQuickReply(review.id, qs)}
                                            className="px-3 py-2 bg-white border border-stone-200 rounded-lg shadow-sm text-xs text-left font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition-all leading-snug disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] sm:min-h-0"
                                        >
                                            {qs}
                                        </button>
                                    ))}
                                </Dropdown.Content>
                            </Dropdown>
                        </div>
                    )}

                    {/* Reply Editor (Inline Desktop view) */}
                    {replyingTo === review.id && !isMobile && (
                        <div id={`reply-form-${review.id}`} className="mt-3 space-y-2 pb-[64px] sm:pb-0">
                            <RichTextEditor
                                value={replyText}
                                onChange={setReplyText}
                                placeholder="Write your reply..."
                            />
                            
                            {/* Desktop static bottom actions */}
                            <div className="flex items-center justify-between gap-4 pt-1 sm:static fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-stone-200 px-4 py-3 sm:bg-transparent sm:border-0 sm:p-0 z-40">
                                <span className={`text-[10px] font-bold ${plainTextLength > 500 ? 'text-rose-500' : 'text-stone-400'}`}>
                                    {plainTextLength} / 500
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={onCancelReply}
                                        className="px-4 py-2 sm:px-3 sm:py-1.5 text-xs font-bold text-stone-500 border border-stone-200 rounded-xl hover:bg-stone-50 transition min-h-[44px] sm:min-h-0"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => onSubmitReply(review.id)}
                                        disabled={!replyText.trim() || plainTextLength > 500 || !canEditReviews}
                                        className="flex items-center gap-1.5 px-4 py-2 sm:px-3 sm:py-1.5 text-xs font-bold text-white bg-clay-600 rounded-xl hover:bg-clay-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] sm:min-h-0"
                                    >
                                        <Send size={12} /> Post Reply
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Reply Editor (Mobile / Tablet SlideOverDrawer view) */}
                    {replyingTo === review.id && isMobile && (
                        <SlideOverDrawer
                            show={replyingTo === review.id}
                            onClose={onCancelReply}
                            title={`Reply to ${review.customer}`}
                            widthClass="max-w-md"
                        >
                            <div className="space-y-4 pt-2">
                                <div className="rounded-xl bg-stone-50 p-3.5 border border-stone-200">
                                    <p className="text-xs text-stone-500 font-bold uppercase tracking-wider mb-1">Customer Review</p>
                                    <p className="text-sm text-stone-800 leading-snug italic">"{review.comment}"</p>
                                </div>
                                <RichTextEditor
                                    value={replyText}
                                    onChange={setReplyText}
                                    placeholder="Write your reply..."
                                />
                                <div className="flex items-center justify-between gap-4 pt-4">
                                    <span className={`text-[10px] font-bold ${plainTextLength > 500 ? 'text-rose-500' : 'text-stone-400'}`}>
                                        {plainTextLength} / 500
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={onCancelReply}
                                            className="px-4 py-2.5 text-xs font-bold text-stone-500 border border-stone-200 rounded-xl hover:bg-stone-50 transition min-h-[44px]"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => onSubmitReply(review.id)}
                                            disabled={!replyText.trim() || plainTextLength > 500 || !canEditReviews}
                                            className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-clay-600 rounded-xl hover:bg-clay-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                                        >
                                            <Send size={12} /> Post Reply
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </SlideOverDrawer>
                    )}
                </div>
            </div>
        </div>
    );
}
