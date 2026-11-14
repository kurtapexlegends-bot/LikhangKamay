/* global route */
import React, { useState, useEffect, useCallback } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { X, Upload, Trash2, QrCode, AlertCircle } from 'lucide-react';
import { compressImage } from '@/utils/imageCompressor';

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function QrSlot({
    label,
    previewUrl,
    onSelectFile,
    onRemove,
    disabled,
}) {
    return (
        <div className="border border-stone-200 rounded-xl p-3.5 bg-stone-50/70 space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-stone-900">{label}</span>
                {previewUrl && (
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={onRemove}
                        className="inline-flex items-center gap-1 min-h-[36px] px-2.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                    </button>
                )}
            </div>

            {previewUrl ? (
                <div className="flex justify-center bg-white border border-stone-200 rounded-xl p-3">
                    <img
                        src={previewUrl}
                        alt={label}
                        onError={(e) => {
                            e.currentTarget.src = '/images/placeholder.svg';
                            e.currentTarget.onerror = null;
                        }}
                        className="w-40 h-40 object-contain rounded-lg"
                    />
                </div>
            ) : (
                <div className="h-32 flex flex-col items-center justify-center bg-white border border-dashed border-stone-300 rounded-xl text-stone-400">
                    <QrCode className="w-8 h-8 mb-1.5" />
                    <span className="text-xs font-medium">No QR image selected</span>
                </div>
            )}

            <label className="w-full min-h-[44px] px-4 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-xs font-bold text-stone-800 flex items-center justify-center gap-2 cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-clay-600" />
                <span>{previewUrl ? 'Replace QR Image' : 'Choose QR Image'}</span>
                <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={disabled}
                    onChange={onSelectFile}
                    className="sr-only"
                />
            </label>
        </div>
    );
}

export default function PosQrSetupModal({
    open,
    onClose,
    studioProfile,
}) {
    const [gcashFile, setGcashFile] = useState(null);
    const [mayaFile, setMayaFile] = useState(null);
    const [gcashObjectUrl, setGcashObjectUrl] = useState(null);
    const [mayaObjectUrl, setMayaObjectUrl] = useState(null);
    const [clearGcash, setClearGcash] = useState(false);
    const [clearMaya, setClearMaya] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    const resetLocalState = useCallback(() => {
        setGcashFile(null);
        setMayaFile(null);
        setClearGcash(false);
        setClearMaya(false);
        setErrorMessage(null);
        setGcashObjectUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
        });
        setMayaObjectUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
        });
    }, []);

    const handleClose = useCallback(() => {
        resetLocalState();
        onClose();
    }, [resetLocalState, onClose]);

    useEffect(() => {
        return () => {
            if (gcashObjectUrl) URL.revokeObjectURL(gcashObjectUrl);
            if (mayaObjectUrl) URL.revokeObjectURL(mayaObjectUrl);
        };
    }, [gcashObjectUrl, mayaObjectUrl]);

    const handleFileSelect = async (e, type) => {
        const input = e.target;
        const selected = input.files?.[0];
        if (!selected) return;

        setErrorMessage(null);

        if (!ALLOWED_MIME_TYPES.includes(selected.type)) {
            setErrorMessage('Please upload a JPG, PNG, or WEBP QR image.');
            input.value = '';
            return;
        }

        const compressed = await compressImage(selected, 1000, 1000, 0.88);
        if (compressed.size > MAX_UPLOAD_BYTES) {
            setErrorMessage('Max 4MB per QR image.');
            input.value = '';
            return;
        }

        const nextUrl = URL.createObjectURL(compressed);
        if (type === 'gcash') {
            setGcashObjectUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return nextUrl;
            });
            setGcashFile(compressed);
            setClearGcash(false);
        } else {
            setMayaObjectUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return nextUrl;
            });
            setMayaFile(compressed);
            setClearMaya(false);
        }

        input.value = '';
    };

    const uploadSingleQr = async (file) => {
        const presignRes = await axios.post(route('api.uploads.presign'), {
            folder: 'shops',
            filename: file.name || 'qr-code.jpg',
            contentType: file.type || 'image/jpeg',
        });

        const { url, key, contentType, is_direct_cloud: isDirectCloud } = presignRes.data;

        if (isDirectCloud) {
            const putRes = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': contentType },
                body: file,
            });
            if (!putRes.ok) {
                throw new Error('Failed to upload QR image to cloud storage.');
            }
        } else {
            await axios.put(url, file, {
                headers: { 'Content-Type': contentType },
            });
        }

        return key;
    };

    const handleSave = async () => {
        setSaving(true);
        setErrorMessage(null);

        try {
            const payload = {
                clear_gcash_qr: clearGcash,
                clear_maya_qr: clearMaya,
            };

            if (gcashFile) {
                payload.pos_gcash_qr_key = await uploadSingleQr(gcashFile);
            }
            if (mayaFile) {
                payload.pos_maya_qr_key = await uploadSingleQr(mayaFile);
            }

            router.post(route('seller.pos.qr-settings'), payload, {
                preserveScroll: true,
                onSuccess: () => {
                    setSaving(false);
                    handleClose();
                },
                onError: (serverErrors) => {
                    setSaving(false);
                    const firstErr = Object.values(serverErrors || {})[0];
                    setErrorMessage(firstErr || 'Could not save QR settings.');
                },
                onFinish: () => {
                    setSaving(false);
                },
            });
        } catch (err) {
            setSaving(false);
            setErrorMessage(err?.response?.data?.error || err?.message || 'Upload failed.');
        }
    };

    if (!open) return null;

    const displayedGcashUrl = clearGcash
        ? null
        : gcashObjectUrl || studioProfile?.pos_gcash_qr_url || null;

    const displayedMayaUrl = clearMaya
        ? null
        : mayaObjectUrl || studioProfile?.pos_maya_qr_url || null;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-stone-900/50 backdrop-blur-xs p-0 sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pos-qr-setup-title"
        >
            <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-stone-200 shadow-xl overflow-hidden pb-[env(safe-area-inset-bottom)]">
                <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
                    <h3 id="pos-qr-setup-title" className="text-base font-bold text-stone-900">
                        Walk-In E-Wallet QR Setup
                    </h3>
                    <button
                        type="button"
                        disabled={saving}
                        onClick={handleClose}
                        aria-label="Close QR Setup"
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                    <p className="text-xs text-stone-600">
                        Max 4MB per QR image. Uploaded QR codes are displayed at checkout for walk-in customers to scan.
                    </p>

                    {errorMessage && (
                        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <QrSlot
                            label="GCash QR"
                            previewUrl={displayedGcashUrl}
                            disabled={saving}
                            onSelectFile={(e) => handleFileSelect(e, 'gcash')}
                            onRemove={() => {
                                setGcashFile(null);
                                setGcashObjectUrl((prev) => {
                                    if (prev) URL.revokeObjectURL(prev);
                                    return null;
                                });
                                setClearGcash(true);
                            }}
                        />

                        <QrSlot
                            label="Maya QR"
                            previewUrl={displayedMayaUrl}
                            disabled={saving}
                            onSelectFile={(e) => handleFileSelect(e, 'maya')}
                            onRemove={() => {
                                setMayaFile(null);
                                setMayaObjectUrl((prev) => {
                                    if (prev) URL.revokeObjectURL(prev);
                                    return null;
                                });
                                setClearMaya(true);
                            }}
                        />
                    </div>
                </div>

                <div className="px-5 py-4 border-t border-stone-200 bg-stone-50 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        disabled={saving}
                        onClick={handleClose}
                        className="min-h-[44px] px-4 rounded-xl border border-stone-300 bg-white text-sm font-semibold text-stone-700 hover:bg-stone-100"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={saving}
                        onClick={handleSave}
                        className="min-h-[44px] px-5 rounded-xl bg-clay-600 text-white text-sm font-bold hover:bg-clay-700 disabled:bg-stone-300"
                    >
                        {saving ? 'Saving...' : 'Save QR Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
}
