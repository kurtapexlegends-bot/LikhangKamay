import React, { useState } from 'react';
import Modal from '@/Components/Modal';
import { X, Ruler, Sparkles, RefreshCw, MoveHorizontal, ArrowUpRight } from 'lucide-react';

const MAX_CHART_HEIGHT_CM = 220; // 220 cm scale covers up to 7ft 2in

function HeightComparisonContent({
    onClose = () => {},
    productName = 'Craft Piece',
    initialHeight = 22,
    initialWidth = 16,
    category = 'Craft'
}) {
    const baseHeight = Math.max(Number(initialHeight) || 22, 2);
    const baseWidth = Math.max(Number(initialWidth) || 16, 2);

    const [testHeight, setTestHeight] = useState(baseHeight);
    const [testWidth, setTestWidth] = useState(baseWidth);
    const [unit, setUnit] = useState('cm'); // 'cm' | 'in'
    const [placement, setPlacement] = useState(baseHeight >= 55 ? 'floor' : 'tabletop');
    const [showDesk, setShowDesk] = useState(true);
    const [showPhone, setShowPhone] = useState(baseHeight < 70);
    const [showMug, setShowMug] = useState(baseHeight < 25);

    const formatDim = (valCm) => {
        if (unit === 'in') {
            const inches = (valCm / 2.54).toFixed(1);
            return `${inches}″`;
        }
        return `${Math.round(valCm)} cm`;
    };

    const formatHeightFull = (valCm) => {
        if (unit === 'in') {
            const totalInches = valCm / 2.54;
            const feet = Math.floor(totalInches / 12);
            const remainderInches = Math.round(totalInches % 12);
            return `${feet}′ ${remainderInches}″ (${Math.round(valCm)} cm)`;
        }
        return `${Math.round(valCm)} cm (${(valCm / 2.54).toFixed(1)}″)`;
    };

    // Desk height = 75 cm
    const deskHeightCm = 75;
    const effectiveCraftBaseY = placement === 'tabletop' ? deskHeightCm : 0;
    const effectiveCraftTopY = effectiveCraftBaseY + testHeight;

    // Relative heights as % of 220 cm
    const toPercent = (cm) => Math.min(Math.max((cm / MAX_CHART_HEIGHT_CM) * 100, 0), 100);

    const getAnatomicalLevel = (heightCm) => {
        if (heightCm >= 170) return 'Adult Head Level (170+ cm)';
        if (heightCm >= 145) return 'Shoulder Level (~145 cm)';
        if (heightCm >= 120) return 'Chest Level (~125 cm)';
        if (heightCm >= 95) return 'Waist / Counter Level (~100 cm)';
        if (heightCm >= 70) return 'Desk / Tabletop Level (~75 cm)';
        if (heightCm >= 45) return 'Knee / Seat Level (~50 cm)';
        if (heightCm >= 25) return 'Shin Level (~30 cm)';
        return 'Tabletop Accent / Handheld (<25 cm)';
    };

    const getScalePerceptionText = () => {
        if (placement === 'tabletop') {
            return `When placed on a standard desk (75 cm / 2′ 5″), the top reaches ${formatHeightFull(effectiveCraftTopY)}. ${
                effectiveCraftTopY > 120
                    ? 'This creates a tall tabletop presence that stands above eye level when seated.'
                    : 'Comfortable tabletop height that leaves open sightlines across dining tables or work desks.'
            }`;
        }

        if (testHeight >= 140) {
            return `At ${formatHeightFull(testHeight)}, this is a monumental floor-standing statement piece that reaches adult eye level.`;
        }
        if (testHeight >= 100) {
            return `At ${formatHeightFull(testHeight)}, this piece reaches chest height on an average adult (170 cm / 5′ 7″). Ideal as a majestic floor vase or entryway accent.`;
        }
        if (testHeight >= 60) {
            return `At ${formatHeightFull(testHeight)}, this reaches waist-to-mid-torso height. Excellent as a floor planter, low pedestal sculpture, or corner feature.`;
        }
        if (testHeight >= 35) {
            return `At ${formatHeightFull(testHeight)}, this reaches knee-to-thigh height on the floor, or acts as a prominent centerpiece on a coffee table or sideboard.`;
        }
        return `At ${formatHeightFull(testHeight)}, this is a compact handheld item. Recommended for desks, shelves, or bedside tables.`;
    };

    const handleReset = () => {
        setTestHeight(baseHeight);
        setTestWidth(baseWidth);
        setPlacement(baseHeight >= 55 ? 'floor' : 'tabletop');
        setShowDesk(true);
        setShowPhone(baseHeight < 70);
        setShowMug(baseHeight < 25);
    };

    // Major ruler tick marks
    const rulerTicks = [0, 25, 50, 75, 100, 125, 150, 175, 200];

    return (
        <div className="flex flex-col w-full text-stone-100">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-stone-800 bg-stone-950/70">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-clay-500/10 border border-clay-500/30 flex items-center justify-center text-clay-400 shrink-0">
                        <Ruler size={16} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                                Real-Life Scale & Height Comparison
                            </h3>
                            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-stone-800 text-[10px] font-semibold text-stone-300 border border-stone-700">
                                {category}
                            </span>
                        </div>
                        <p className="text-[11px] text-stone-400 truncate max-w-xs sm:max-w-md">
                            {productName} compared against an adult human and everyday benchmarks
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Unit Switcher */}
                    <div className="flex items-center bg-stone-800/90 p-0.5 rounded-xl border border-stone-700/80 text-xs">
                        <button
                            type="button"
                            onClick={() => setUnit('cm')}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                unit === 'cm' ? 'bg-clay-600 text-white shadow-xs' : 'text-stone-400 hover:text-white'
                            }`}
                        >
                            Metric (CM)
                        </button>
                        <button
                            type="button"
                            onClick={() => setUnit('in')}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                unit === 'in' ? 'bg-clay-600 text-white shadow-xs' : 'text-stone-400 hover:text-white'
                            }`}
                        >
                            Imperial (IN)
                        </button>
                    </div>

                    {/* Close Button */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition cursor-pointer"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Subheader: Placement Selector & Reference Toggles */}
            <div className="px-4 sm:px-6 py-2.5 bg-stone-950/40 border-b border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                    <span className="text-stone-400 font-semibold text-[11px]">Placement:</span>
                    <div className="flex items-center bg-stone-800/80 p-0.5 rounded-lg border border-stone-700">
                        <button
                            type="button"
                            onClick={() => setPlacement('floor')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                                placement === 'floor' ? 'bg-clay-600 text-white shadow-xs' : 'text-stone-300 hover:text-white'
                            }`}
                        >
                            Floor Standing
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setPlacement('tabletop');
                                setShowDesk(true);
                            }}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                                placement === 'tabletop' ? 'bg-clay-600 text-white shadow-xs' : 'text-stone-300 hover:text-white'
                            }`}
                        >
                            On Tabletop (Desk)
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-stone-400 font-semibold text-[11px] mr-1 hidden sm:inline">References:</span>
                    <button
                        type="button"
                        onClick={() => setShowDesk(!showDesk)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition cursor-pointer ${
                            showDesk
                                ? 'bg-stone-800 text-clay-300 border-clay-600/40'
                                : 'bg-stone-900 text-stone-500 border-stone-800 hover:text-stone-400'
                        }`}
                    >
                        Desk ({formatDim(75)})
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowPhone(!showPhone)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition cursor-pointer ${
                            showPhone
                                ? 'bg-stone-800 text-clay-300 border-clay-600/40'
                                : 'bg-stone-900 text-stone-500 border-stone-800 hover:text-stone-400'
                        }`}
                    >
                        iPhone 15 ({formatDim(14.7)})
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowMug(!showMug)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition cursor-pointer ${
                            showMug
                                ? 'bg-stone-800 text-clay-300 border-clay-600/40'
                                : 'bg-stone-900 text-stone-500 border-stone-800 hover:text-stone-400'
                        }`}
                    >
                        Mug ({formatDim(9.5)})
                    </button>
                </div>
            </div>

            {/* Main Visual Scale Canvas */}
            <div className="relative flex-1 min-h-[340px] sm:min-h-[420px] bg-stone-950 overflow-hidden select-none">
                {/* Background Grid Lines & Ruler */}
                <div className="absolute inset-0 flex">
                    {/* Ruler Column */}
                    <div className="w-14 sm:w-16 border-r border-stone-800 bg-stone-950/80 relative shrink-0">
                        {rulerTicks.map((cm) => {
                            const bottomPercent = toPercent(cm);
                            const isMajor = cm % 50 === 0;
                            return (
                                <div
                                    key={cm}
                                    style={{ bottom: `${bottomPercent}%` }}
                                    className="absolute left-0 right-0 flex items-center justify-end pr-2 translate-y-1/2"
                                >
                                    <span className={`font-mono text-[9px] sm:text-[10px] ${isMajor ? 'text-clay-300 font-bold' : 'text-stone-500'}`}>
                                        {unit === 'in' ? `${(cm / 2.54).toFixed(0)}″` : `${cm}`}
                                    </span>
                                    <div
                                        className={`ml-1 h-[1px] ${isMajor ? 'w-2.5 bg-clay-500/80' : 'w-1.5 bg-stone-700'}`}
                                    />
                                </div>
                            );
                        })}
                        <div className="absolute top-2 left-2 text-[9px] font-bold text-stone-500 uppercase tracking-widest">
                            {unit === 'in' ? 'INCHES' : 'CM'}
                        </div>
                    </div>

                    {/* Chart Grid Lines */}
                    <div className="relative flex-1">
                        {rulerTicks.map((cm) => {
                            const bottomPercent = toPercent(cm);
                            const isMajor = cm % 50 === 0;
                            return (
                                <div
                                    key={cm}
                                    style={{ bottom: `${bottomPercent}%` }}
                                    className={`absolute left-0 right-0 border-b pointer-events-none ${
                                        isMajor ? 'border-stone-800 border-dashed' : 'border-stone-900/60'
                                    }`}
                                />
                            );
                        })}

                        {/* Ground Line */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-stone-700 border-t border-stone-600 z-10" />

                        {/* Stage Silhouettes Container */}
                        <div className="absolute inset-0 pl-4 pr-4 sm:pl-8 sm:pr-8 flex items-end justify-around pb-1">
                            
                            {/* 1. Adult Human Silhouette (170 cm) */}
                            <div
                                style={{ height: `${toPercent(170)}%` }}
                                className="relative flex flex-col items-center shrink-0 w-24 sm:w-32 transition-all"
                            >
                                {/* Top Height Badge */}
                                <div className="absolute -top-7 px-2 py-0.5 rounded-full bg-stone-850 text-stone-200 text-[9px] font-bold border border-stone-700 shadow-md whitespace-nowrap">
                                    Human ({formatHeightFull(170)})
                                </div>

                                {/* Anatomical guideline pins */}
                                <div
                                    style={{ bottom: `${(125 / 170) * 100}%` }}
                                    className="absolute left-full ml-1 border-b border-stone-750 w-3 pointer-events-none"
                                />
                                <div
                                    style={{ bottom: `${(75 / 170) * 100}%` }}
                                    className="absolute left-full ml-1 border-b border-stone-750 w-3 pointer-events-none"
                                />

                                {/* Clean Vector Human Silhouette */}
                                <svg
                                    viewBox="0 0 100 240"
                                    className="w-full h-full text-stone-700 hover:text-stone-600 drop-shadow-md transition-colors"
                                    fill="currentColor"
                                >
                                    {/* Head */}
                                    <ellipse cx="50" cy="18" rx="10" ry="13" />
                                    {/* Neck */}
                                    <rect x="47" y="30" width="6" height="6" rx="2" />
                                    {/* Torso & Shoulders */}
                                    <path d="M 28 38 C 36 34, 64 34, 72 38 C 76 45, 74 90, 71 106 C 65 110, 35 110, 29 106 C 26 90, 24 45, 28 38 Z" />
                                    {/* Left Arm */}
                                    <path d="M 26 39 C 23 48, 20 80, 20 105 C 20 110, 25 110, 26 105 C 28 85, 29 55, 30 43 Z" />
                                    {/* Right Arm */}
                                    <path d="M 74 39 C 77 48, 80 80, 80 105 C 80 110, 75 110, 74 105 C 72 85, 71 55, 70 43 Z" />
                                    {/* Legs */}
                                    <path d="M 31 108 C 32 140, 33 190, 31 236 C 31 240, 47 240, 47 236 C 48 190, 49 140, 49 110 Z" />
                                    <path d="M 51 110 C 51 140, 52 190, 53 236 C 53 240, 69 240, 69 236 C 67 190, 68 140, 69 108 Z" />
                                </svg>
                            </div>

                            {/* 2. Table / Desk Silhouette (75 cm) */}
                            {showDesk && (
                                <div
                                    style={{ height: `${toPercent(deskHeightCm)}%` }}
                                    className="relative flex flex-col items-center shrink-0 w-36 sm:w-48 transition-all"
                                >
                                    <div className="absolute -top-6 px-2 py-0.5 rounded-full bg-stone-850 text-stone-300 text-[9px] font-semibold border border-stone-700 shadow-md whitespace-nowrap">
                                        Desk ({formatDim(deskHeightCm)})
                                    </div>

                                    {/* Desk Vector Silhouette */}
                                    <svg viewBox="0 0 160 100" className="w-full h-full text-stone-800" fill="currentColor">
                                        {/* Tabletop */}
                                        <rect x="0" y="0" width="160" height="7" rx="2" fill="#44403c" />
                                        {/* Apron */}
                                        <rect x="8" y="7" width="144" height="4" fill="#292524" />
                                        {/* Left Leg */}
                                        <rect x="10" y="11" width="7" height="89" rx="1.5" fill="#292524" />
                                        {/* Right Leg */}
                                        <rect x="143" y="11" width="7" height="89" rx="1.5" fill="#292524" />
                                        {/* Crossbar */}
                                        <rect x="17" y="70" width="126" height="3" fill="#1c1917" opacity="0.6" />
                                    </svg>

                                    {/* Craft sitting on tabletop when placement === 'tabletop' */}
                                    {placement === 'tabletop' && (
                                        <div
                                            style={{
                                                bottom: '100%',
                                                height: `${(testHeight / deskHeightCm) * 100}%`,
                                                maxHeight: `${((MAX_CHART_HEIGHT_CM - deskHeightCm) / deskHeightCm) * 100}%`,
                                                aspectRatio: `${testWidth} / ${testHeight}`,
                                                maxWidth: '220px',
                                                minWidth: '16px'
                                            }}
                                            className="absolute flex flex-col items-center"
                                        >
                                            {/* Top Guideline Badge */}
                                            <div className="absolute -top-7 px-2.5 py-0.5 rounded-full bg-clay-600 text-white text-[10px] font-bold border border-clay-500 shadow-lg whitespace-nowrap z-20 flex items-center gap-1">
                                                <span>{formatDim(testHeight)}</span>
                                                <span className="text-[9px] opacity-80">({getAnatomicalLevel(effectiveCraftTopY)})</span>
                                            </div>

                                            {/* Craft Silhouette */}
                                            <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-lg" fill="none">
                                                <path
                                                    d="M 38 4 C 42 2, 58 2, 62 4 C 64 8, 62 18, 58 22 C 78 35, 88 75, 82 108 C 80 116, 20 116, 18 108 C 12 75, 22 35, 42 22 C 38 18, 36 8, 38 4 Z"
                                                    fill="#b45309"
                                                    stroke="#d97706"
                                                    strokeWidth="2"
                                                />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 3. The Craft Piece (Floor Placement) */}
                            {placement === 'floor' && (
                                <div
                                    style={{
                                        height: `${toPercent(testHeight)}%`,
                                        aspectRatio: `${testWidth} / ${testHeight}`,
                                        maxWidth: '260px',
                                        minWidth: '20px'
                                    }}
                                    className="relative flex flex-col items-center shrink-0 transition-all z-20"
                                >
                                    {/* Measurement Guideline Line stretching to Human */}
                                    <div className="absolute top-0 right-1/2 w-40 sm:w-64 border-b border-dashed border-clay-400/60 pointer-events-none -translate-x-4" />

                                    {/* Floating Badge */}
                                    <div className="absolute -top-7 px-2.5 py-0.5 rounded-full bg-clay-600 text-white text-[10px] font-bold border border-clay-500 shadow-xl whitespace-nowrap z-20 flex items-center gap-1">
                                        <Sparkles size={10} />
                                        <span>{formatDim(testHeight)}</span>
                                        <span className="text-[9px] opacity-80">({getAnatomicalLevel(testHeight)})</span>
                                    </div>

                                    {/* Craft Silhouette */}
                                    <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-xl" fill="none">
                                        <path
                                            d="M 38 4 C 42 2, 58 2, 62 4 C 64 8, 62 18, 58 22 C 78 35, 88 75, 82 108 C 80 116, 20 116, 18 108 C 12 75, 22 35, 42 22 C 38 18, 36 8, 38 4 Z"
                                            fill="#b45309"
                                            stroke="#d97706"
                                            strokeWidth="2"
                                        />
                                    </svg>

                                    <span className="absolute -bottom-5 text-[9px] font-bold text-clay-300 truncate max-w-[120px] text-center">
                                        {productName}
                                    </span>
                                </div>
                            )}

                            {/* 4. Smartphone / iPhone 15 (14.7 cm) Reference */}
                            {showPhone && (
                                <div
                                    style={{
                                        height: `${toPercent(14.7)}%`,
                                        aspectRatio: '7.15 / 14.7'
                                    }}
                                    className="relative flex flex-col items-center shrink-0 transition-all"
                                >
                                    <div className="absolute -top-5 px-1 py-0.2 rounded bg-stone-850 text-[8px] font-semibold text-stone-300 border border-stone-700 whitespace-nowrap">
                                        iPhone 15
                                    </div>
                                    <div className="w-full h-full bg-slate-500 rounded-[2px] border border-slate-400 shadow-xs" />
                                </div>
                            )}

                            {/* 5. Coffee Mug (9.5 cm) Reference */}
                            {showMug && (
                                <div
                                    style={{
                                        height: `${toPercent(9.5)}%`,
                                        aspectRatio: '8.2 / 9.5'
                                    }}
                                    className="relative flex flex-col items-center shrink-0 transition-all"
                                >
                                    <div className="absolute -top-5 px-1 py-0.2 rounded bg-stone-850 text-[8px] font-semibold text-stone-300 border border-stone-700 whitespace-nowrap">
                                        Mug
                                    </div>
                                    <div className="w-full h-full bg-stone-300 rounded-b-[2px] border border-stone-200 shadow-xs" />
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Controls & Live Dimension Sliders */}
            <div className="p-4 sm:p-5 bg-stone-950 border-t border-stone-800 space-y-3">
                {/* Dimension Tweakers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-900/90 p-3 rounded-2xl border border-stone-800 text-xs">
                    {/* Height Slider */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-stone-300 flex items-center gap-1">
                                <ArrowUpRight size={13} className="text-clay-400" />
                                <span>Height ({unit === 'in' ? 'inches' : 'cm'}):</span>
                            </span>
                            <span className="font-mono text-clay-400 font-bold text-xs">
                                {formatDim(testHeight)}
                            </span>
                        </div>
                        <input
                            type="range"
                            min="5"
                            max="200"
                            value={testHeight}
                            onChange={(e) => setTestHeight(Number(e.target.value))}
                            className="w-full accent-clay-500 cursor-pointer h-1.5 bg-stone-750 rounded-lg"
                        />
                    </div>

                    {/* Width Slider */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-stone-300 flex items-center gap-1">
                                <MoveHorizontal size={13} className="text-clay-400" />
                                <span>Width ({unit === 'in' ? 'inches' : 'cm'}):</span>
                            </span>
                            <span className="font-mono text-clay-400 font-bold text-xs">
                                {formatDim(testWidth)}
                            </span>
                        </div>
                        <input
                            type="range"
                            min="5"
                            max="150"
                            value={testWidth}
                            onChange={(e) => setTestWidth(Number(e.target.value))}
                            className="w-full accent-clay-500 cursor-pointer h-1.5 bg-stone-750 rounded-lg"
                        />
                    </div>
                </div>

                {/* Scale Perception Summary & Reset Button */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                    <p className="text-xs text-stone-300 leading-relaxed max-w-2xl">
                        <span className="font-bold text-clay-400 mr-1.5">Spatial Context:</span>
                        {getScalePerceptionText()}
                    </p>

                    <button
                        type="button"
                        onClick={handleReset}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-850 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-750 text-xs font-semibold transition shrink-0 cursor-pointer"
                    >
                        <RefreshCw size={12} />
                        <span>Reset Specs</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * HeightComparisonModal
 * Visual height and physical scale comparison tool inspired by human height comparison charts.
 * Portaled cleanly via @/Components/Modal to avoid CSS transform containment bugs.
 */
export default function HeightComparisonModal({
    isOpen = false,
    onClose = () => {},
    productName = 'Craft Piece',
    initialHeight = 22,
    initialWidth = 16,
    category = 'Craft'
}) {
    return (
        <Modal
            show={isOpen}
            onClose={onClose}
            maxWidth="4xl"
            panelClassName="bg-stone-900 border border-stone-800 text-stone-100 overflow-hidden"
        >
            {isOpen && (
                <HeightComparisonContent
                    key={`${productName}-${initialHeight}-${initialWidth}`}
                    onClose={onClose}
                    productName={productName}
                    initialHeight={initialHeight}
                    initialWidth={initialWidth}
                    category={category}
                />
            )}
        </Modal>
    );
}
