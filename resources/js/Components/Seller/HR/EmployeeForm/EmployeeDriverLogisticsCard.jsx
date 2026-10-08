import React, { useState } from 'react';
import { Truck, ShieldCheck, ShieldAlert, Eye, X } from 'lucide-react';
import Modal from '@/Components/Modal';
import { modalFieldClass, modalSelectClass } from '@/utils/hrHelpers';

export default function EmployeeDriverLogisticsCard({
    data,
    setData,
    errors = {},
    driverLicensePhotoUrl = null,
}) {
    const [showLicensePreviewModal, setShowLicensePreviewModal] = useState(false);

    return (
        <>
            <div className="rounded-2xl border border-clay-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-stone-800 font-bold text-xs uppercase tracking-wider">
                    <Truck size={14} className="text-clay-600" />
                    <span>Driver Logistics &amp; Compensation</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                    {/* Vehicle Type */}
                    <div className="sm:col-span-4">
                        <label className="mb-1 block text-[11px] font-bold text-stone-700">
                            Vehicle Type
                        </label>
                        <select
                            className={`${modalSelectClass} ${errors.vehicle_type ? 'border-red-300 bg-red-50/10 focus:ring-red-500 focus:border-red-500' : ''} h-9.5 text-xs font-medium`}
                            value={data.vehicle_type || 'Motorcycle'}
                            onChange={e => setData('vehicle_type', e.target.value)}
                        >
                            <option value="Motorcycle">Motorcycle (Standard)</option>
                            <option value="Bicycle">Bicycle / E-Bike</option>
                            <option value="Sedan">Sedan (4-Wheel)</option>
                            <option value="MPV">MPV / SUV (Bulky)</option>
                            <option value="Van">Van / Light Cargo Truck</option>
                        </select>
                        {errors.vehicle_type && <p className="mt-1 text-xs text-red-500 font-medium">{errors.vehicle_type}</p>}
                    </div>

                    {/* License Plate Number */}
                    <div className="sm:col-span-4">
                        <label className="mb-1 block text-[11px] font-bold text-stone-700">
                            Plate Number
                        </label>
                        <input
                            type="text"
                            className={`${modalFieldClass} ${errors.vehicle_plate_number ? 'border-red-300 bg-red-50/10 focus:ring-red-500 focus:border-red-500' : ''} h-9.5 uppercase font-semibold`}
                            placeholder="e.g. ABC 1234"
                            value={data.vehicle_plate_number || ''}
                            maxLength={20}
                            onChange={e => setData('vehicle_plate_number', e.target.value.toUpperCase())}
                        />
                        {errors.vehicle_plate_number && <p className="mt-1 text-xs text-red-500 font-medium">{errors.vehicle_plate_number}</p>}
                    </div>

                    {/* Driver License Number */}
                    <div className="sm:col-span-4">
                        <label className="mb-1 block text-[11px] font-bold text-stone-700">
                            Driver License
                        </label>
                        <input
                            type="text"
                            className={`${modalFieldClass} ${errors.driver_license_number ? 'border-red-300 bg-red-50/10 focus:ring-red-500 focus:border-red-500' : ''} h-9.5 uppercase`}
                            placeholder="e.g. D01-12-345678"
                            value={data.driver_license_number || ''}
                            maxLength={50}
                            onChange={e => setData('driver_license_number', e.target.value.toUpperCase())}
                        />
                        {errors.driver_license_number && <p className="mt-1 text-xs text-red-500 font-medium">{errors.driver_license_number}</p>}
                    </div>

                    {/* Compensation Model */}
                    <div className="sm:col-span-6">
                        <label className="mb-1 block text-[11px] font-bold text-stone-700">
                            Driver Pay Structure
                        </label>
                        <select
                            className={`${modalSelectClass} ${errors.delivery_compensation_type ? 'border-red-300 bg-red-50/10 focus:ring-red-500 focus:border-red-500' : ''} h-9.5 text-xs font-medium`}
                            value={data.delivery_compensation_type || 'salary'}
                            onChange={e => setData('delivery_compensation_type', e.target.value)}
                        >
                            <option value="salary">Fixed Salary Only (Regular Wage)</option>
                            <option value="per_delivery">Per-Delivery Fee Only (Piece-Rate)</option>
                            <option value="hybrid">Hybrid (Salary + Drop Incentive)</option>
                        </select>
                        {errors.delivery_compensation_type && <p className="mt-1 text-xs text-red-500 font-medium">{errors.delivery_compensation_type}</p>}
                    </div>

                    {/* Delivery Drop Incentive Rate */}
                    {(data.delivery_compensation_type === 'per_delivery' || data.delivery_compensation_type === 'hybrid') && (
                        <div className="sm:col-span-6">
                            <label className="mb-1 block text-[11px] font-bold text-stone-700">
                                {data.delivery_compensation_type === 'hybrid' ? 'Incentive per Drop (₱)' : 'Delivery Fee per Drop (₱)'} <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                                    ₱
                                </span>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    className={`w-full rounded-xl border border-stone-200 pl-7 pr-3 py-1.5 text-xs font-bold text-stone-900 placeholder:text-stone-400 focus:border-clay-500 focus:ring-1 focus:ring-clay-500/20 transition ${
                                        errors.delivery_fee_rate ? 'border-red-300 bg-red-50/10 focus:ring-red-500 focus:border-red-500' : ''
                                    } h-9.5`}
                                    placeholder="50.00"
                                    value={data.delivery_fee_rate ?? ''}
                                    onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                    onChange={e => setData('delivery_fee_rate', e.target.value.replace(/-/g, ''))}
                                />
                            </div>
                            <p className="mt-1 text-[10px] text-stone-500">
                                {data.delivery_compensation_type === 'hybrid'
                                    ? 'Added on top of base salary for each completed delivery parcel.'
                                    : 'Total earnings paid out for each completed delivery parcel.'
                                }
                            </p>
                            {errors.delivery_fee_rate && <p className="mt-1 text-xs text-red-500 font-medium">{errors.delivery_fee_rate}</p>}
                        </div>
                    )}

                    {/* Driver License & ID Verification Status Badge */}
                    <div className="sm:col-span-12 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-stone-200 bg-stone-50/70 mt-1">
                        <div className="flex items-center gap-2.5">
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                driverLicensePhotoUrl ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                                {driverLicensePhotoUrl ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-stone-900">
                                        {driverLicensePhotoUrl ? 'Driver License / ID: Verified' : 'Driver License / ID: Pending Upload'}
                                    </span>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        driverLicensePhotoUrl
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                                    }`}>
                                        {driverLicensePhotoUrl ? 'Uploaded' : 'Self-Serve Mobile'}
                                    </span>
                                </div>
                                <p className="text-[11px] text-stone-500 mt-0.5">
                                    {driverLicensePhotoUrl
                                        ? 'Uploaded directly by rider via the mobile delivery console.'
                                        : 'Rider can submit their ID or license photo via their mobile delivery console.'}
                                </p>
                            </div>
                        </div>
                        {driverLicensePhotoUrl && (
                            <button
                                type="button"
                                onClick={() => setShowLicensePreviewModal(true)}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-bold text-stone-700 hover:bg-stone-50 transition shadow-2xs shrink-0"
                            >
                                <Eye size={13} className="text-clay-600" />
                                <span>View Photo</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal: View Driver License Photo Preview */}
            {showLicensePreviewModal && driverLicensePhotoUrl && (
                <Modal show={true} onClose={() => setShowLicensePreviewModal(false)} maxWidth="md">
                    <div className="p-4 bg-white">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-2 mb-3">
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={16} className="text-emerald-600" />
                                <h4 className="text-xs font-bold text-stone-900">Driver License / ID Photo</h4>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowLicensePreviewModal(false)}
                                className="text-stone-400 hover:text-stone-700 rounded-lg p-1 hover:bg-stone-100 transition"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <img
                            src={driverLicensePhotoUrl}
                            alt="Driver License"
                            className="w-full rounded-xl object-contain max-h-[70vh] bg-stone-50"
                        />
                    </div>
                </Modal>
            )}
        </>
    );
}
