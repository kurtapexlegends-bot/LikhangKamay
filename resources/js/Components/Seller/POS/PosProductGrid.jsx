/* global route */
import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import {
    Search,
    X,
    AlertTriangle,
    Package,
    Tag,
    LayoutGrid,
    List,
    Plus,
    History,
    QrCode,
    ClipboardList,
} from 'lucide-react';

const formatCurrency = (value) =>
    new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
    }).format(Number(value || 0));

export default function PosProductGrid({
    products,
    categories,
    searchQuery,
    onSearchChange,
    selectedCategory,
    onCategoryChange,
    cartQuantities,
    onAddProduct,
    canEditPos,
    recentCount = 0,
    onOpenRecentSales,
    onOpenQrSetup,
}) {
    const [viewMode, setViewMode] = useState('grid');

    return (
        <div className="flex flex-col h-full min-h-0 bg-[#FAF7F4]">
            {/* Slim Register Search, Toolbar & Category Strip */}
            <div className="shrink-0 bg-white border-b border-stone-200 px-3 py-2 space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                    <div className="relative flex-1 min-w-[180px] flex items-center">
                        <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Search products by name or SKU..."
                            className="w-full h-8 max-md:min-h-[40px] pl-8 pr-8 rounded-lg border border-stone-200 bg-stone-50 text-xs text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-clay-500 focus:ring-clay-500"
                        />
                        {searchQuery && (
                            <div className="absolute right-1.5 flex items-center">
                                <button
                                    type="button"
                                    onClick={() => onSearchChange('')}
                                    aria-label="Clear search"
                                    className="h-6 w-6 flex items-center justify-center rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Grid / List View Switcher */}
                    <div className="inline-flex items-center p-0.5 rounded-lg bg-stone-100 border border-stone-200 shrink-0">
                        <button
                            type="button"
                            onClick={() => setViewMode('grid')}
                            aria-label="Grid view"
                            className={`h-7 w-7 flex items-center justify-center rounded-md transition-colors ${
                                viewMode === 'grid'
                                    ? 'bg-white text-clay-700 shadow-2xs'
                                    : 'text-stone-500 hover:text-stone-800'
                            }`}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('list')}
                            aria-label="Compact list view"
                            className={`h-7 w-7 flex items-center justify-center rounded-md transition-colors ${
                                viewMode === 'list'
                                    ? 'bg-white text-clay-700 shadow-2xs'
                                    : 'text-stone-500 hover:text-stone-800'
                            }`}
                        >
                            <List className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* POS Utility Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            type="button"
                            onClick={onOpenRecentSales}
                            className="h-8 max-md:min-h-[40px] px-2.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-[11px] font-bold text-stone-700 inline-flex items-center gap-1"
                        >
                            <History className="w-3.5 h-3.5 text-clay-600" />
                            <span>History</span>
                            {recentCount > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-stone-100 text-[10px] font-bold text-stone-700 leading-none">
                                    {Number(recentCount).toLocaleString('en-US')}
                                </span>
                            )}
                        </button>

                        {canEditPos && (
                            <button
                                type="button"
                                onClick={onOpenQrSetup}
                                className="h-8 max-md:min-h-[40px] px-2.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-[11px] font-bold text-stone-700 inline-flex items-center gap-1"
                            >
                                <QrCode className="w-3.5 h-3.5 text-clay-600" />
                                <span className="hidden sm:inline">QR Setup</span>
                            </button>
                        )}

                        <Link
                            href={route('orders.index')}
                            className="h-8 max-md:min-h-[40px] px-2.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-[11px] font-bold text-stone-700 inline-flex items-center gap-1"
                        >
                            <ClipboardList className="w-3.5 h-3.5 text-stone-600" />
                            <span className="hidden sm:inline">Orders</span>
                        </Link>
                    </div>
                </div>

                {/* Category Filter Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                    <button
                        type="button"
                        onClick={() => onCategoryChange('All')}
                        className={`shrink-0 h-7 px-2.5 rounded-md text-[11px] font-bold transition-colors leading-none ${
                            selectedCategory === 'All'
                                ? 'bg-stone-900 text-white'
                                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        }`}
                    >
                        All ({products.length})
                    </button>
                    {categories.map((category) => (
                        <button
                            key={category}
                            type="button"
                            onClick={() => onCategoryChange(category)}
                            className={`shrink-0 h-7 px-2.5 rounded-md text-[11px] font-semibold transition-colors leading-none ${
                                selectedCategory === category
                                    ? 'bg-stone-900 text-white'
                                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                            }`}
                        >
                            {category}
                        </button>
                    ))}
                </div>
            </div>

            {/* Scrollable High-Density POS Catalog */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-3">
                {products.length === 0 ? (
                    <div className="h-full min-h-[180px] bg-white border border-stone-200 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                        <Package className="w-8 h-8 text-stone-300 mb-2" />
                        <p className="text-xs font-semibold text-stone-700">No active retail products match</p>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
                        {products.map((product) => {
                            const inCartQty = cartQuantities[product.id] || 0;
                            const isOutOfStock = product.stock <= 0;
                            const atMaxStock = inCartQty >= product.stock;
                            const isDisabled = !canEditPos || isOutOfStock || atMaxStock;

                            return (
                                <button
                                    key={product.id}
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() => onAddProduct(product, false)}
                                    className={`group text-left bg-white rounded-lg border transition-all overflow-hidden flex flex-col ${
                                        inCartQty > 0
                                            ? 'border-clay-600 ring-1 ring-clay-500 bg-clay-50/20 shadow-2xs'
                                            : 'border-stone-200 hover:border-clay-400 hover:shadow-2xs'
                                    } ${isDisabled ? 'opacity-55 cursor-not-allowed' : 'active:scale-[0.98]'}`}
                                >
                                    <div className="relative h-16 sm:h-[72px] w-full bg-stone-100 overflow-hidden">
                                        <img
                                            src={product.img || '/images/placeholder.svg'}
                                            alt={product.name}
                                            loading="lazy"
                                            onError={(e) => {
                                                e.currentTarget.src = '/images/placeholder.svg';
                                                e.currentTarget.onerror = null;
                                            }}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />

                                        <span
                                            className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold leading-none shadow-2xs ${
                                                isOutOfStock
                                                    ? 'bg-red-600 text-white'
                                                    : product.stock <= 5
                                                        ? 'bg-amber-500 text-white'
                                                        : 'bg-white/95 text-stone-800 border border-stone-200/80'
                                            }`}
                                        >
                                            {isOutOfStock ? 'Out' : `${product.stock}`}
                                        </span>

                                        {inCartQty > 0 && (
                                            <span className="absolute bottom-1 right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-clay-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                                                {inCartQty}x
                                            </span>
                                        )}

                                        {product.has_discount && product.discount_info && (
                                            <span className="absolute top-1 right-1 inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-600 text-white text-[9px] font-bold leading-none">
                                                <Tag className="w-2.5 h-2.5" />
                                                {product.discount_info.percentage_off > 0
                                                    ? `-${product.discount_info.percentage_off}%`
                                                    : 'PROMO'}
                                            </span>
                                        )}
                                    </div>

                                    <div className="p-2 flex flex-col flex-1 justify-between gap-1">
                                        <div>
                                            <h3 className="text-[11px] font-bold text-stone-900 line-clamp-2 leading-tight">
                                                {product.name}
                                            </h3>
                                            {product.sku && (
                                                <p className="mt-0.5 text-[9px] font-mono text-stone-400 truncate">
                                                    {product.sku}
                                                </p>
                                            )}
                                            {product.bom_shortage && (
                                                <span className="mt-1 inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-50 border border-amber-200 text-[9px] font-semibold text-amber-800 leading-none">
                                                    <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                                    Low material
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-baseline gap-1 pt-1 border-t border-stone-100">
                                            <span className="text-xs font-extrabold text-clay-700">
                                                {formatCurrency(product.effective_price)}
                                            </span>
                                            {product.has_discount && Number(product.price) > Number(product.effective_price) && (
                                                <span className="text-[9px] text-stone-400 line-through">
                                                    {formatCurrency(product.price)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white border border-stone-200 rounded-lg divide-y divide-stone-100 overflow-hidden">
                        {products.map((product) => {
                            const inCartQty = cartQuantities[product.id] || 0;
                            const isOutOfStock = product.stock <= 0;
                            const atMaxStock = inCartQty >= product.stock;
                            const isDisabled = !canEditPos || isOutOfStock || atMaxStock;

                            return (
                                <button
                                    key={product.id}
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() => onAddProduct(product, false)}
                                    className={`w-full text-left px-3 py-1.5 flex items-center gap-2.5 transition-colors ${
                                        inCartQty > 0 ? 'bg-clay-50/40' : 'hover:bg-stone-50'
                                    } ${isDisabled ? 'opacity-55 cursor-not-allowed' : ''}`}
                                >
                                    <img
                                        src={product.img || '/images/placeholder.svg'}
                                        alt={product.name}
                                        loading="lazy"
                                        onError={(e) => {
                                            e.currentTarget.src = '/images/placeholder.svg';
                                            e.currentTarget.onerror = null;
                                        }}
                                        className="w-8 h-8 rounded object-cover bg-stone-100 shrink-0 border border-stone-200"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-xs font-bold text-stone-900 truncate">
                                                {product.name}
                                            </p>
                                            {inCartQty > 0 && (
                                                <span className="px-1.5 py-0.5 rounded-full bg-clay-600 text-white text-[9px] font-bold shrink-0 leading-none">
                                                    {inCartQty}x
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-stone-500">
                                            {product.sku && <span className="font-mono">{product.sku}</span>}
                                            <span>{isOutOfStock ? 'Sold Out' : `${product.stock} stock`}</span>
                                            {product.bom_shortage && (
                                                <span className="text-amber-700 font-semibold">Low material</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className="text-right">
                                            <p className="text-xs font-extrabold text-clay-700">
                                                {formatCurrency(product.effective_price)}
                                            </p>
                                            {product.has_discount && Number(product.price) > Number(product.effective_price) && (
                                                <p className="text-[9px] text-stone-400 line-through">
                                                    {formatCurrency(product.price)}
                                                </p>
                                            )}
                                        </div>
                                        <span className="w-6 h-6 rounded bg-stone-100 flex items-center justify-center text-stone-700">
                                            <Plus className="w-3.5 h-3.5" />
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
