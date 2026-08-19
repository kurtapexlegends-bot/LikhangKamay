import React from 'react';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import UserAvatar from '@/Components/UserAvatar';
import { 
    Banknote, User, ShoppingBag, Tag, AlertCircle, 
    FileText, Clock, CheckCircle2, XCircle, ArrowRight, 
    Calendar, Building2, Package, Layers, ShieldAlert,
    ExternalLink, Check, DollarSign, Percent, AlertTriangle
} from 'lucide-react';

const DOMAIN_CONFIG = {
    hr_payroll: {
        label: 'Payroll Run',
        icon: Banknote,
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    },
    staff_rate: {
        label: 'Salary & Rate Update',
        icon: User,
        badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200/80',
    },
    procurement: {
        label: 'Materials & Supplies',
        icon: ShoppingBag,
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
    },
    discount: {
        label: 'Promotions & Discounts',
        icon: Tag,
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/80',
    },
    refund: {
        label: 'Customer Dispute & Refund',
        icon: AlertCircle,
        badgeClass: 'bg-orange-50 text-orange-800 border-orange-200/80',
    },
    product_draft: {
        label: 'Product Listing',
        icon: FileText,
        badgeClass: 'bg-stone-100 text-stone-800 border-stone-200/80',
    },
};

export default function ApprovalDetailsDrawer({
    isOpen,
    onClose,
    approval,
    onApprove,
    onReject,
    processing = false,
}) {
    if (!approval) return null;

    const domainInfo = DOMAIN_CONFIG[approval.domain] || {
        label: approval.domain,
        icon: FileText,
        badgeClass: 'bg-stone-100 text-stone-800 border-stone-200/80',
    };
    const IconComponent = domainInfo.icon;
    const isPending = approval.status === 'pending';
    const isApproved = approval.status === 'approved';
    const isRejected = approval.status === 'rejected';
    const payload = approval.changes_payload || {};

    const formatMoney = (amount) => {
        if (amount === undefined || amount === null || isNaN(amount)) return '₱0.00';
        return `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Render Domain-Specific Rich Content
    const renderDomainDetails = () => {
        switch (approval.domain) {
            case 'hr_payroll':
                return renderPayrollDetails();
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
    };

    // 1. Payroll Run Breakdown
    const renderPayrollDetails = () => {
        const lineItems = payload.breakdown || payload.line_items || payload.employees || [];

        return (
            <div className="space-y-5">
                {/* Financial Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">
                            Total Net Payout
                        </span>
                        <span className="text-lg font-black text-emerald-900">
                            {formatMoney(payload.total_payout || payload.net_total || 0)}
                        </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                            Total Employees
                        </span>
                        <span className="text-lg font-bold text-stone-900">
                            {payload.staff_count || payload.employee_count || lineItems.length || 0} Employees
                        </span>
                    </div>

                    <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                            Pay Period
                        </span>
                        <span className="text-sm font-bold text-stone-800">
                            {payload.period || payload.month || 'Current Cycle'}
                        </span>
                    </div>
                </div>

                {/* Itemized Employee Table */}
                <div>
                    <div className="flex items-center justify-between mb-2.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600">
                            Itemized Employee Breakdown
                        </h4>
                        <span className="text-[11px] text-stone-400 font-medium">
                            {lineItems.length} Record{lineItems.length === 1 ? '' : 's'}
                        </span>
                    </div>

                    {lineItems.length > 0 ? (
                        <div className="rounded-2xl border border-stone-200 overflow-hidden divide-y divide-stone-100">
                            {lineItems.map((emp, idx) => (
                                <div key={idx} className="p-3.5 bg-white hover:bg-stone-50/60 transition-colors">
                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="w-6 h-6 rounded-full bg-clay-100 text-clay-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                                {idx + 1}
                                            </span>
                                            <span className="text-xs font-bold text-stone-900 truncate">
                                                {emp.name || emp.employee_name || `Employee #${idx + 1}`}
                                            </span>
                                            {emp.role && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-medium">
                                                    {emp.role}
                                                </span>
                                            )}
                                        </div>

                                        <span className="text-xs font-black text-emerald-800 shrink-0">
                                            {formatMoney(emp.net_pay || emp.salary || emp.amount || 0)}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 text-[11px] text-stone-500 pt-1 border-t border-stone-100/80">
                                        <div>
                                            <span className="text-stone-400 block text-[9px] uppercase">Base Pay</span>
                                            <span>{formatMoney(emp.base_salary || emp.daily_rate || 0)}</span>
                                        </div>
                                        <div>
                                            <span className="text-stone-400 block text-[9px] uppercase">Deductions</span>
                                            <span className="text-rose-600 font-medium">{formatMoney(emp.deductions || emp.undertime || 0)}</span>
                                        </div>
                                        <div>
                                            <span className="text-stone-400 block text-[9px] uppercase">Payout Method</span>
                                            <span className="font-medium text-stone-700">{emp.payment_method || 'Bank Transfer'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 text-xs text-stone-500 text-center">
                            Standard batch summary submitted without line-item array.
                        </div>
                    )}
                </div>
            </div>
        );
    };

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
                        <p className="italic">"{payload.notes}"</p>
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
                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-base flex items-center justify-center shadow-xs shrink-0">
                        {payload.employee_name ? payload.employee_name.charAt(0).toUpperCase() : 'A'}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-stone-900">{payload.employee_name || 'Staff Member'}</h4>
                        <p className="text-xs text-indigo-700 font-medium">{payload.position || payload.role || 'Artisan Specialist'}</p>
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
                        <p className="leading-relaxed">"{payload.justification}"</p>
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
                                <a 
                                    key={idx} 
                                    href={photo} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="block aspect-square rounded-xl overflow-hidden border border-stone-200 bg-stone-100 hover:opacity-90 transition"
                                >
                                    <img src={photo} alt={`Evidence #${idx + 1}`} className="w-full h-full object-cover" />
                                </a>
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

    const drawerFooter = (
        <div className="flex items-center justify-between gap-3 w-full">
            {isPending ? (
                <>
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            onReject(approval);
                        }}
                        disabled={processing}
                        className="flex-1 py-2.5 px-4 rounded-xl border border-stone-200 bg-white text-stone-700 text-xs font-bold hover:bg-stone-100 hover:text-rose-600 transition active:scale-95 disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-1.5"
                    >
                        <XCircle size={15} /> Decline Request
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            onApprove(approval);
                        }}
                        disabled={processing}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-clay-600 hover:bg-clay-700 text-white text-xs font-bold shadow-xs transition active:scale-95 disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-1.5"
                    >
                        <CheckCircle2 size={15} /> Approve Request
                    </button>
                </>
            ) : (
                <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2.5 px-4 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition min-h-[44px]"
                >
                    Close Inspection
                </button>
            )}
        </div>
    );

    return (
        <SlideOverDrawer
            show={isOpen}
            onClose={onClose}
            title={null}
            footer={drawerFooter}
            widthClass="max-w-xl"
            position="bottom"
        >
            <div className="space-y-6">
                {/* Header Meta */}
                <div>
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${domainInfo.badgeClass}`}>
                            <IconComponent size={14} />
                            {domainInfo.label}
                        </span>

                        <div>
                            {isPending && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    <Clock size={12} /> Awaiting Review
                                </span>
                            )}
                            {isApproved && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    <CheckCircle2 size={12} /> Approved
                                </span>
                            )}
                            {isRejected && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                    <XCircle size={12} /> Declined
                                </span>
                            )}
                        </div>
                    </div>

                    <h3 className="text-lg font-black text-stone-900 tracking-tight">
                        {approval.title}
                    </h3>
                    {approval.summary && (
                        <p className="text-xs text-stone-600 mt-1 leading-relaxed font-medium">
                            {approval.summary}
                        </p>
                    )}
                </div>

                {/* Requester & Submission Timestamp */}
                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <UserAvatar user={approval.requester} className="w-8 h-8 rounded-xl shadow-2xs shrink-0" />
                        <div className="min-w-0">
                            <span className="text-[10px] uppercase font-bold text-stone-400 block">Submitted By</span>
                            <span className="text-xs font-bold text-stone-800 truncate block">
                                {approval.requester?.name || 'Staff Member'}
                            </span>
                        </div>
                    </div>

                    <div className="text-right shrink-0">
                        <span className="text-[10px] uppercase font-bold text-stone-400 block">Date Submitted</span>
                        <span className="text-xs font-medium text-stone-600">
                            {formatDate(approval.created_at)}
                        </span>
                    </div>
                </div>

                {/* Rejection Note (If Rejected) */}
                {isRejected && approval.rejection_reason && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                            <AlertTriangle size={14} className="text-rose-600" />
                            <span>Reason for Declining:</span>
                        </div>
                        <p className="leading-relaxed pl-5 font-medium">{approval.rejection_reason}</p>
                    </div>
                )}

                {/* Domain Specific Data */}
                <div>
                    {renderDomainDetails()}
                </div>
            </div>
        </SlideOverDrawer>
    );
}
