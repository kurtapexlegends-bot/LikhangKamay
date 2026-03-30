import React from 'react';
import { ArrowUpRight, Cuboid } from 'lucide-react';

const MESHY_IMAGE_TO_3D_URL = 'https://www.meshy.ai/features/image-to-3d';

export default function External3DToolLink({ className = '' }) {
    return (
        <div className={`mt-3 flex items-start gap-2 rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-2.5 ${className}`.trim()}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-clay-600 shadow-sm">
                <Cuboid size={16} />
            </div>
            <div className="min-w-0">
                <p className="text-[11px] font-semibold leading-5 text-stone-700">
                    Need to create a 3D file first?{' '}
                    <a
                        href={MESHY_IMAGE_TO_3D_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-clay-600 transition hover:text-clay-700 hover:underline"
                    >
                        Open Meshy (free tier)
                        <ArrowUpRight size={12} />
                    </a>
                </p>
                <p className="mt-0.5 text-[10px] leading-4 text-stone-500">
                    Generate in Meshy, export as .glb or .gltf, then upload it back here.
                </p>
            </div>
        </div>
    );
}
