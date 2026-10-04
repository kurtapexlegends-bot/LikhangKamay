import React, { useState } from 'react';
import { Eye, EyeOff, Copy, Check, ShieldCheck, CheckCircle2 } from 'lucide-react';

/**
 * HandoffVerificationPin
 * Interactive, secure PIN display widget for workshop pickup claims and doorstep delivery handoffs.
 * Starts shielded to prevent shoulder-surfing, with 1-tap reveal, copy-to-clipboard, and status awareness.
 */
export default function HandoffVerificationPin({
    pin,
    status = '',
    isPickup = true,
    className = ''
}) {
    const [isRevealed, setIsRevealed] = useState(false);
    const [copied, setCopied] = useState(false);

    if (!pin) return null;

    const isFinished = ['Delivered', 'Completed'].includes(status);
    const pinStr = String(pin).trim();

    const handleCopy = async (e) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(pinStr);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard fallback
            const el = document.createElement('textarea');
            el.value = pinStr;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const toggleReveal = (e) => {
        e.stopPropagation();
        setIsRevealed((prev) => !prev);
    };

    if (isFinished) {
        return (
            <div className={`flex flex-col items-center justify-center bg-stone-900/90 border border-stone-800 text-stone-300 rounded-2xl px-4 py-3 shrink-0 self-stretch sm:self-auto min-w-[130px] ${className}`}>
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-1">
                    <CheckCircle2 size={11} />
                    <span>Handoff Verified</span>
                </div>
                <span className="text-sm font-mono font-bold tracking-widest text-stone-500">
                    PIN {pinStr}
                </span>
                <span className="text-[9px] text-stone-500 font-medium mt-0.5">
                    Order Claimed
                </span>
            </div>
        );
    }

    return (
        <div className={`flex flex-col items-center justify-center bg-stone-900 border border-stone-800 text-white rounded-2xl p-3 sm:px-4 shadow-sm shrink-0 self-stretch sm:self-auto min-w-[140px] transition-all ${className}`}>
            {/* Top Label & Status */}
            <div className="flex items-center justify-between w-full gap-2 mb-1">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-stone-400 flex items-center gap-1">
                    <ShieldCheck size={10} className="text-clay-400 shrink-0" />
                    <span>{isPickup ? 'Pickup PIN' : 'Handoff PIN'}</span>
                </span>

                <button
                    type="button"
                    onClick={toggleReveal}
                    className="inline-flex items-center gap-1 text-[9px] font-bold text-clay-400 hover:text-clay-300 bg-stone-800/80 hover:bg-stone-800 px-1.5 py-0.5 rounded transition cursor-pointer"
                    aria-label={isRevealed ? 'Hide PIN' : 'Reveal PIN'}
                >
                    {isRevealed ? (
                        <>
                            <EyeOff size={10} />
                            <span>Hide</span>
                        </>
                    ) : (
                        <>
                            <Eye size={10} />
                            <span>Reveal</span>
                        </>
                    )}
                </button>
            </div>

            {/* PIN Code Box */}
            <div
                onClick={toggleReveal}
                className="my-1 py-1 px-3 rounded-xl bg-stone-950/60 border border-stone-800 flex items-center justify-center cursor-pointer select-none group w-full text-center hover:border-stone-700 transition"
                title={isRevealed ? 'Tap to hide' : 'Tap to reveal PIN'}
            >
                {isRevealed ? (
                    <span className="text-xl sm:text-2xl font-mono font-black tracking-[0.25em] text-clay-300 animate-in fade-in duration-200">
                        {pinStr}
                    </span>
                ) : (
                    <div className="flex items-center gap-1.5 py-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-clay-500/80 group-hover:bg-clay-400 transition" />
                        <span className="w-2.5 h-2.5 rounded-full bg-clay-500/80 group-hover:bg-clay-400 transition" />
                        <span className="w-2.5 h-2.5 rounded-full bg-clay-500/80 group-hover:bg-clay-400 transition" />
                        <span className="w-2.5 h-2.5 rounded-full bg-clay-500/80 group-hover:bg-clay-400 transition" />
                    </div>
                )}
            </div>

            {/* Bottom Actions & Helper Text */}
            <div className="flex items-center justify-between w-full pt-1 border-t border-stone-800/80 text-[9.5px]">
                <span className="text-stone-400 font-medium truncate max-w-[85px] sm:max-w-none text-[8.5px]">
                    {isRevealed ? 'Show at counter' : 'Tap to reveal'}
                </span>

                <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 text-[9px] font-bold text-stone-300 hover:text-white transition"
                    title="Copy PIN to clipboard"
                >
                    {copied ? (
                        <>
                            <Check size={10} className="text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                        </>
                    ) : (
                        <>
                            <Copy size={10} />
                            <span>Copy</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
