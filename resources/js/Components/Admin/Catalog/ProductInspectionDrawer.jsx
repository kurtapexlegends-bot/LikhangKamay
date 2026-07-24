import React, { useState } from 'react';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import { 
    CheckCircle2, 
    XCircle, 
    ShieldAlert, 
    Clock, 
    Package, 
    DollarSign, 
    Box, 
    Tag, 
    User, 
    Sparkles, 
    Calendar,
    Flame,
    FileText,
    Check,
    Rotate3d,
    Image as ImageIcon
} from 'lucide-react';
import GLTFModel from '@/Components/ThreeD/GLTFModel';
import ProductViewer3D from '@/Components/ThreeD/ProductViewer3D';

export default function ProductInspectionDrawer({
    isOpen,
    product,
    onClose,
    onApprove,
    onReject,
    onFlag,
    isProcessing = false
}) {
    const [viewingMode, setViewingMode] = useState('image'); // 'image' | '3d'
    const [selectedImage, setSelectedImage] = useState(null);
    const [feedback, setFeedback] = useState('');
    const [actionError, setActionError] = useState('');

    if (!product) return null;

    const coverUrl = product.img || (product.cover_photo_path?.startsWith('http')
        ? product.cover_photo_path
        : (product.cover_photo_path ? `/storage/${product.cover_photo_path}` : '/images/placeholder.svg'));

    const galleryUrls = (product.gallery_paths || []).map(path => 
        path?.startsWith('http') ? path : `/storage/${path}`
    );

    const activeImageUrl = selectedImage || coverUrl;

    const handleApprove = () => {
        setActionError('');
        onApprove(product.id);
    };

    const handleReject = () => {
        if (!feedback.trim()) {
            setActionError('Please provide a rejection reason so the seller can revise their listing.');
            return;
        }
        setActionError('');
        onReject(product.id, feedback.trim());
    };

    const handleFlag = () => {
        if (!feedback.trim()) {
            setActionError('Please provide a compliance reason for flagging this listing.');
            return;
        }
        setActionError('');
        onFlag(product.id, feedback.trim());
    };

    const renderFooter = () => (
        <div className="flex items-center justify-between gap-3 w-full">
            <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 text-xs font-bold hover:bg-stone-50 active:scale-98 transition-all"
            >
                Close
            </button>

            <div className="flex items-center gap-2">
                {/* Status-aware contextual moderation controls */}
                {product.status === 'Active' && (
                    <button
                        type="button"
                        disabled={isProcessing}
                        onClick={handleFlag}
                        className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-600/10 hover:shadow-lg hover:shadow-amber-600/15 active:scale-95 disabled:opacity-50 transition-all"
                    >
                        <ShieldAlert size={15} /> Flag Listing
                    </button>
                )}

                {product.status === 'pending_review' && (
                    <>
                        <button
                            type="button"
                            disabled={isProcessing}
                            onClick={handleReject}
                            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-650/10 hover:shadow-lg hover:shadow-rose-650/15 active:scale-95 disabled:opacity-50 transition-all"
                        >
                            <XCircle size={15} /> Reject Listing
                        </button>
                        <button
                            type="button"
                            disabled={isProcessing}
                            onClick={handleApprove}
                            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-650/10 hover:shadow-lg hover:shadow-emerald-650/15 active:scale-95 disabled:opacity-50 transition-all"
                        >
                            <CheckCircle2 size={15} /> Approve Listing
                        </button>
                    </>
                )}

                {product.status === 'flagged' && (
                    <>
                        <button
                            type="button"
                            disabled={isProcessing}
                            onClick={handleReject}
                            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-650/10 hover:shadow-lg hover:shadow-rose-650/15 active:scale-95 disabled:opacity-50 transition-all"
                        >
                            <XCircle size={15} /> Reject Listing
                        </button>
                        <button
                            type="button"
                            disabled={isProcessing}
                            onClick={handleApprove}
                            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-650/10 hover:shadow-lg hover:shadow-emerald-650/15 active:scale-95 disabled:opacity-50 transition-all"
                        >
                            <CheckCircle2 size={15} /> Approve Listing
                        </button>
                    </>
                )}

                {product.status === 'rejected' && (
                    <>
                        <button
                            type="button"
                            disabled={isProcessing}
                            onClick={handleFlag}
                            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-600/10 hover:shadow-lg hover:shadow-amber-600/15 active:scale-95 disabled:opacity-50 transition-all"
                        >
                            <ShieldAlert size={15} /> Flag Listing
                        </button>
                        <button
                            type="button"
                            disabled={isProcessing}
                            onClick={handleApprove}
                            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-650/10 hover:shadow-lg hover:shadow-emerald-650/15 active:scale-95 disabled:opacity-50 transition-all"
                        >
                            <CheckCircle2 size={15} /> Approve Listing
                        </button>
                    </>
                )}
            </div>
        </div>
    );

    return (
        <SlideOverDrawer
            show={isOpen}
            onClose={onClose}
            title="Inspect Product Listing"
            widthClass="max-w-2xl"
            position="bottom"
            footer={renderFooter()}
        >
            <div className="space-y-6 pb-6">
                {/* Header Status & Artisan Summary */}
                <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-200/80">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-clay-50 border border-clay-100 flex items-center justify-center text-clay-700 font-bold">
                            {product.user?.shop_name?.charAt(0) || <User size={18} />}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-stone-900">{product.user?.shop_name || 'Individual Seller'}</p>
                            <p className="text-[11px] text-stone-500 font-medium">{product.user?.name} {product.user?.email ? `• ${product.user.email}` : ''}</p>
                        </div>
                    </div>

                    <div>
                        {product.status === 'Active' ? (
                            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200/60">
                                <CheckCircle2 size={14} /> Approved / Active
                            </span>
                        ) : product.status === 'pending_review' ? (
                            <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold border border-amber-200/60">
                                <Clock size={14} /> Pending Review
                            </span>
                        ) : product.status === 'rejected' ? (
                            <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1 rounded-full text-xs font-bold border border-red-200/60">
                                <XCircle size={14} /> Rejected
                            </span>
                        ) : product.status === 'flagged' ? (
                            <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 px-3 py-1 rounded-full text-xs font-bold border border-rose-200/60">
                                <ShieldAlert size={14} /> Flagged
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 bg-stone-100 text-stone-700 px-3 py-1 rounded-full text-xs font-bold border border-stone-200">
                                {product.status}
                            </span>
                        )}
                    </div>
                </div>

                {/* Media Section (Images / 3D Model Toggle) */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-stone-600">Product Media</label>
                        {product.model_3d_path && (
                            <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200">
                                <button
                                    type="button"
                                    onClick={() => setViewingMode('image')}
                                    className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
                                        viewingMode === 'image' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'
                                    }`}
                                >
                                    <ImageIcon size={14} /> Photos
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewingMode('3d')}
                                    className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
                                        viewingMode === '3d' ? 'bg-clay-600 text-white shadow-sm' : 'text-stone-500 hover:text-stone-800'
                                    }`}
                                >
                                    <Rotate3d size={14} /> 3D Canvas
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="w-full h-72 rounded-2xl border border-stone-200 bg-stone-50 overflow-hidden relative flex items-center justify-center">
                        {viewingMode === '3d' && product.model_3d_path ? (
                            <div className="w-full h-full">
                                <ProductViewer3D 
                                    modelUrl={product.model_3d_url || (product.model_3d_path?.startsWith('http') ? product.model_3d_path : `/storage/${product.model_3d_path}`)} 
                                />
                            </div>
                        ) : (
                            <img
                                src={activeImageUrl}
                                alt={product.name}
                                className="w-full h-full object-contain p-2"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '/images/placeholder.svg';
                                }}
                            />
                        )}
                    </div>

                    {/* Gallery Thumbnail Strip */}
                    {galleryUrls.length > 0 && viewingMode === 'image' && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                            <button
                                type="button"
                                onClick={() => setSelectedImage(coverUrl)}
                                className={`w-14 h-14 rounded-xl border shrink-0 overflow-hidden transition-all ${
                                    selectedImage === coverUrl || !selectedImage ? 'ring-2 ring-clay-600 border-transparent' : 'border-stone-200 hover:border-stone-400'
                                }`}
                            >
                                <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                            </button>
                            {galleryUrls.map((gUrl, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setSelectedImage(gUrl)}
                                    className={`w-14 h-14 rounded-xl border shrink-0 overflow-hidden transition-all ${
                                        selectedImage === gUrl ? 'ring-2 ring-clay-600 border-transparent' : 'border-stone-200 hover:border-stone-400'
                                    }`}
                                >
                                    <img src={gUrl} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Product Name & Basic Info Banner */}
                <div className="space-y-1">
                    <h2 className="text-lg font-black text-stone-900 tracking-tight leading-snug">{product.name}</h2>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-150 text-stone-700 text-[10px] font-bold uppercase tracking-wider">
                            <Tag size={12} className="text-stone-400" /> {product.category || 'General'}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-750 text-[10px] font-bold border border-emerald-100 uppercase tracking-wider">
                            ₱{Number(product.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-50 text-stone-600 text-[10px] font-bold border border-stone-200/60 uppercase tracking-wider">
                            <Box size={12} className="text-stone-400" /> Stock: {product.stock ?? 0}
                        </span>
                    </div>
                </div>

                {/* Description Block */}
                {product.description && (
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Description</label>
                        <div className="p-4 bg-stone-50/50 rounded-2xl border border-stone-200/80 text-xs text-stone-700 leading-relaxed whitespace-pre-line">
                            {product.description}
                        </div>
                    </div>
                )}

                {/* Craftsmanship & Spec Sections */}
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 block mb-2 flex items-center gap-1.5">
                            <Flame size={13} className="text-clay-600" /> Craftsmanship Details
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            <div className="p-3.5 bg-stone-50/40 rounded-xl border border-stone-200/60">
                                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Clay Type</p>
                                <p className="text-xs font-bold text-stone-800 mt-1">{product.clay_type || 'N/A'}</p>
                            </div>
                            <div className="p-3.5 bg-stone-50/40 rounded-xl border border-stone-200/60">
                                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Glaze Finish</p>
                                <p className="text-xs font-bold text-stone-800 mt-1">{product.glaze_type || 'N/A'}</p>
                            </div>
                            <div className="p-3.5 bg-stone-50/40 rounded-xl border border-stone-200/60">
                                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Firing Method</p>
                                <p className="text-xs font-bold text-stone-800 mt-1">{product.firing_method || 'N/A'}</p>
                            </div>
                            <div className="p-3.5 bg-stone-50/40 rounded-xl border border-stone-200/60">
                                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Food Safe</p>
                                <p className={`text-xs font-bold mt-1 ${product.food_safe ? 'text-emerald-700' : 'text-stone-500'}`}>
                                    {product.food_safe ? 'Yes (Food Safe)' : 'No'}
                                </p>
                            </div>
                            <div className="p-3.5 bg-stone-50/40 rounded-xl border border-stone-200/60">
                                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Lead Time</p>
                                <p className="text-xs font-bold text-stone-800 mt-1">{product.lead_time ? `${product.lead_time} days` : 'Ready stock'}</p>
                            </div>
                            <div className="p-3.5 bg-stone-50/40 rounded-xl border border-stone-200/60">
                                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Dimensions / Weight</p>
                                <p className="text-xs font-bold text-stone-800 mt-1">
                                    {product.height || product.width ? `${product.height || 0}x${product.width || 0} cm` : 'N/A'} {product.weight ? `(${product.weight} kg)` : ''}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Seller Resubmission Notes / Rejection Reason (if any) */}
                {product.latest_resubmission?.notes && (
                    <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-250/20">
                        <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                            <FileText size={14} className="text-amber-700" /> Seller Resubmission Note:
                        </p>
                        <p className="text-xs text-amber-850 mt-1.5 italic font-medium">"{product.latest_resubmission.notes}"</p>
                    </div>
                )}

                {product.rejection_reason && (
                    <div className="p-4 bg-red-55/10 rounded-2xl border border-red-250/15">
                        <p className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                            <XCircle size={14} className="text-red-700" /> Current Rejection Feedback:
                        </p>
                        <p className="text-xs text-red-800 mt-1.5 font-medium">"{product.rejection_reason}"</p>
                    </div>
                )}

                {/* Feedback Input Block for Rejection / Flagging */}
                <div className="pt-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2">
                        Moderation Feedback / Compliance Reason
                    </label>
                    <textarea
                        value={feedback}
                        onChange={(e) => {
                            setFeedback(e.target.value);
                            setActionError('');
                        }}
                        rows={3}
                        className="w-full rounded-2xl border border-stone-200 focus:border-clay-500 focus:ring focus:ring-clay-500/10 text-xs p-3.5 transition-all"
                        placeholder="Provide details or feedback if rejecting or flagging this product..."
                    />
                    {actionError && (
                        <p className="text-xs font-bold text-rose-600 mt-2">{actionError}</p>
                    )}
                </div>
            </div>
        </SlideOverDrawer>
    );
}
