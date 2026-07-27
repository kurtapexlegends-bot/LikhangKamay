import React, { useState } from 'react';
import { usePage } from '@inertiajs/react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import { 
    Mail, 
    Send, 
    ShieldCheck, 
    Key, 
    User, 
    CheckCircle2, 
    AlertCircle, 
    Zap, 
    Server, 
    FileText, 
    Clock,
    Eye,
    EyeOff
} from 'lucide-react';
import FormSkeleton from './Partials/FormSkeleton';

export default function MailDispatchForm({ data, setData, errors, processing }) {
    const { auth } = usePage().props;
    const [showApiKey, setShowApiKey] = useState(false);
    const [testEmail, setTestEmail] = useState(auth?.user?.email || data?.mail_from_address || '');
    const [selectedTemplate, setSelectedTemplate] = useState('verify_email');
    const [isDispatching, setIsDispatching] = useState(false);
    const [dispatchResult, setDispatchResult] = useState(null);

    const handleTestDispatch = async () => {
        if (!testEmail) return;
        setIsDispatching(true);
        setDispatchResult(null);

        try {
            const response = await window.axios.post(route('admin.settings.mail.test'), {
                email: testEmail,
                template: selectedTemplate,
            });
            setDispatchResult({
                success: true,
                message: response.data.message,
                latency: response.data.latency_ms,
                driver: response.data.driver,
                timestamp: response.data.timestamp,
            });
        } catch (error) {
            setDispatchResult({
                success: false,
                message: error.response?.data?.message || 'Failed to dispatch test email. Check your server logs or API credentials.',
            });
        } finally {
            setIsDispatching(false);
        }
    };

    if (processing) {
        return <FormSkeleton />;
    }

    return (
        <div className="bg-white rounded-2xl border border-clay-100 p-6 space-y-6 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Mail Provider Credentials & Sender Identity */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="text-clay-600" size={16} />
                    <h3 className="text-[10px] font-bold text-stone-900 uppercase tracking-wider">Mail Engine & Provider Configuration</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <InputLabel value="Active Mail Driver" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1.5" />
                        <select
                            value={data.mail_driver || 'resend'}
                            onChange={(e) => setData('mail_driver', e.target.value)}
                            className="block w-full rounded-xl border-stone-200 bg-stone-50/30 text-xs py-2 px-3 min-h-[44px] text-stone-800 font-medium focus:ring-clay-500/20 focus:border-clay-500"
                        >
                            <option value="resend">Resend API (Production Recommended)</option>
                            <option value="smtp">SMTP Relay Server</option>
                            <option value="log">Local File Log (Development Only)</option>
                        </select>
                    </div>

                    <div>
                        <InputLabel value="Resend API Key" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1.5" />
                        <div className="relative">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                            <TextInput
                                type={showApiKey ? "text" : "password"}
                                className="block w-full pl-9 pr-9 bg-stone-50/30 text-xs py-2 min-h-[44px]"
                                placeholder="re_1234567890..."
                                value={data.resend_api_key || ''}
                                onChange={(e) => setData('resend_api_key', e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition"
                            >
                                {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <InputLabel value="From Email Address" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1.5" />
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                            <TextInput
                                type="email"
                                className="block w-full pl-9 bg-stone-50/30 text-xs py-2 min-h-[44px]"
                                value={data.mail_from_address || 'noreply@likhangkamay.app'}
                                onChange={(e) => setData('mail_from_address', e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <InputLabel value="From Sender Name" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1.5" />
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                            <TextInput
                                className="block w-full pl-9 bg-stone-50/30 text-xs py-2 min-h-[44px]"
                                value={data.mail_from_name || 'LikhangKamay'}
                                onChange={(e) => setData('mail_from_name', e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Interactive System Template Test Bench */}
            <div className="pt-6 border-t border-stone-100 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Zap className="text-amber-500" size={16} />
                        <h3 className="text-[10px] font-bold text-stone-900 uppercase tracking-wider">System Template Test Bench</h3>
                    </div>
                    <span className="text-[9px] font-semibold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200/60">
                        Live Deliverability Tester
                    </span>
                </div>

                <div className="bg-stone-50/80 rounded-xl p-4 border border-stone-200/60 space-y-4">
                    <p className="text-[10px] text-stone-500 leading-relaxed font-medium">
                        Select any real system notification template and dispatch a test email to verify deliverability, formatting, and mail driver speed on both Localhost and Production.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <InputLabel value="System Email Template" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1.5" />
                            <div className="relative">
                                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                                <select
                                    value={selectedTemplate}
                                    onChange={(e) => setSelectedTemplate(e.target.value)}
                                    className="block w-full rounded-xl border-stone-200 bg-white text-xs py-2 pl-9 pr-3 min-h-[44px] text-stone-800 font-semibold focus:ring-clay-500/20 focus:border-clay-500"
                                >
                                    <option value="verify_email">✉️ Email Verification Code</option>
                                    <option value="reset_password">🔑 Password Reset Link</option>
                                    <option value="order_receipt">🛒 Order Confirmation & Receipt</option>
                                    <option value="product_moderation">📦 Product Moderation Notice</option>
                                    <option value="sponsorship_status">🌟 Sponsorship Status Notice</option>
                                    <option value="dispute_update">⚖️ Dispute Resolution Alert</option>
                                    <option value="low_stock">⚠️ Low Stock Inventory Warning</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <InputLabel value="Target Recipient Email" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1.5" />
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                                <TextInput
                                    type="email"
                                    className="block w-full pl-9 bg-white text-xs py-2 min-h-[44px]"
                                    placeholder="admin@likhangkamay.app"
                                    value={testEmail}
                                    onChange={(e) => setTestEmail(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-1">
                        <PrimaryButton
                            type="button"
                            onClick={handleTestDispatch}
                            disabled={isDispatching || !testEmail}
                            className="px-5 py-2.5 text-xs font-bold gap-2 min-h-[42px]"
                        >
                            <Send size={14} className={isDispatching ? "animate-bounce" : ""} />
                            {isDispatching ? "Dispatching Sample Email..." : "Dispatch Sample Template"}
                        </PrimaryButton>
                    </div>

                    {/* Diagnostic Console Box */}
                    {dispatchResult && (
                        <div className={`p-4 rounded-xl text-xs space-y-2 border ${
                            dispatchResult.success 
                                ? 'bg-emerald-50/80 border-emerald-200/80 text-emerald-900' 
                                : 'bg-rose-50/80 border-rose-200/80 text-rose-900'
                        }`}>
                            <div className="flex items-center gap-2 font-bold">
                                {dispatchResult.success ? (
                                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                ) : (
                                    <AlertCircle size={16} className="text-rose-600 shrink-0" />
                                )}
                                <span>{dispatchResult.message}</span>
                            </div>

                            {dispatchResult.success && (
                                <div className="flex flex-wrap gap-4 text-[10px] font-semibold text-emerald-700 pt-1 border-t border-emerald-200/60">
                                    <span className="flex items-center gap-1">
                                        <Clock size={12} /> Response Latency: <strong>{dispatchResult.latency}ms</strong>
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Server size={12} /> Driver: <strong className="uppercase">{dispatchResult.driver}</strong>
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Mail size={12} /> Sent To: <strong>{testEmail}</strong>
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
