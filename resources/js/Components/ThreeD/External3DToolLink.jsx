import React from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';

const MESHY_IMAGE_TO_3D_URL = 'https://www.meshy.ai/features/image-to-3d';
const TRELLIS_2_URL = 'https://huggingface.co/spaces/microsoft/TRELLIS.2';

export default function External3DToolLink({ className = '' }) {
    return (
        <div className={`rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/60 to-orange-50/40 p-3.5 ${className}`.trim()}>
            <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-600 shrink-0" />
                    <span className="text-xs font-bold text-amber-900">Need a 3D model?</span>
                </div>
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
                    Free AI Generators
                </span>
            </div>

            <p className="text-[11px] text-stone-600 mb-2.5 leading-relaxed">
                Generate a 3D asset from photos, export as <code className="text-amber-900 font-mono text-[10px]">.glb</code>, then upload it here.
            </p>

            <div className="flex flex-wrap items-center gap-2">
                <a
                    href={MESHY_IMAGE_TO_3D_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-xs font-bold text-amber-800 shadow-2xs hover:bg-amber-100/50 hover:text-amber-900 transition min-h-[32px]"
                >
                    <span>Meshy AI</span>
                    <ArrowUpRight size={12} className="text-amber-600" />
                </a>
                <a
                    href={TRELLIS_2_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-xs font-bold text-amber-800 shadow-2xs hover:bg-amber-100/50 hover:text-amber-900 transition min-h-[32px]"
                >
                    <span>Trellis 2</span>
                    <ArrowUpRight size={12} className="text-amber-600" />
                </a>
            </div>
        </div>
    );
}
