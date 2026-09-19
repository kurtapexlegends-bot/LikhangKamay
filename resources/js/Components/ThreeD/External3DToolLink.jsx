import React from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';

const MESHY_APP_URL = 'https://www.meshy.ai/workspace';
const TRIPO_3D_URL = 'https://studio.tripo3d.ai';
const TRELLIS_2_URL = 'https://huggingface.co/spaces/microsoft/TRELLIS.2';

export default function External3DToolLink({ className = '' }) {
    return (
        <div className={`rounded-xl border border-stone-200 bg-stone-50/80 p-3 ${className}`.trim()}>
            <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5">
                    <Sparkles size={13} className="text-clay-600 shrink-0" />
                    <span className="text-xs font-bold text-stone-800">Need a 3D model?</span>
                </div>
                <span className="text-[10px] font-semibold text-stone-500 bg-stone-200/60 px-2 py-0.5 rounded-full">
                    Free AI Tools
                </span>
            </div>

            <p className="text-[11px] text-stone-500 mb-2 leading-relaxed">
                Create a 3D model from photos, download the <code className="font-mono text-[10px] text-stone-700 bg-stone-200/50 px-1 py-0.5 rounded">.glb</code> file, then upload it above.
            </p>

            <div className="grid grid-cols-2 gap-2">
                <a
                    href={MESHY_APP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white border border-stone-200 hover:border-clay-400 hover:bg-stone-50 text-xs font-semibold text-stone-700 hover:text-clay-700 transition group shadow-2xs min-h-[36px]"
                >
                    <div className="min-w-0 pr-1">
                        <span className="block truncate font-bold text-xs text-stone-800 group-hover:text-clay-700">Meshy AI</span>
                        <span className="block text-[10px] text-stone-400 group-hover:text-clay-500 truncate">Photo to 3D</span>
                    </div>
                    <ArrowUpRight size={12} className="text-stone-400 group-hover:text-clay-600 shrink-0" />
                </a>

                <a
                    href={TRIPO_3D_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white border border-stone-200 hover:border-clay-400 hover:bg-stone-50 text-xs font-semibold text-stone-700 hover:text-clay-700 transition group shadow-2xs min-h-[36px]"
                >
                    <div className="min-w-0 pr-1">
                        <span className="block truncate font-bold text-xs text-stone-800 group-hover:text-clay-700">Tripo 3D</span>
                        <span className="block text-[10px] text-stone-400 group-hover:text-clay-500 truncate">Fast generator</span>
                    </div>
                    <ArrowUpRight size={12} className="text-stone-400 group-hover:text-clay-600 shrink-0" />
                </a>
            </div>

            <div className="mt-2 pt-2 border-t border-stone-200/60 flex items-center justify-between text-[10px] text-stone-400">
                <span>More options:</span>
                <a
                    href={TRELLIS_2_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-stone-500 hover:text-clay-700 font-medium transition"
                >
                    <span>Trellis 2</span>
                    <ArrowUpRight size={10} className="text-stone-400" />
                </a>
            </div>
        </div>
    );
}
