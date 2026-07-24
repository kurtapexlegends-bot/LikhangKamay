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
    Image as ImageIcon,
    Copy,
    TrendingUp,
    Info,
    ExternalLink,
    AlertCircle
} from 'lucide-react';
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
    const [copiedSku, setCopiedSku] = useState(false);

    if (!product) return null;

    const coverUrl = product.img || (product.cover_photo_path?.startsWith('http')
        ? product.cover_photo_path
        : (product.cover_photo_path ? `/storage/${product.cover_photo_path}` : '/images/placeholder.svg'));

    const galleryUrls = (product.gallery_paths || []).map(path => 
        path?.startsWith('http') ? path : `/storage/${path}`
    );

    const activeImageUrl = selectedImage || coverUrl;

    const handleCopySku = () => {
        if (!product.sku) return;
        navigator.clipboard.writeText(product.sku);
        setCopiedSku(true);
        setTimeout(() => setCopiedSku(false), 2000);
    };

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

    // Calculate profit margin if cost_price is available
    const price = Number(product.price || 0);
    const costPrice = Number(product.cost_price || 0);
    const profitMargin = price > 0 && costPrice > 0 ? (((price - costPrice) / price) * 100).toFixed(1) : null;

    return (
        <SlideOverDrawer
            show={isOpen}
            onClose={onClose}
            title="Inspect Product Listing"
            widthClass="max-w-2xl"
            position="right"
        >
            <div className="space-y-6 pb-28 relative">
                
                {/* Header Status & Artisan Summary Card */}
                <div className="p-4 bg-stone-50/80 rounded-2xl border border-stone-200/80 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-clay-100/70 border border-clay-200/60 flex items-center justify-center text-clay-800 font-bold shadow-xs">
                                {product.user?.shop_name?.charAt(0) || <User size={18} />}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                                    {product.user?.shop_name || 'Individual Seller'}
                                </p>
                                <p className="text-[11px] text-stone-500 font-medium mt-0.5">
                                    {product.user?.name} {product.user?.email ? `• ${product.user.email}` : ''}
                                </p>
                            </div>
                        </div>

                        <div>
                            {product.status === 'Active' ? (
                                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200/60 shadow-2xs">
                                    <CheckCircle2 size={13} /> Approved / Active
                                </span>
                            ) : product.status === 'pending_review' ? (
                                <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold border border-amber-200/60 shadow-2xs">
                                    <Clock size={13} /> Pending Review
                                </span>
                            ) : product.status === 'rejected' ? (
                                <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1 rounded-full text-xs font-bold border border-red-200/60 shadow-2xs">
                                    <XCircle size={13} /> Rejected
                                </span>
                            ) : product.status === 'flagged' ? (
                                <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 px-3 py-1 rounded-full text-xs font-bold border border-rose-200/60 shadow-2xs">
                                    <ShieldAlert size={13} /> Flagged
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 bg-stone-100 text-stone-700 px-3 py-1 rounded-full text-xs font-bold border border-stone-200">
                                    {product.status}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 text-[11px] text-stone-500 font-mono">
                        <button
                            type="button"
                            onClick={handleCopySku}
                            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-stone-200 hover:border-stone-400 text-stone-700 font-bold transition-all"
                            title="Click to copy SKU"
                        >
                            <span>SKU: {product.sku}</span>
                            {copiedSku ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} className="text-stone-400" />}
                        </button>
                        <span>Submitted: {product.created_at ? new Date(product.created_at).toLocaleDateString() : 'N/A'}</span>
                    </div>
                </div>

                {/* Media Showcase (Photos / 3D Toggle) */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Product Media Viewer</label>
                        {product.model_3d_path && (
                            <div className="flex items-center bg-stone-100/80 p-1 rounded-xl border border-stone-200">
                                <button
                                    type="button"
                                    onClick={() => setViewingMode('image')}
                                    className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
                                        viewingMode === 'image' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                                    }`}
                                >
                                    <ImageIcon size={13} /> Photos ({galleryUrls.length + 1})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewingMode('3d')}
                                    className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
                                        viewingMode === '3d' ? 'bg-clay-600 text-white shadow-xs' : 'text-stone-500 hover:text-stone-800'
                                    }`}
                                >
                                    <Rotate3d size={13} /> 3D Canvas
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="w-full h-80 rounded-2xl border border-stone-200/90 bg-stone-50/60 overflow-hidden relative flex items-center justify-center shadow-xs">
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
                                className="w-full h-full object-contain p-3 transition-all duration-200"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '/images/placeholder.svg';
                                }}
                            />
                        )}
                    </div>

                    {/* Gallery Thumbnail Strip */}
                    {galleryUrls.length > 0 && viewingMode === 'image' && (
                        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
                            <button
                                type="button"
                                onClick={() => setSelectedImage(coverUrl)}
                                className={`w-14 h-14 rounded-xl border shrink-0 overflow-hidden transition-all ${
                                    selectedImage === coverUrl || !selectedImage ? 'ring-2 ring-clay-600 border-transparent shadow-xs' : 'border-stone-200 opacity-70 hover:opacity-100'
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
                                        selectedImage === gUrl ? 'ring-2 ring-clay-600 border-transparent shadow-xs' : 'border-stone-200 opacity-70 hover:opacity-100'
                                    }`}
                                >
                                    <img src={gUrl} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Product Title & Financial Telemetry Cards */}
                <div className="space-y-3">
                    <h2 className="text-xl font-black text-stone-900 tracking-tight">{product.name}</h2>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Retail Price</p>
                            <p className="text-base font-black text-emerald-700 mt-0.5">
                                ₱{price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        
                        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Cost Price</p>
                            <p className="text-base font-bold text-stone-800 mt-0.5">
                                {costPrice > 0 ? `₱${costPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'N/A'}
                            </p>
                        </div>

                        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Inventory Stock</p>
                            <p className="text-base font-black text-stone-900 mt-0.5">
                                {product.stock ?? 0} units
                            </p>
                        </div>

                        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Profit Margin</p>
                            <p className={`text-base font-bold mt-0.5 ${profitMargin ? 'text-clay-700' : 'text-stone-400'}`}>
                                {profitMargin ? `${profitMargin}%` : 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Description Block */}
                {product.description && (
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Product Description</label>
                        <div className="p-4 bg-stone-50/70 rounded-xl border border-stone-200/80 text-xs text-stone-700 leading-relaxed whitespace-pre-line">
                            {product.description}
                        </div>
                    </div>
                )}

                {/* Craftsmanship & Specification Grid */}
                <div className="space-y-2.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                        <Flame size={14} className="text-clay-600" /> Craftsmanship & Specifications
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80">
                            <p className="text-[10px] font-bold text-stone-400 uppercase">Category</p>
                            <p className="text-xs font-bold text-stone-800 mt-0.5">{product.category || 'General'}</p>
                        </div>
                        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80">
                            <p className="text-[10px] font-bold text-stone-400 uppercase">Clay Type</p>
                            <p className="text-xs font-bold text-stone-800 mt-0.5">{product.clay_type || 'N/A'}</p>
                        </div>
                        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80">
                            <p className="text-[10px] font-bold text-stone-400 uppercase">Glaze Finish</p>
                            <p className="text-xs font-bold text-stone-800 mt-0.5">{product.glaze_type || 'N/A'}</p>
                        </div>
                        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80">
                            <p className="text-[10px] font-bold text-stone-400 uppercase">Firing Method</p>
                            <p className="text-xs font-bold text-stone-800 mt-0.5">{product.firing_method || 'N/A'}</p>
                        </div>
                        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80">
                            <p className="text-[10px] font-bold text-stone-400 uppercase">Food Safety</p>
                            <p className={`text-xs font-bold mt-0.5 ${product.food_safe ? 'text-emerald-700' : 'text-stone-600'}`}>
                                {product.food_safe ? 'Yes (Food Safe)' : 'No'}
                            </p>
                        </div>
                        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80">
                            <p className="text-[10px] font-bold text-stone-400 uppercase">Lead Time</p>
                            <p className="text-xs font-bold text-stone-800 mt-0.5">{product.lead_time ? `${product.lead_time} days` : 'Ready stock'}</p>
                        </div>
                    </div>
                </div>

                {/* Seller Resubmission Notes / Rejection Reason (if any) */}
                {product.latest_resubmission?.notes && (
                    <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200/80 space-y-1">
                        <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                            <FileText size={14} className="text-amber-700" /> Seller Resubmission Note:
                        </p>
                        <p className="text-xs text-amber-800 italic leading-relaxed">"{product.latest_resubmission.notes}"</p>
                    </div>
                )}

                {product.rejection_reason && (
                    <div className="p-4 bg-red-50/80 rounded-2xl border border-red-200/80 space-y-1">
                        <p className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                            <XCircle size={14} className="text-red-700" /> Current Rejection Feedback:
                        </p>
                        <p className="text-xs text-red-800 leading-relaxed">"{product.rejection_reason}"</p>
                    </div>
                )}

                {/* Feedback Input Block for Rejection / Flagging */}
                <div className="p-4 bg-stone-50/80 rounded-2xl border border-stone-200/80 space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                        Moderation Action Feedback / Reason
                    </label>
                    <textarea
                        value={feedback}
                        onChange={(e) => {
                            setFeedback(e.target.value);
                            setActionError('');
                        }}
                        rows={3}
                        className="w-full rounded-xl border border-stone-200/90 focus:border-clay-500 focus:ring-clay-500/20 text-xs p-3 bg-white"
                        placeholder="Required when rejecting or flagging: Explain the listing adjustments or guidelines violated..."
                    />
                    {actionError && (
                        <p className="text-xs font-bold text-rose-600 flex items-center gap-1">
                            <AlertCircle size={13} /> {actionError}
                        </p>
                    )}
                </div>

                {/* Footer Action Control Bar */}
                <div className="pt-4 border-t border-stone-200 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 text-xs font-bold hover:bg-stone-100 transition-all"
                    >
                        Close
                    </button>

                    <div className="flex items-center gap-2">
                        {product.status === 'Active' ? (
                            <button
                                type="button"
                                disabled={isProcessing}
                                onClick={handleFlag}
                                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                            >
                                <ShieldAlert size={15} /> Flag Listing
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    disabled={isProcessing}
                                    onClick={handleReject}
                                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                                >
                                    <XCircle size={15} /> Reject Listing
                                </button>
                                <button
                                    type="button"
                                    disabled={isProcessing}
                                    onClick={handleApprove}
                                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                                >
                                    <CheckCircle2 size={15} /> Approve Listing
                                </button>
                            </>
                        )}
                    </div>
                </div>

            </div>
        </SlideOverDrawer>
    );
}
