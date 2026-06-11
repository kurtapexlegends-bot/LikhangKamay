import React, { useState, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import { RotateCcw, UploadCloud, XCircle } from 'lucide-react';
import Modal from '@/Components/Modal';
import SlideOverDrawer from '@/Components/SlideOverDrawer';

export default function ReturnRequestModal({ isOpen, onClose, order }) {
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        reason: '',
        proof_photos: [],
    });

    const [previewUrls, setPreviewUrls] = useState([]);
    const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const handleResize = () => setIsMobileOrTablet(window.innerWidth < 1024);
            handleResize();
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, []);

    const revokePreviews = () => {
        previewUrls.forEach(url => {
            if (url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        });
    };

    useEffect(() => {
        if (!isOpen) {
            reset();
            clearErrors();
            revokePreviews();
            setPreviewUrls([]);
        }
    }, [isOpen]);

    useEffect(() => {
        return () => revokePreviews();
    }, [previewUrls]);

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + data.proof_photos.length > 5) {
            alert('You can upload up to 5 photos in total.');
            return;
        }
        const updatedFiles = [...data.proof_photos, ...files];
        setData('proof_photos', updatedFiles);

        const newUrls = files.map(file => URL.createObjectURL(file));
        setPreviewUrls([...previewUrls, ...newUrls]);
    };

    const handleRemoveFile = (index) => {
        const updatedFiles = [...data.proof_photos];
        updatedFiles.splice(index, 1);
        setData('proof_photos', updatedFiles);

        const updatedUrls = [...previewUrls];
        if (updatedUrls[index]?.startsWith('blob:')) {
            URL.revokeObjectURL(updatedUrls[index]);
        }
        updatedUrls.splice(index, 1);
        setPreviewUrls(updatedUrls);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('my-orders.dispute', order.id), {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    };

    if (!order) return null;

    const renderFormContent = () => (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Reason */}
            <div>
                <label className="block text-sm font-bold text-stone-700 mb-1">Reason for Return</label>
                <textarea
                    className="w-full border-stone-300 rounded-xl focus:ring-orange-500 focus:border-orange-500 shadow-sm text-sm"
                    rows="3"
                    placeholder="Describe what is wrong with the item (damaged, wrong item sent)..."
                    value={data.reason}
                    onChange={(e) => setData('reason', e.target.value)}
                    required
                ></textarea>
                {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason}</p>}
            </div>

            {/* Image Upload */}
            <div>
                <label className="block text-sm font-bold text-stone-700 mb-1">Proof Photos (Up to 5)</label>
                <label className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-stone-300 rounded-xl cursor-pointer bg-stone-50 hover:border-stone-400 transition-colors">
                    <div className="space-y-1 text-center">
                        <UploadCloud className="mx-auto h-10 w-10 text-stone-450" />
                        <div className="flex text-sm text-stone-600 justify-center">
                            <span className="relative rounded-md font-medium text-orange-600 hover:text-orange-500 focus-within:outline-none">
                                <span>Upload images</span>
                                <input 
                                    type="file" 
                                    className="sr-only" 
                                    accept="image/*"
                                    multiple
                                    onChange={handleFileChange}
                                    required={data.proof_photos.length === 0}
                                />
                            </span>
                        </div>
                        <p className="text-xs text-stone-500">PNG, JPG, GIF up to 5MB (multiple allowed)</p>
                    </div>
                </label>
                {errors.proof_photos && <p className="text-red-500 text-xs mt-1">{errors.proof_photos}</p>}
                
                {/* Preview list */}
                {previewUrls.length > 0 && (
                    <div className="mt-4 grid grid-cols-5 gap-2">
                        {previewUrls.map((url, index) => (
                            <div key={index} className="relative aspect-square rounded-lg border border-stone-200 overflow-hidden group">
                                <img src={url} alt="Preview" className="h-full w-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => handleRemoveFile(index)}
                                    className="absolute top-1 right-1 bg-red-655 text-white rounded-full p-1 shadow hover:bg-red-700 transition"
                                >
                                    <XCircle size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-3 border-t border-stone-100 pt-4 sm:flex-row sm:justify-end">
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-stone-200 bg-white px-4 py-2 font-bold text-stone-700 transition hover:bg-stone-50 min-h-[44px] sm:min-h-[38px] flex items-center justify-center"
                    disabled={processing}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={processing}
                    className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-2 font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600 disabled:opacity-50 min-h-[44px] sm:min-h-[38px]"
                >
                    {processing ? 'Submitting...' : 'Submit Dispute'}
                </button>
            </div>
        </form>
    );

    if (isMobileOrTablet) {
        return (
            <SlideOverDrawer
                show={isOpen}
                onClose={onClose}
                title="Initiate Return Dispute"
                widthClass="max-w-md"
            >
                <div className="space-y-4">
                    <p className="text-sm text-stone-500">Provide details and photos of the damaged item.</p>
                    {renderFormContent()}
                </div>
            </SlideOverDrawer>
        );
    }

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="md">
            <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-orange-100 text-orange-600 rounded-full">
                        <RotateCcw size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-stone-900">Initiate Return Dispute</h2>
                        <p className="text-sm text-stone-500">Provide details and photos of the damaged item.</p>
                    </div>
                </div>
                {renderFormContent()}
            </div>
        </Modal>
    );
}
