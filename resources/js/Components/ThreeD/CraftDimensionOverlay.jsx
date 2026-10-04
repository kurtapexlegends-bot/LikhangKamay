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

    const resolvedHeight = Math.max(Number(height) || 22, 4);
    const resolvedWidth = Math.max(Number(width) || 16, 4);
    const resolvedDepth = Math.max(Number(depth) || Math.round(resolvedWidth * 0.85), 3);

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

    return (
        <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-3 select-none">
            {/* Unified Sleek Top Bar */}
            <div className="flex items-center justify-between gap-2 pointer-events-auto">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-900/90 backdrop-blur-md text-stone-200 border border-stone-800 shadow-md text-xs font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>Scale Reference</span>
                    <span className="text-[10px] text-stone-400 font-normal truncate max-w-[120px] sm:max-w-xs">
                        ({productName})
                    </span>
                </div>

                <div className="flex items-center gap-1.5">
                    {/* Launch Full 2D Height Chart Modal */}
                    {onOpenHeightChart && (
                        <button
                            type="button"
                            onClick={onOpenHeightChart}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-850 hover:bg-stone-800 text-stone-200 hover:text-white border border-stone-700/80 text-xs font-bold transition shadow-sm cursor-pointer"
                            title="Open full human height comparison chart"
                        >
                            <Ruler size={12} className="text-amber-400" />
                            <span className="hidden sm:inline">Height Chart</span>
                        </button>
                    )}

                    {/* Unit Toggle */}
                    <div className="flex items-center bg-stone-900/90 backdrop-blur-md p-0.5 rounded-xl border border-stone-800 shadow-sm text-xs">
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
                        className="p-1.5 rounded-xl bg-stone-900/90 backdrop-blur-md text-stone-400 hover:text-white border border-stone-800 shadow-sm transition cursor-pointer"
                        title="Close scale reference"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Unified Sleek Bottom Dock */}
            <div className="pointer-events-auto w-full max-w-sm sm:max-w-md mx-auto bg-stone-900/92 backdrop-blur-md border border-stone-800 rounded-2xl p-2 sm:p-2.5 shadow-2xl space-y-2">
                {/* 4-Column Grid: Adult, Desk, Phone, Mug (Always 100% visible, perfectly sized, zero clipping) */}
                <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
                    {BENCHMARKS.map((item) => {
                        const isSelected = item.id === selectedBenchmark;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => onSelectBenchmark?.(item.id)}
                                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-center transition-all cursor-pointer ${
                                    isSelected
                                        ? 'bg-amber-500 text-stone-950 shadow-sm font-black'
                                        : 'text-stone-300 hover:text-white hover:bg-stone-800/70 font-semibold'
                                }`}
                            >
                                <div className="flex items-center gap-1 text-[11px]">
                                    {getBenchmarkIcon(item.id)}
                                    <span>{item.label}</span>
                                </div>
                                <span className={`text-[9px] font-mono mt-0.5 ${isSelected ? 'text-stone-900/80 font-bold' : 'text-stone-400'}`}>
                                    {formatDim(item.heightCm)}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Single Refined Spatial Summary Line */}
                <div className="flex items-center justify-between gap-2 px-1 pt-1 border-t border-stone-800 text-[10.5px]">
                    <div className="font-mono text-amber-300 font-bold truncate">
                        {formatDim(resolvedHeight)} H × {formatDim(resolvedWidth)} W{depth ? ` × ${formatDim(resolvedDepth)} D` : ''}
                    </div>
                    <div className="text-stone-300 font-medium truncate text-right">
                        {getComparisonDescription()}
                    </div>
                </div>
            </div>
        </div>
    );
}
