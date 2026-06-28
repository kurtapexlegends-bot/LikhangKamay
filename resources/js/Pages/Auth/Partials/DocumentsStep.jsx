import React, { useRef } from 'react';
import { FileText, ArrowLeft, ArrowRight, UploadCloud, CheckCircle2, FileCheck } from 'lucide-react';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';

export default function DocumentsStep({
    data,
    setData,
    errors,
    submit,
    processing,
    setStep,
    auth,
    handleFileChange,
}) {
    return (
        <form onSubmit={submit} className="p-6 sm:p-10">
            <div className="mb-8">
                <div className="mb-1 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                        <FileText size={20} className="text-amber-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Legal Verification</h2>
                        <p className="text-sm text-gray-500">Upload clear photos or scans of your documents</p>
                    </div>
                </div>
            </div>

            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-800">
                    <strong>Why do we need these?</strong> To protect buyers and ensure authenticity of all artisan sellers on our platform.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FileUploadField
                    label="Business Permit (Mayor's Permit)"
                    id="business_permit"
                    file={data.business_permit}
                    existingFile={!!auth.user.business_permit}
                    onFileSelect={(file) => handleFileChange(file, 'business_permit')}
                    error={errors.business_permit}
                />
                <FileUploadField
                    label="DTI Registration"
                    id="dti_registration"
                    file={data.dti_registration}
                    existingFile={!!auth.user.dti_registration}
                    onFileSelect={(file) => handleFileChange(file, 'dti_registration')}
                    error={errors.dti_registration}
                />
                <FileUploadField
                    label="Valid Government ID (Front)"
                    id="valid_id"
                    file={data.valid_id}
                    existingFile={!!auth.user.valid_id}
                    onFileSelect={(file) => handleFileChange(file, 'valid_id')}
                    error={errors.valid_id}
                />
                <FileUploadField
                    label="TIN ID / Registration"
                    id="tin_id"
                    file={data.tin_id}
                    existingFile={!!auth.user.tin_id}
                    onFileSelect={(file) => handleFileChange(file, 'tin_id')}
                    error={errors.tin_id}
                />
            </div>

            <div className="mt-8 flex items-center justify-between">
                <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2 font-medium text-gray-500 transition hover:text-gray-700 active:scale-95"
                >
                    <ArrowLeft size={16} /> Back
                </button>

                <button
                    type="submit"
                    disabled={processing}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-clay-600 to-clay-700 px-8 py-3.5 font-bold text-white shadow-lg shadow-clay-200 transition hover:from-clay-700 hover:to-clay-800 disabled:opacity-50 active:scale-95"
                >
                    {processing ? 'Uploading...' : 'Continue to Payments'} <ArrowRight size={18} />
                </button>
            </div>
        </form>
    );
}

const FileUploadField = React.memo(({ label, id, onFileSelect, error, file, existingFile }) => {
    const inputRef = useRef(null);

    return (
        <div>
            <InputLabel htmlFor={id} value={label} />
            <div
                onClick={() => inputRef.current?.click()}
                className={`mt-1 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 hover:shadow-md ${
                    file
                        ? 'border-clay-400 bg-clay-50/50'
                        : existingFile
                            ? 'border-clay-300 bg-clay-50/30'
                            : 'border-gray-200 bg-white/50 backdrop-blur-sm hover:border-clay-300 hover:bg-white'
                }`}
            >
                {file ? (
                    <>
                        <FileCheck size={32} className="mb-2 text-clay-600" />
                        <p className="max-w-full truncate text-sm font-medium text-clay-800">{file.name}</p>
                        <p className="text-xs text-clay-600">Click to change</p>
                    </>
                ) : existingFile ? (
                    <>
                        <CheckCircle2 size={32} className="mb-2 text-clay-600" />
                        <p className="text-sm font-bold text-clay-800">Document on File</p>
                        <p className="text-xs text-clay-600">Click to replace</p>
                    </>
                ) : (
                    <>
                        <UploadCloud size={32} className="mb-2 text-gray-400" />
                        <p className="text-sm font-medium text-gray-600">Click to upload</p>
                        <p className="text-xs text-gray-400">PNG, JPG, PDF up to 5MB</p>
                    </>
                )}
                <input
                    ref={inputRef}
                    id={id}
                    name={id}
                    type="file"
                    className="hidden"
                    onChange={(event) => event.target.files?.[0] && onFileSelect(event.target.files[0])}
                    accept="image/*,.pdf"
                />
            </div>
            <InputError message={error} className="mt-2" />
        </div>
    );
});
