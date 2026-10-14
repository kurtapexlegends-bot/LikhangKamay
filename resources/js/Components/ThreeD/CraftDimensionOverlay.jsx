import React from 'react';
import { Smartphone, Coffee, X, User, Table, Ruler } from 'lucide-react';
import { BENCHMARKS } from './RealWorldScaleBenchmark';

export default function CraftDimensionOverlay({
    isOpen,
    onClose,
    height = 22,
    width = 16,
    depth = 14,
    productName = 'Craft Piece',
    selectedBenchmark = 'human',
    onSelectBenchmark,
    unit = 'cm',
    onToggleUnit,
    onOpenHeightChart
}) {
    if (!isOpen) return null;

    const resolvedHeight = Math.min(Math.max(Number(height) || 22, 1), 200);
    const resolvedWidth = Math.min(Math.max(Number(width) || 16, 1), 200);
    const resolvedDepth = Math.min(Math.max(Number(depth) || Math.round(resolvedWidth * 0.85), 1), 200);

    const formatDim = (valCm) => {
        if (unit === 'in') {
            const inches = (valCm / 2.54).toFixed(1);
            return `${inches}″`;
        }
        return `${Math.round(valCm)} cm`;
    };

    const currentBenchmark = BENCHMARKS.find((b) => b.id === selectedBenchmark) || BENCHMARKS[0];
    const heightRatio = (resolvedHeight / currentBenchmark.heightCm).toFixed(1);

    const getComparisonDescription = () => {
        const ratioNum = Number(heightRatio);
        const targetName = currentBenchmark.name || currentBenchmark.label;
        if (Math.abs(ratioNum - 1.0) < 0.1) {
            return `Same height as ${targetName}`;
        }
        if (ratioNum > 1.0) {
            return `~${ratioNum}× taller than ${targetName}`;
        }
        return `~${(1 / ratioNum).toFixed(1)}× smaller than ${targetName}`;
    };

    const getBenchmarkIcon = (id) => {
        switch (id) {
            case 'human':
                return <User size={13} />;
            case 'desk':
                return <Table size={13} />;
            case 'mug':
                return <Coffee size={13} />;
            case 'phone':
            default:
                return <Smartphone size={13} />;
        }
    };

    const hasDepth = Boolean(depth && Number(depth) > 0);

    return (
        <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-2 sm:p-3 select-none">
            {/* Unified Sleek Top Bar */}
            <div className="flex items-center justify-between gap-2 pointer-events-auto">
                <div 
                    className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-stone-900/90 backdrop-blur-md text-stone-200 border border-stone-800 shadow-md text-xs font-bold min-w-0 shrink"
                    title={`Scale reference for ${productName}`}
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span className="truncate">Scale Reference</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {/* Launch Full 2D Height Chart Modal */}
                    {onOpenHeightChart && (
                        <button
                            type="button"
                            onClick={onOpenHeightChart}
                            className="flex items-center gap-1 px-2.5 py-1 sm:py-1.5 rounded-xl bg-stone-850 hover:bg-stone-800 text-stone-200 hover:text-white border border-stone-700/80 text-xs font-bold transition shadow-sm cursor-pointer shrink-0 min-h-[32px]"
                            title="Open full human height comparison chart"
                        >
                            <Ruler size={13} className="text-amber-400 shrink-0" />
                            <span className="hidden xl:inline">Height Chart</span>
                        </button>
                    )}

                    {/* Unit Toggle */}
                    <div className="flex items-center bg-stone-900/90 backdrop-blur-md p-0.5 rounded-xl border border-stone-800 shadow-sm text-xs shrink-0">
                        <button
                            type="button"
                            onClick={() => onToggleUnit?.('cm')}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                                unit === 'cm' ? 'bg-amber-500 text-stone-950 shadow-xs' : 'text-stone-400 hover:text-white'
                            }`}
                        >
                            CM
                        </button>
                        <button
                            type="button"
                            onClick={() => onToggleUnit?.('in')}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                                unit === 'in' ? 'bg-amber-500 text-stone-950 shadow-xs' : 'text-stone-400 hover:text-white'
                            }`}
                        >
                            IN
                        </button>
                    </div>

                    {/* Close Button */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-xl bg-stone-900/90 backdrop-blur-md text-stone-400 hover:text-white border border-stone-800 shadow-sm transition cursor-pointer shrink-0 min-h-[32px] min-w-[32px] flex items-center justify-center"
                        title="Close scale reference"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Unified Sleek Bottom Dock */}
            <div className="pointer-events-auto w-full max-w-sm sm:max-w-md mx-auto bg-stone-900/92 backdrop-blur-md border border-stone-800 rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 shadow-2xl space-y-1 sm:space-y-1.5">
                {/* 4-Column Grid: Adult, Desk, Phone, Mug */}
                <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
                    {BENCHMARKS.map((item) => {
                        const isSelected = item.id === selectedBenchmark;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => onSelectBenchmark?.(item.id)}
                                className={`flex flex-col items-center justify-center py-1 sm:py-1.5 px-1 rounded-lg sm:rounded-xl text-center transition-all cursor-pointer ${
                                    isSelected
                                        ? 'bg-amber-500 text-stone-950 shadow-sm font-black'
                                        : 'text-stone-300 hover:text-white hover:bg-stone-800/70 font-semibold'
                                }`}
                            >
                                <div className="flex items-center gap-1 text-[10px] sm:text-[11px]">
                                    {getBenchmarkIcon(item.id)}
                                    <span>{item.label}</span>
                                </div>
                                <span className={`text-[8.5px] sm:text-[9px] font-mono mt-0.5 ${isSelected ? 'text-stone-900/80 font-bold' : 'text-stone-400'}`}>
                                    {formatDim(item.heightCm)}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Single Refined Spatial Summary Line */}
                <div className="flex items-center justify-between gap-2 px-1 pt-0.5 border-t border-stone-800 text-[9.5px] sm:text-[10px]">
                    <div className="font-mono text-amber-300 font-bold truncate">
                        {formatDim(resolvedHeight)} H × {formatDim(resolvedWidth)} W{hasDepth ? ` × ${formatDim(resolvedDepth)} D` : ''}
                    </div>
                    <div className="text-stone-300 font-medium truncate text-right">
                        {getComparisonDescription()}
                    </div>
                </div>
            </div>
        </div>
    );
}
