/* global route */
import React, { useState, useMemo, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import { ShoppingBag } from 'lucide-react';
import SellerWorkspaceLayout from '@/Layouts/SellerWorkspaceLayout';
import SellerHeader from '@/Layouts/SellerHeader';
import PosProductGrid from '@/Components/Seller/POS/PosProductGrid';
import PosCartPanel from '@/Components/Seller/POS/PosCartPanel';
import PosPaymentModal from '@/Components/Seller/POS/PosPaymentModal';
import PosRecentSalesDrawer from '@/Components/Seller/POS/PosRecentSalesDrawer';
import PosQrSetupModal from '@/Components/Seller/POS/PosQrSetupModal';
import PosReceiptModal from '@/Components/Seller/POS/PosReceiptModal';
import { calculatePosLineTotal } from '@/Components/Seller/POS/posPricing';

const resolveMaxPromoLimit = (discountInfo) => {
    if (!discountInfo) return null;

    const limits = [];
    if (discountInfo.max_purchase_limit !== null && discountInfo.max_purchase_limit !== undefined && Number(discountInfo.max_purchase_limit) > 0) {
        limits.push(Number(discountInfo.max_purchase_limit));
    }
    if (discountInfo.remaining_promo_stock !== null && discountInfo.remaining_promo_stock !== undefined) {
        limits.push(Math.max(0, Number(discountInfo.remaining_promo_stock)));
    }

    return limits.length > 0 ? Math.min(...limits) : null;
};

const formatCurrency = (value) =>
    new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
    }).format(Number(value || 0));

export default function PosIndex({
    products = [],
    categories = [],
    recentOrders = [],
    historySummary = null,
    historyBranches = [],
    lastPosOrder = null,
    canEditPos = false,
    canVoidPos = false,
    voidApprovers = [],
    studioProfile = {},
    flash = {},
}) {
    const [cart, setCart] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [customerName, setCustomerName] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('pos_cash');
    const [cashTendered, setCashTendered] = useState('');
    const [paymentReference, setPaymentReference] = useState('');
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState({});
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [recentSalesOpen, setRecentSalesOpen] = useState(false);
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [activeReceiptOrder, setActiveReceiptOrder] = useState(lastPosOrder);
    const [mobileTab, setMobileTab] = useState('catalog');

    const [prevProducts, setPrevProducts] = useState(products);

    const resetSaleForm = useCallback(() => {
        setCart([]);
        setCustomerName('');
        setCashTendered('');
        setPaymentReference('');
        setErrors({});
        setPaymentModalOpen(false);
        setMobileTab('catalog');
    }, []);

    if (products !== prevProducts) {
        setPrevProducts(products);
        setCart((prev) => {
            if (prev.length === 0) return prev;
            const byId = new Map(products.map((product) => [product.id, product]));
            return prev
                .map((item) => {
                    const live = byId.get(item.id);
                    if (!live || live.stock <= 0) return null;
                    return {
                        ...item,
                        name: live.name,
                        unitPrice: Number(live.effective_price),
                        regularPrice: Number(live.price),
                        maxPromoLimit: resolveMaxPromoLimit(live.discount_info),
                        stock: Number(live.stock),
                        quantity: Math.min(item.quantity, Number(live.stock)),
                    };
                })
                .filter(Boolean);
        });
    }

    const filteredProducts = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return products.filter((product) => {
            const matchesCategory =
                selectedCategory === 'All' || product.category === selectedCategory;
            if (!matchesCategory) return false;
            if (!query) return true;

            const nameMatch = (product.name || '').toLowerCase().includes(query);
            const skuMatch = (product.sku || '').toLowerCase().includes(query);
            return nameMatch || skuMatch;
        });
    }, [products, searchQuery, selectedCategory]);

    const cartQuantities = useMemo(() => {
        const map = {};
        cart.forEach((item) => {
            map[item.id] = item.quantity;
        });
        return map;
    }, [cart]);

    const cartCount = useMemo(
        () => cart.reduce((sum, item) => sum + item.quantity, 0),
        [cart]
    );

    const cartTotal = useMemo(
        () => cart.reduce((sum, item) => sum + calculatePosLineTotal(item), 0),
        [cart]
    );

    const handleAddProduct = useCallback((product) => {
        if (!canEditPos || product.stock <= 0) return;

        setErrors({});
        setCart((prev) => {
            const existing = prev.find((item) => item.id === product.id);
            if (existing) {
                if (existing.quantity >= product.stock) return prev;
                return prev.map((item) =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [
                ...prev,
                {
                    id: product.id,
                    name: product.name,
                    unitPrice: Number(product.effective_price),
                    regularPrice: Number(product.price),
                    maxPromoLimit: resolveMaxPromoLimit(product.discount_info),
                    stock: Number(product.stock),
                    quantity: 1,
                },
            ];
        });
    }, [canEditPos]);

    const handleUpdateQuantity = useCallback((productId, nextQty) => {
        setErrors({});
        if (nextQty <= 0) {
            setCart((prev) => prev.filter((item) => item.id !== productId));
            return;
        }

        setCart((prev) =>
            prev.map((item) => {
                if (item.id !== productId) return item;
                return { ...item, quantity: Math.min(nextQty, item.stock) };
            })
        );
    }, []);

    const handleRemoveItem = useCallback((productId) => {
        setErrors({});
        setCart((prev) => prev.filter((item) => item.id !== productId));
    }, []);

    const handleClearCart = useCallback(() => {
        setCart([]);
        setErrors({});
        setCashTendered('');
        setPaymentReference('');
    }, []);

    const handleOpenPaymentModal = useCallback(() => {
        if (!canEditPos || cart.length === 0) return;
        setErrors({});
        setPaymentModalOpen(true);
    }, [canEditPos, cart.length]);

    const handleSubmitCheckout = useCallback(() => {
        if (processing || cart.length === 0 || !canEditPos) return;

        setProcessing(true);
        setErrors({});

        router.post(
            route('seller.pos.store'),
            {
                items: cart.map((item) => ({
                    product_id: item.id,
                    quantity: item.quantity,
                })),
                payment_method: paymentMethod,
                cash_tendered: paymentMethod === 'pos_cash' ? Number(cashTendered || 0) : null,
                payment_reference: paymentMethod === 'pos_cash' ? null : (paymentReference.trim() || null),
                customer_name: customerName.trim() || null,
            },
            {
                preserveScroll: true,
                onSuccess: (page) => {
                    const receipt = page?.props?.lastPosOrder;
                    resetSaleForm();
                    if (receipt) {
                        setActiveReceiptOrder(receipt);
                    }
                },
                onError: (serverErrors) => {
                    setErrors(serverErrors || {});
                },
                onFinish: () => {
                    setProcessing(false);
                },
            }
        );
    }, [
        processing,
        cart,
        canEditPos,
        paymentMethod,
        cashTendered,
        paymentReference,
        customerName,
        resetSaleForm,
    ]);

    return (
        <>
            <Head title="Walk-In POS" />

            <SellerHeader
                title="Walk-In POS"
                subtitle="Record in-store walk-in sales, payments, and receipts."
            />

            {flash?.success && (
                <div className="shrink-0 px-4 py-1.5 bg-emerald-50 border-b border-emerald-200 text-xs font-semibold text-emerald-800">
                    {flash.success}
                </div>
            )}

            {/* Mobile Catalog vs Ticket Switcher */}
            <div className="shrink-0 grid grid-cols-2 gap-1.5 px-3 py-1.5 bg-white border-b border-stone-200 lg:hidden">
                <button
                    type="button"
                    onClick={() => setMobileTab('catalog')}
                    className={`min-h-[40px] rounded-lg text-xs font-bold border transition-colors ${
                        mobileTab === 'catalog'
                            ? 'bg-stone-900 border-stone-900 text-white'
                            : 'bg-stone-50 border-stone-200 text-stone-700'
                    }`}
                >
                    Products ({filteredProducts.length})
                </button>
                <button
                    type="button"
                    onClick={() => setMobileTab('cart')}
                    className={`min-h-[40px] rounded-lg text-xs font-bold border transition-colors ${
                        mobileTab === 'cart'
                            ? 'bg-stone-900 border-stone-900 text-white'
                            : 'bg-stone-50 border-stone-200 text-stone-700'
                    }`}
                >
                    Ticket ({cartCount})
                </button>
            </div>

            {/* Full-Viewport Split POS Register Terminal */}
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
                <section
                    className={`flex-1 min-w-0 h-full min-h-0 overflow-hidden ${
                        mobileTab === 'catalog' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'
                    }`}
                >
                    <PosProductGrid
                        products={filteredProducts}
                        categories={categories}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        selectedCategory={selectedCategory}
                        onCategoryChange={setSelectedCategory}
                        cartQuantities={cartQuantities}
                        onAddProduct={handleAddProduct}
                        canEditPos={canEditPos}
                        recentCount={historySummary?.all ?? recentOrders.length}
                        onOpenRecentSales={() => setRecentSalesOpen(true)}
                        onOpenQrSetup={() => setQrModalOpen(true)}
                    />
                </section>

                <aside
                    className={`w-full lg:w-[295px] xl:w-[330px] shrink-0 h-full min-h-0 overflow-hidden ${
                        mobileTab === 'cart' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'
                    }`}
                >
                    <PosCartPanel
                        cart={cart}
                        onUpdateQuantity={handleUpdateQuantity}
                        onRemoveItem={handleRemoveItem}
                        onClearCart={handleClearCart}
                        customerName={customerName}
                        onCustomerNameChange={setCustomerName}
                        paymentMethod={paymentMethod}
                        onPaymentMethodChange={setPaymentMethod}
                        studioProfile={studioProfile}
                        onOpenPaymentModal={handleOpenPaymentModal}
                        processing={processing}
                        errors={errors}
                        canEditPos={canEditPos}
                    />
                </aside>
            </div>

            {/* Mobile Sticky Charge Bar */}
            {mobileTab === 'catalog' && cartCount > 0 && (
                <div className="shrink-0 lg:hidden bg-white border-t border-stone-200 px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-lg">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setMobileTab('cart')}
                            className="min-h-[42px] px-3 rounded-lg border border-stone-300 bg-white text-xs font-bold text-stone-800 inline-flex items-center gap-1.5"
                        >
                            <ShoppingBag className="w-3.5 h-3.5 text-clay-600" />
                            <span>Ticket ({cartCount})</span>
                        </button>
                        <button
                            type="button"
                            disabled={!canEditPos || processing}
                            onClick={handleOpenPaymentModal}
                            className="flex-1 min-h-[42px] px-4 rounded-lg bg-clay-600 text-white text-xs sm:text-sm font-extrabold flex items-center justify-between"
                        >
                            <span>Charge</span>
                            <span>{formatCurrency(cartTotal)}</span>
                        </button>
                    </div>
                </div>
            )}

            <PosPaymentModal
                open={paymentModalOpen}
                onClose={() => setPaymentModalOpen(false)}
                totalAmount={cartTotal}
                itemCount={cartCount}
                customerName={customerName}
                paymentMethod={paymentMethod}
                onPaymentMethodChange={setPaymentMethod}
                cashTendered={cashTendered}
                onCashTenderedChange={setCashTendered}
                paymentReference={paymentReference}
                onPaymentReferenceChange={setPaymentReference}
                studioProfile={studioProfile}
                onOpenQrSetup={() => setQrModalOpen(true)}
                onSubmitCheckout={handleSubmitCheckout}
                processing={processing}
                errors={errors}
                canEditPos={canEditPos}
            />

            <PosRecentSalesDrawer
                open={recentSalesOpen}
                onClose={() => setRecentSalesOpen(false)}
                recentOrders={recentOrders}
                initialSummary={historySummary}
                branches={historyBranches}
                canEditPos={canEditPos}
                canVoidPos={canVoidPos}
                voidApprovers={voidApprovers}
                onSelectOrder={(order) => setActiveReceiptOrder(order)}
            />

            <PosQrSetupModal
                open={qrModalOpen}
                onClose={() => setQrModalOpen(false)}
                studioProfile={studioProfile}
            />

            <PosReceiptModal
                order={activeReceiptOrder}
                studioProfile={studioProfile}
                onClose={() => setActiveReceiptOrder(null)}
            />
        </>
    );
}

PosIndex.layout = (page) => (
    <SellerWorkspaceLayout active="pos" overflowHidden={true}>
        {page}
    </SellerWorkspaceLayout>
);
