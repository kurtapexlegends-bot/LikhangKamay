import React, { useState, useEffect } from 'react';
import Modal from '@/Components/Modal';
import { ShieldCheck, X, Camera, LoaderCircle, CheckCircle2 } from 'lucide-react';

export default function DriverVehicleVerifyModal({
    isOpen,
    onClose,
    driverProfile = {},
    onSubmit,
    isSubmitting = false,
    errors = {},
}) {
    const [vehicleType, setVehicleType] = useState(driverProfile.vehicle_type || "Motorcycle");
    const [plateNumber, setPlateNumber] = useState(driverProfile.vehicle_plate_number || "");
    const [licenseNumber, setLicenseNumber] = useState(driverProfile.driver_license_number || "");
    const [licensePhoto, setLicensePhoto] = useState(null);
    const [licensePreview, setLicensePreview] = useState(null);
    const [localErrors, setLocalErrors] = useState({});

    useEffect(() => {
        if (isOpen) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setVehicleType(driverProfile.vehicle_type || "Motorcycle");
            setPlateNumber(driverProfile.vehicle_plate_number || "");
            setLicenseNumber(driverProfile.driver_license_number || "");
            setLicensePhoto(null);
            setLicensePreview(null);
            setLocalErrors({});
        }
    }, [isOpen, driverProfile.vehicle_type, driverProfile.vehicle_plate_number, driverProfile.driver_license_number]);

    useEffect(() => {
        return () => {
            if (licensePreview?.startsWith("blob:")) {
                URL.revokeObjectURL(licensePreview);
            }
        };
    }, [licensePreview]);

    const handleLicensePhotoChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (licensePreview?.startsWith("blob:")) {
                URL.revokeObjectURL(licensePreview);
            }
            setLicensePhoto(file);
            setLicensePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const errs = {};
        if (!plateNumber.trim()) {
            errs.vehicle_plate_number = "Plate number is required.";
        }
        if (!licenseNumber.trim()) {
            errs.driver_license_number = "Driver license number is required.";
        }
        if (!licensePhoto && !driverProfile.driver_license_photo_url) {
            errs.driver_license_photo = "Driver license or ID photo is required.";
        }

        if (Object.keys(errs).length > 0) {
            setLocalErrors(errs);
            return;
        }

        onSubmit({
            vehicle_type: vehicleType,
            vehicle_plate_number: plateNumber.toUpperCase().trim(),
            driver_license_number: licenseNumber.toUpperCase().trim(),
            driver_license_photo: licensePhoto,
        });
    };

    const combinedErrors = { ...localErrors, ...errors };

    if (!isOpen) return null;

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="md">
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 bg-white rounded-2xl">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-clay-100 text-clay-700">
                            <ShieldCheck size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-stone-900">
                                Rider Vehicle &amp; License Verification
                            </h3>
                            <p className="text-[11px] text-stone-500">
                                Verify your vehicle and driver&apos;s license / ID card
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-stone-400 hover:text-stone-700 rounded-lg p-1 hover:bg-stone-100 transition"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Vehicle Type */}
                    <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">
                            Vehicle Type <span className="text-rose-500">*</span>
                        </label>
                        <select
                            value={vehicleType}
                            onChange={(e) => setVehicleType(e.target.value)}
                            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-800 focus:border-clay-500 focus:ring-1 focus:ring-clay-500"
                        >
                            <option value="Motorcycle">Motorcycle (Standard)</option>
                            <option value="Bicycle">Bicycle / E-Bike</option>
                            <option value="Sedan">Sedan (4-Wheel)</option>
                            <option value="MPV">MPV / SUV (Bulky)</option>
                            <option value="Van">Van / Light Cargo Truck</option>
                        </select>
                        {combinedErrors.vehicle_type && (
                            <p className="mt-1 text-[11px] text-rose-600 font-medium">
                                {combinedErrors.vehicle_type}
                            </p>
                        )}
                    </div>

                    {/* Plate Number */}
                    <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">
                            Plate Number <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={plateNumber}
                            onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                            placeholder="e.g. ABC 1234"
                            maxLength={20}
                            className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold uppercase text-stone-800 focus:border-clay-500 focus:ring-1 focus:ring-clay-500 ${
                                combinedErrors.vehicle_plate_number ? "border-rose-300 bg-rose-50/20" : "border-stone-200"
                            }`}
                        />
                        {combinedErrors.vehicle_plate_number && (
                            <p className="mt-1 text-[11px] text-rose-600 font-medium">
                                {combinedErrors.vehicle_plate_number}
                            </p>
                        )}
                    </div>

                    {/* Driver License Number */}
                    <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">
                            Driver&apos;s License / ID Number <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={licenseNumber}
                            onChange={(e) => setLicenseNumber(e.target.value.toUpperCase())}
                            placeholder="e.g. D01-12-345678"
                            maxLength={50}
                            className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold uppercase text-stone-800 focus:border-clay-500 focus:ring-1 focus:ring-clay-500 ${
                                combinedErrors.driver_license_number ? "border-rose-300 bg-rose-50/20" : "border-stone-200"
                            }`}
                        />
                        {combinedErrors.driver_license_number && (
                            <p className="mt-1 text-[11px] text-rose-600 font-medium">
                                {combinedErrors.driver_license_number}
                            </p>
                        )}
                    </div>

                    {/* Driver License / ID Photo */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-bold text-stone-700">
                                Driver&apos;s License or ID Card Photo {!driverProfile.driver_license_photo_url && <span className="text-rose-500">*</span>}
                            </label>
                            {driverProfile.driver_license_photo_url && (
                                <span className="text-[10px] font-semibold text-emerald-600">
                                    Currently Uploaded
                                </span>
                            )}
                        </div>

                        <div className="relative border-2 border-dashed border-stone-300 rounded-2xl p-4 text-center hover:border-stone-400 transition bg-stone-50/50">
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleLicensePhotoChange}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            />
                            {licensePreview || driverProfile.driver_license_photo_url ? (
                                <div className="space-y-2">
                                    <img
                                        src={licensePreview || driverProfile.driver_license_photo_url}
                                        alt="License Preview"
                                        className="max-h-44 mx-auto rounded-xl object-contain shadow-xs bg-stone-100"
                                    />
                                    <p className="text-[11px] font-bold text-clay-700">
                                        {licensePreview ? "Tap to retake / change photo" : "Tap to update with new photo"}
                                    </p>
                                </div>
                            ) : (
                                <div className="py-5 flex flex-col items-center justify-center text-stone-400">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white border border-stone-200 text-stone-500 mb-2 shadow-2xs">
                                        <Camera size={20} />
                                    </div>
                                    <p className="text-xs font-bold text-stone-700">
                                        Take Photo / Upload Card
                                    </p>
                                    <p className="text-[10px] text-stone-400 mt-0.5">
                                        Clear photo of driver&apos;s license or valid government ID
                                    </p>
                                </div>
                            )}
                        </div>
                        {combinedErrors.driver_license_photo && (
                            <p className="mt-1 text-[11px] text-rose-600 font-medium">
                                {combinedErrors.driver_license_photo}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-100 mt-5">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-clay-700 hover:bg-clay-800 transition disabled:opacity-50 shadow-xs"
                    >
                        {isSubmitting ? (
                            <LoaderCircle size={14} className="animate-spin" />
                        ) : (
                            <CheckCircle2 size={14} />
                        )}
                        <span>{isSubmitting ? "Saving..." : "Save & Verify Details"}</span>
                    </button>
                </div>
            </form>
        </Modal>
    );
}
