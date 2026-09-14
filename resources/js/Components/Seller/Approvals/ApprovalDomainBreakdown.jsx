import React from 'react';
import { 
    ShoppingBag, Tag, AlertCircle, 
    FileText, ArrowRight, Package 
} from 'lucide-react';
import ApprovalPayrollBreakdown from './ApprovalPayrollBreakdown';

const formatMoney = (amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '₱0.00';
    return `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function ApprovalDomainBreakdown({
    approval,
    payload = {},
    onViewDocument,
}) {
    if (!approval) return null;

    // 2. Procurement Restock Breakdown
    const renderProcurementDetails = () => {
        return (
            <div className="space-y-4">
                {/* Cost Highlight */}
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block mb-0.5">
                            Estimated Restock Budget
                        </span>
                        <span className="text-xl font-black text-amber-950">
                            {formatMoney(payload.estimated_cost || payload.total_cost || 0)}
                        </span>
                    </div>
                    <ShoppingBag size={28} className="text-amber-600/40" />
                </div>

                {/* Supply Specs Grid */}
                <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 pb-2 border-b border-stone-100 flex items-center gap-1.5">
                        <Package size={14} className="text-clay-600" />
                        Material &amp; Inventory Specifications
                    </h4>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                            <span className="text-[10px] text-stone-400 uppercase font-bold block">Material / Item</span>
                            <span className="font-bold text-stone-900">{payload.materials || payload.item_name || approval.title}</span>
                        </div>

                        {payload.sku && (
                            <div>
                                <span className="text-[10px] text-stone-400 uppercase font-bold block">Item SKU</span>
                                <span className="font-mono font-semibold text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded text-[11px]">
                                    {payload.sku}
                                </span>
                            </div>
                        )}

                        <div>
                            <span className="text-[10px] text-stone-400 uppercase font-bold block">Supplier Name</span>
                            <span className="font-semibold text-stone-800">{payload.supplier || 'Standard Supplier'}</span>
                        </div>

                        <div>
                            <span className="text-[10px] text-stone-400 uppercase font-bold block">Restock Quantity</span>
                            <span className="font-bold text-stone-900">{payload.quantity ? `${payload.quantity} units` : 'Batch replenishment'}</span>
                        </div>

                        {payload.current_stock !== undefined && (
                            <div>
                                <span className="text-[10px] text-stone-400 uppercase font-bold block">Current Stock</span>
                                <span className={`font-semibold ${payload.current_stock <= (payload.min_stock || 5) ? 'text-rose-600 font-bold' : 'text-stone-700'}`}>
                                    {payload.current_stock} in inventory
                                </span>
                            </div>
                        )}

                        {payload.unit_cost && (
                            <div>
                                <span className="text-[10px] text-stone-400 uppercase font-bold block">Unit Cost</span>
                                <span className="font-semibold text-stone-800">{formatMoney(payload.unit_cost)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {payload.notes && (
                    <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 text-xs text-stone-700">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">Staff Note</span>
                        <p className="italic">&ldquo;{payload.notes}&rdquo;</p>
                    </div>
                )}
            </div>
        );
    };

    // 3. Staff Salary & Rate Change Details
    const renderStaffRateDetails = () => {
        const oldRate = Number(payload.old_rate || 0);
        const newRate = Number(payload.new_rate || 0);
        const diff = newRate - oldRate;
        const percentChange = oldRate > 0 ? ((diff / oldRate) * 100).toFixed(1) : null;

        return (
            <div className="space-y-4">
                {/* Employee Profile Header */}
                <div className="p-4 rounded-2xl bg-clay-50/60 border border-clay-100 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-clay-600 text-white font-black text-base flex items-center justify-center shadow-xs shrink-0">
                        {payload.employee_name ? payload.employee_name.charAt(0).toUpperCase() : 'A'}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-stone-900">{payload.employee_name || 'Staff Member'}</h4>
                        <p className="text-xs text-clay-700 font-medium">{payload.position || payload.role || 'Artisan Specialist'}</p>
                    </div>
                </div>

                {/* Before / After Comparison */}
                <div className="p-4 rounded-2xl border border-stone-200 bg-white space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                        Rate Adjustment Proposal
                    </span>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-100">
                        <div>
                            <span className="text-[10px] text-stone-400 uppercase font-bold block">Current Rate</span>
                            <span className="text-sm font-bold text-stone-500 line-through">
                                {formatMoney(oldRate)}
                            </span>
                        </div>

                        <div className="flex flex-col items-center">
                            <ArrowRight size={18} className="text-stone-400" />
                            {percentChange && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-1 ${diff >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                    {diff >= 0 ? `+${percentChange}%` : `${percentChange}%`}
                                </span>
                            )}
                        </div>

                        <div className="text-right">
                            <span className="text-[10px] text-stone-400 uppercase font-bold block">New Proposed Rate</span>
                            <span className="text-base font-black text-emerald-700">
                                {formatMoney(newRate)}
                            </span>
                        </div>
                    </div>

                    {payload.effective_date && (
                        <div className="flex items-center justify-between text-xs text-stone-600 pt-2">
                            <span>Effective Date:</span>
                            <strong className="text-stone-900">{payload.effective_date}</strong>
                        </div>
                    )}
                </div>

                {payload.justification && (
                    <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 text-xs text-stone-700">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">Reason / Justification</span>
                        <p className="leading-relaxed">&ldquo;{payload.justification}&rdquo;</p>
                    </div>
                )}
            </div>
        );
    };

    // 4. Customer Dispute & Refund Details
    const renderRefundDetails = () => {
        return (
            <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200/80 flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-800 block mb-0.5">
                            Refund Amount Requested
                        </span>
                        <span className="text-xl font-black text-orange-950">
                            {formatMoney(payload.refund_amount || payload.amount || 0)}
                        </span>
                    </div>
                    <AlertCircle size={28} className="text-orange-600/40" />
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                        <span className="text-stone-500 font-medium">Order Number:</span>
                        <strong className="text-stone-900 font-bold">{payload.order_number || '#ORD-LK'}</strong>
                    </div>

                    {payload.buyer_claim && (
                        <div>
                            <span className="text-[10px] text-stone-400 uppercase font-bold block mb-1">Customer Claim</span>
                            <p className="p-2.5 rounded-xl bg-stone-50 border border-stone-100 text-stone-800 font-medium leading-relaxed">
                                {payload.buyer_claim}
                            </p>
                        </div>
                    )}

                    {payload.proposed_resolution && (
                        <div className="flex items-center justify-between pt-1">
                            <span className="text-stone-500 font-medium">Staff Recommendation:</span>
                            <span className="font-bold text-orange-800 bg-orange-50 px-2 py-0.5 rounded border border-orange-200/60">
                                {payload.proposed_resolution}
                            </span>
                        </div>
                    )}
                </div>

                {/* Evidence Photos Gallery */}
                {payload.evidence_photos && payload.evidence_photos.length > 0 && (
                    <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                            Evidence Attachments ({payload.evidence_photos.length})
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                            {payload.evidence_photos.map((photo, idx) => (
                                <button 
                                    key={idx} 
                                    type="button"
                                    onClick={() => onViewDocument ? onViewDocument({ url: photo, title: `Evidence Attachment #${idx + 1}`, type: 'image' }) : window.open(photo, '_blank')}
                                    className="block aspect-square rounded-xl overflow-hidden border border-stone-200 bg-stone-100 hover:opacity-90 transition cursor-pointer"
                                >
                                    <img src={photo} alt={`Evidence #${idx + 1}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // 5. Promotional Discount Details
    const renderDiscountDetails = () => {
        const productsList = payload.products || payload.items || [];

        return (
            <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block mb-0.5">
                            Promo Discount Rate
                        </span>
                        <span className="text-2xl font-black text-rose-950">
                            {payload.discount_rate || payload.discount_display || (payload.type === 'percentage' ? `${payload.value}% OFF` : `₱${payload.value} OFF`)}
                        </span>
                    </div>
                    <Tag size={28} className="text-rose-600/40" />
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                        <span className="text-stone-500 font-medium">Campaign Title:</span>
                        <strong className="text-stone-900 font-bold">{payload.campaign_name || approval.title}</strong>
                    </div>

                    {payload.schedule && (
                        <div className="flex items-center justify-between">
                            <span className="text-stone-500 font-medium">Promotion Window:</span>
                            <span className="font-semibold text-stone-700">{payload.schedule}</span>
                        </div>
                    )}

                    {payload.promo_stock && (
                        <div className="flex items-center justify-between">
                            <span className="text-stone-500 font-medium">Allocated Promo Stock:</span>
                            <span className="font-bold text-stone-800">{payload.promo_stock} units</span>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <span className="text-stone-500 font-medium">Affected Products:</span>
                        <span className="font-bold text-stone-800">{payload.products_count || productsList.length} Item(s)</span>
                    </div>
                </div>

                {/* Itemized Affected Products Table */}
                {productsList.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600">
                                Target Product Pricing
                            </h4>
                            <span className="text-[11px] text-stone-400 font-medium">
                                {productsList.length} Item{productsList.length === 1 ? '' : 's'}
                            </span>
                        </div>

                        <div className="rounded-2xl border border-stone-200 overflow-hidden divide-y divide-stone-100">
                            {productsList.map((item, idx) => (
                                <div key={idx} className="p-3.5 bg-white hover:bg-stone-50/60 transition-colors">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                                {idx + 1}
                                            </span>
                                            <span className="text-xs font-bold text-stone-900 truncate">
                                                {item.name || `Product #${item.id || idx + 1}`}
                                            </span>
                                        </div>
                                        {item.sku && (
                                            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 shrink-0">
                                                {item.sku}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-100/80 mt-1.5">
                                        <div className="text-[11px] text-stone-500">
                                            <span>Original: </span>
                                            <span className="line-through text-stone-400 font-medium">
                                                {formatMoney(item.original_price || item.price || 0)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-bold uppercase text-emerald-700">Promo Price:</span>
                                            <span className="font-extrabold text-emerald-800">
                                                {formatMoney(item.discounted_price || (item.original_price ? (item.original_price - (item.savings || 0)) : 0))}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // 6. Product Listing Draft Details
    const renderProductDraftDetails = () => {
        return (
            <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-0.5">
                            Suggested Retail Price
                        </span>
                        <span className="text-2xl font-black text-stone-900">
                            {formatMoney(payload.proposed_price || payload.price || 0)}
                        </span>
                    </div>
                    <FileText size={28} className="text-stone-400" />
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                        <span className="text-stone-500 font-medium">Product Name:</span>
                        <strong className="text-stone-900 font-bold">{payload.product_name || approval.title}</strong>
                    </div>

                    {payload.cost_margin && (
                        <div className="flex items-center justify-between">
                            <span className="text-stone-500 font-medium">Estimated Production Margin:</span>
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {payload.cost_margin}
                            </span>
                        </div>
                    )}

                    {payload.category && (
                        <div className="flex items-center justify-between">
                            <span className="text-stone-500 font-medium">Category:</span>
                            <span className="font-semibold text-stone-800">{payload.category}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Generic Fallback
    const renderGenericDetails = () => {
        return (
            <div className="space-y-3">
                <div className="rounded-2xl border border-stone-200 bg-white p-4 text-xs space-y-2">
                    {Object.entries(payload).map(([key, val]) => (
                        <div key={key} className="flex items-start justify-between gap-3 py-1 border-b border-stone-100 last:border-0">
                            <span className="text-stone-500 font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
                            <span className="font-semibold text-stone-900 text-right">
                                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    switch (approval.domain) {
        case 'hr_payroll':
            return <ApprovalPayrollBreakdown payload={payload} />;
        case 'procurement':
            return renderProcurementDetails();
        case 'staff_rate':
            return renderStaffRateDetails();
        case 'refund':
            return renderRefundDetails();
        case 'discount':
            return renderDiscountDetails();
        case 'product_draft':
            return renderProductDraftDetails();
        default:
            return renderGenericDetails();
    }
}
