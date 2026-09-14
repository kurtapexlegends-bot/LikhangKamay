import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Save, 
    Mail, 
    Settings, 
    Percent, 
    CreditCard, 
    ChevronDown, 
    CheckCircle2 
} from 'lucide-react';
import PrimaryButton from '@/Components/PrimaryButton';
import ContactSocialsForm from '@/Components/Admin/Layout/SystemConfig/ContactSocialsForm';
import PlatformOpsForm from '@/Components/Admin/Layout/SystemConfig/PlatformOpsForm';
import EmailStudioForm from '@/Components/Admin/Layout/SystemConfig/EmailStudioForm';

export default function GeneralPlatformTab({
    data,
    setData,
    updateNested,
    errors,
    processing,
    recentlySuccessful,
    isDirty,
    onSubmit,
}) {
    const [activeSubTab, setActiveSubTab] = useState('branding_contact');
    const [showMobileNotes, setShowMobileNotes] = useState(false);

    const subTabs = [
        { id: 'branding_contact', name: 'Contact & Socials', icon: Mail },
        { id: 'branding_ops', name: 'Platform & Operations', icon: Settings },
        { id: 'branding_smtp', name: 'Email Engine', icon: Mail },
    ];

    return (
        <motion.div
            key="general-platform-tab"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.2 }}
        >
            {/* Sub-tab Navigation Pill Header */}
            <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl w-full sm:w-fit overflow-x-auto no-scrollbar scroll-smooth">
                {subTabs.map((subTab) => (
                    <button
                        key={subTab.id}
                        type="button"
                        onClick={() => setActiveSubTab(subTab.id)}
                        className={`
                            flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap outline-none min-h-[38px] shrink-0 snap-start active:scale-95
                            ${activeSubTab === subTab.id 
                                ? 'bg-white text-stone-900 shadow-2xs font-bold ring-1 ring-stone-900/5' 
                                : 'text-stone-500 hover:text-stone-700 hover:bg-stone-200/50'}
                        `}
                    >
                        <subTab.icon size={13} className={activeSubTab === subTab.id ? 'text-clay-700' : 'text-stone-400'} />
                        <span>{subTab.name}</span>
                    </button>
                ))}
            </div>

            {activeSubTab === 'branding_smtp' ? (
                <div className="mt-6">
                    <EmailStudioForm
                        data={data}
                        setData={setData}
                        errors={errors}
                        processing={processing}
                    />
                </div>
            ) : (
                <>
                    <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                        {/* Left Column: Inputs */}
                        <div className="lg:col-span-2 space-y-6">
                            {activeSubTab === 'branding_contact' && (
                                <ContactSocialsForm 
                                    data={data} 
                                    updateNested={updateNested} 
                                />
                            )}

                            {activeSubTab === 'branding_ops' && (
                                <PlatformOpsForm 
                                    data={data} 
                                    setData={setData} 
                                />
                            )}
                        </div>

                        {/* Right Column: Sticky actions (Desktop only) */}
                        <div className="space-y-6">
                            <div className="hidden lg:block bg-stone-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group border border-stone-850">
                                <div className="relative z-10 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                                                <Save size={15} className="text-clay-400" />
                                            </div>
                                            <h3 className="text-sm font-bold">Apply Changes</h3>
                                        </div>
                                        {isDirty && (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full animate-pulse">
                                                Unsaved
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-[11px] text-stone-400 leading-relaxed font-medium">
                                        System parameters and operational rules sync across live processes.
                                    </p>
                                    
                                    <PrimaryButton 
                                        disabled={processing}
                                        className="w-full py-3 bg-clay-600 hover:bg-clay-500 text-white rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md group border-none text-xs font-bold min-h-[44px]"
                                    >
                                        <Save size={15} className="transition-transform duration-200 group-hover:scale-110" />
                                        {processing ? 'Saving...' : 'Apply Config Update'}
                                    </PrimaryButton>

                                    {recentlySuccessful && (
                                        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold animate-in fade-in slide-in-from-top-1 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
                                            <CheckCircle2 size={15} />
                                            <span>Settings updated successfully!</span>
                                        </div>
                                    )}
                                </div>
                                <div className="absolute -right-16 -bottom-16 w-48 h-48 bg-clay-600/10 rounded-full blur-3xl group-hover:bg-clay-600/20 transition-colors" />
                            </div>

                            <div className="bg-white rounded-2xl border border-clay-100 p-5 lg:p-6 space-y-4 shadow-sm select-none">
                                <div 
                                    onClick={() => {
                                        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                                            setShowMobileNotes(!showMobileNotes);
                                        }
                                    }}
                                    className="flex items-center justify-between cursor-pointer lg:cursor-default"
                                >
                                    <h4 className="text-[9px] font-black text-stone-400 uppercase tracking-wider">Operational Notes</h4>
                                    <div className="lg:hidden text-stone-400 hover:text-stone-600 p-1">
                                        <motion.span
                                            animate={{ rotate: showMobileNotes ? 180 : 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="inline-block"
                                        >
                                            <ChevronDown size={14} />
                                        </motion.span>
                                    </div>
                                </div>

                                {/* Desktop Notes */}
                                <div className="hidden lg:block">
                                    <ul className="space-y-3">
                                        {[
                                            { title: 'Zero Commission Policy', desc: 'Sellers keep 100% of sales revenue without percentage commission deductions.', icon: Percent },
                                            { title: 'PayMongo Gateway', desc: 'Disable this toggle to set checkout offline during technical maintenance.', icon: CreditCard },
                                        ].map((tip, idx) => (
                                            <li key={idx} className="flex gap-2.5">
                                                <tip.icon size={14} className="text-clay-600 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-[10px] font-bold text-stone-900">{tip.title}</p>
                                                    <p className="text-[9px] text-stone-500 font-medium leading-relaxed">{tip.desc}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Mobile Notes */}
                                <AnimatePresence initial={false}>
                                    {showMobileNotes && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="lg:hidden overflow-hidden"
                                        >
                                            <ul className="space-y-3 pt-2">
                                                {[
                                                    { title: 'Zero Commission Policy', desc: 'Sellers keep 100% of sales revenue without percentage commission deductions.', icon: Percent },
                                                    { title: 'PayMongo Gateway', desc: 'Disable this toggle to set checkout offline during technical maintenance.', icon: CreditCard },
                                                ].map((tip, idx) => (
                                                    <li key={idx} className="flex gap-2.5">
                                                        <tip.icon size={14} className="text-clay-600 shrink-0 mt-0.5" />
                                                        <div>
                                                            <p className="text-[10px] font-bold text-stone-900">{tip.title}</p>
                                                            <p className="text-[9px] text-stone-500 font-medium leading-relaxed">{tip.desc}</p>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </form>

                    {/* Sticky actions bar for Mobile (below lg) */}
                    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-stone-200 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 flex items-center justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
                        <div className="flex-1 min-w-0 pr-4">
                            {recentlySuccessful && (
                                <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-bold animate-in fade-in">
                                    <CheckCircle2 size={12} />
                                    <span>Settings updated!</span>
                                </div>
                            )}
                            {!recentlySuccessful && (
                                <span className="text-[9px] text-stone-500 font-bold uppercase tracking-wider">Unsaved Changes</span>
                            )}
                        </div>
                        <PrimaryButton 
                            disabled={processing}
                            onClick={onSubmit}
                            className="py-2.5 px-5 bg-clay-600 hover:bg-clay-700 active:scale-95 text-white rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md border-none text-[11px] font-bold min-h-[44px]"
                        >
                            <Save size={13} />
                            {processing ? 'Saving...' : 'Apply Config'}
                        </PrimaryButton>
                    </div>
                </>
            )}
        </motion.div>
    );
}
