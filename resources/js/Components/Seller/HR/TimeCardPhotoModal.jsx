import React from 'react';
import Modal from '@/Components/Modal';
import { X } from 'lucide-react';

export default function TimeCardPhotoModal({
    photoData,
    onClose,
}) {
    if (!photoData) return null;

    return (
        <Modal
            show={Boolean(photoData)}
            onClose={onClose}
            maxWidth="md"
            bottomSheet={true}
        >
            <div className="p-5 space-y-4 bg-white rounded-3xl">
                <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                    <div>
                        <h3 className="text-sm font-extrabold text-stone-900">Clock-In Photo Verification</h3>
                        <p className="text-[11px] text-stone-500 font-medium">Captured face check at shift start</p>
                    </div>
                    <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer">
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-3">
                    <div className="relative rounded-2xl overflow-hidden border border-stone-200 bg-stone-900 max-h-[380px] flex items-center justify-center">
                        <img
                            src={photoData.url}
                            alt="Clock-in face verification"
                            className="w-full h-auto max-h-[380px] object-contain"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-stone-50 p-3 rounded-2xl border border-stone-200/60">
                        <div>
                            <span className="text-[10px] font-bold uppercase text-stone-400 block">Shift Date &amp; Time</span>
                            <span className="font-bold text-stone-800">{photoData.date} • {photoData.time}</span>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold uppercase text-stone-400 block">Store Distance</span>
                            <span className={`font-bold ${photoData.onSite ? 'text-emerald-700' : 'text-rose-700'}`}>
                                {photoData.distance !== null ? `${photoData.onSite ? 'On-Site' : 'Off-Site'} (${photoData.distance}m)` : 'Unverified'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
