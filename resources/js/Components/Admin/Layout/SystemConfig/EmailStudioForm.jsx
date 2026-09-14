/* global route */
import React, { useState, useEffect, useCallback } from 'react';
import { usePage } from '@inertiajs/react';
import { 
    Send, 
    FileText, 
    Sparkles,
} from 'lucide-react';
import FormSkeleton from './Partials/FormSkeleton';
import SystemEmailTemplatesEditor from './SystemEmailTemplatesEditor';
import AudienceBroadcastComposer from './AudienceBroadcastComposer';

export default function EmailStudioForm({ processing }) {
    const { auth } = usePage().props;
    const [subSection, setSubSection] = useState('templates'); // 'templates' | 'broadcast'

    const [templates, setTemplates] = useState([]);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

    const fetchTemplates = useCallback(async () => {
        setIsLoadingTemplates(true);
        try {
            const res = await window.axios.get(route('admin.email-templates.index'));
            const fetched = res.data.templates || [];
            setTemplates(fetched);
        } catch (err) {
            console.error('Failed to load templates', err);
        } finally {
            setIsLoadingTemplates(false);
        }
    }, []);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    if (processing || isLoadingTemplates) {
        return <FormSkeleton />;
    }

    return (
        <div className="bg-white rounded-2xl border border-clay-100 p-6 space-y-6 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Header Sub-Navigation Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="text-clay-600" size={18} />
                    <div>
                        <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Email Studio &amp; Audience Broadcast</h3>
                        <p className="text-[10px] text-stone-500 font-medium mt-0.5">Customize system templates, compose broadcast emails, and target specific user segments.</p>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl shrink-0 overflow-x-auto scrollbar-none no-scrollbar flex-nowrap py-1 scroll-smooth snap-x touch-pan-x min-w-0 max-w-full">
                    <button
                        type="button"
                        onClick={() => setSubSection('templates')}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold transition-all shrink-0 snap-start active:scale-95 min-h-[38px] ${
                            subSection === 'templates' ? 'bg-white text-clay-700 shadow-sm' : 'text-stone-600 hover:text-stone-900'
                        }`}
                    >
                        <FileText size={13} />
                        Template Studio
                    </button>
                    <button
                        type="button"
                        onClick={() => setSubSection('broadcast')}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold transition-all shrink-0 snap-start active:scale-95 min-h-[38px] ${
                            subSection === 'broadcast' ? 'bg-white text-clay-700 shadow-sm' : 'text-stone-600 hover:text-stone-900'
                        }`}
                    >
                        <Send size={13} />
                        Audience Broadcast
                    </button>
                </div>
            </div>

            {/* Sub-section 1: System Email Templates Editor */}
            {subSection === 'templates' && (
                <SystemEmailTemplatesEditor
                    templates={templates}
                    fetchTemplates={fetchTemplates}
                    auth={auth}
                />
            )}

            {/* Sub-section 2: Audience Broadcast Composer */}
            {subSection === 'broadcast' && (
                <AudienceBroadcastComposer
                    templates={templates}
                    auth={auth}
                />
            )}
        </div>
    );
}
