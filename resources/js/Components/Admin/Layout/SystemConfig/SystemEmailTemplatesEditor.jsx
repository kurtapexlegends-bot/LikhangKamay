/* global route */
import React, { useState, useEffect } from 'react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Modal from '@/Components/Modal';
import {
    Plus,
    Search,
    Edit3,
    Trash2,
    Eye,
    CheckCircle2,
    AlertCircle,
    Monitor,
    Smartphone,
} from 'lucide-react';

export default function SystemEmailTemplatesEditor({
    templates = [],
    fetchTemplates,
    auth,
}) {
    const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id || null);
    const [templateSearchQuery, setTemplateSearchQuery] = useState('');
    const [templateForm, setTemplateForm] = useState({
        id: templates[0]?.id || null,
        name: templates[0]?.name || '',
        subject: templates[0]?.subject || '',
        headline: templates[0]?.headline || '',
        body: templates[0]?.body || '',
        button_label: templates[0]?.button_label || '',
        button_url: templates[0]?.button_url || '',
        category: templates[0]?.category || 'custom'
    });
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [templateSaveFeedback, setTemplateSaveFeedback] = useState(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewDevice, setPreviewDevice] = useState('desktop');

    const loadTemplateIntoForm = (tpl) => {
        setSelectedTemplateId(tpl.id);
        setTemplateForm({
            id: tpl.id,
            name: tpl.name,
            subject: tpl.subject,
            headline: tpl.headline || '',
            body: tpl.body || '',
            button_label: tpl.button_label || '',
            button_url: tpl.button_url || '',
            category: tpl.category
        });
    };

    const handleCreateNewTemplate = () => {
        setSelectedTemplateId(null);
        setTemplateForm({
            id: null,
            name: 'New Custom Broadcast Template',
            subject: 'Important Announcement from LikhangKamay',
            headline: 'Platform Notice',
            body: "Hello {user_name},\n\nWe have an update to share with our artisan and buyer community.\n\nThank you for supporting Filipino handcrafted goods!",
            button_label: 'Learn More',
            button_url: '{action_url}',
            category: 'custom'
        });
    };

    useEffect(() => {
        if (!selectedTemplateId && !templateForm.id && templates.length > 0) {
            loadTemplateIntoForm(templates[0]);
        }
    }, [templates, selectedTemplateId, templateForm.id]);

    const handleSaveTemplate = async (e) => {
        e.preventDefault();
        setIsSavingTemplate(true);
        setTemplateSaveFeedback(null);

        try {
            const res = await window.axios.post(route('admin.email-templates.store'), templateForm);
            if (res.data && res.data.success) {
                const savedTemplate = res.data.template;
                setTemplateSaveFeedback({
                    success: true,
                    message: res.data.message || `Template "${savedTemplate?.name || 'Custom'}" saved successfully!`
                });
                if (savedTemplate) {
                    loadTemplateIntoForm(savedTemplate);
                }
                await fetchTemplates();
            }
        } catch (err) {
            console.error('Failed to save template', err);
            setTemplateSaveFeedback({
                success: false,
                message: err.response?.data?.message || 'Failed to save template. Please check all fields.'
            });
        } finally {
            setIsSavingTemplate(false);
            setTimeout(() => setTemplateSaveFeedback(null), 4000);
        }
    };

    const handleDeleteTemplate = async (id) => {
        if (!confirm('Are you sure you want to delete this custom template?')) return;
        try {
            const res = await window.axios.delete(route('admin.email-templates.destroy', id));
            if (res.data && res.data.success) {
                const remaining = templates.filter(t => t.id !== id);
                if (selectedTemplateId === id) {
                    if (remaining.length > 0) {
                        loadTemplateIntoForm(remaining[0]);
                    } else {
                        handleCreateNewTemplate();
                    }
                }
                await fetchTemplates();
            }
        } catch (err) {
            console.error('Failed to delete template', err);
            alert(err.response?.data?.message || 'Delete operation failed.');
        }
    };

    const insertPlaceholder = (tag) => {
        setTemplateForm(prev => ({
            ...prev,
            body: prev.body + ' ' + tag
        }));
    };

    const filteredTemplates = templates.filter(t => 
        !templateSearchQuery || 
        t.name.toLowerCase().includes(templateSearchQuery.toLowerCase()) || 
        t.subject.toLowerCase().includes(templateSearchQuery.toLowerCase())
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left: Template List */}
            <div className="space-y-3 md:border-r border-stone-100 md:pr-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold text-stone-900 uppercase tracking-wider">Templates Library ({templates.length})</h4>
                    <button
                        type="button"
                        onClick={handleCreateNewTemplate}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-clay-600 hover:text-clay-700 bg-clay-50 px-2.5 py-1.5 rounded-lg transition active:scale-95 min-h-[34px]"
                    >
                        <Plus size={12} />
                        New Template
                    </button>
                </div>

                {/* Search Filter for Templates */}
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" size={13} />
                    <input
                        type="text"
                        placeholder="Filter templates..."
                        value={templateSearchQuery}
                        onChange={(e) => setTemplateSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-clay-500"
                    />
                </div>

                <div className="space-y-2 max-h-[280px] md:max-h-[480px] overflow-y-auto pr-1">
                    {filteredTemplates.map((tpl) => {
                        const isSelected = selectedTemplateId === tpl.id;
                        return (
                            <div
                                key={tpl.id}
                                onClick={() => loadTemplateIntoForm(tpl)}
                                className={`p-3 rounded-xl border transition-all cursor-pointer active:scale-[0.99] ${
                                    isSelected 
                                        ? 'bg-clay-50/80 border-clay-300 shadow-sm ring-1 ring-clay-400/30' 
                                        : 'bg-stone-50/50 border-stone-100 hover:border-stone-200'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-stone-900 truncate">{tpl.name}</span>
                                    <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                        tpl.category === 'system' 
                                            ? 'bg-stone-200 text-stone-700' 
                                            : 'bg-emerald-100 text-emerald-800'
                                    }`}>
                                        {tpl.category}
                                    </span>
                                </div>
                                <p className="text-[9px] text-stone-500 font-medium truncate mt-1">{tpl.subject}</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Right: Template Form & Live Preview Button */}
            <div className="md:col-span-2 space-y-4">
                {templateSaveFeedback && (
                    <div className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2 transition ${
                        templateSaveFeedback.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}>
                        <div className="flex items-center gap-2">
                            {templateSaveFeedback.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                            <span>{templateSaveFeedback.message}</span>
                        </div>
                        <button type="button" onClick={() => setTemplateSaveFeedback(null)} className="text-xs opacity-60 hover:opacity-100">✕</button>
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-stone-900 truncate max-w-[200px] sm:max-w-none">
                        {templateForm.id ? `Editing Template: ${templateForm.name}` : 'Creating New Custom Template'}
                    </h4>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsPreviewOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 active:scale-95 rounded-lg transition min-h-[36px]"
                        >
                            <Eye size={13} />
                            Live Preview
                        </button>
                        {templateForm.category === 'custom' && templateForm.id && (
                            <button
                                type="button"
                                onClick={() => handleDeleteTemplate(templateForm.id)}
                                className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 p-2 rounded-lg hover:bg-rose-50 active:scale-95 transition min-h-[36px]"
                                title="Delete Custom Template"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                </div>

                <form onSubmit={handleSaveTemplate} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <InputLabel value="Template Display Name" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1" />
                            <TextInput
                                className="w-full text-xs min-h-[44px]"
                                value={templateForm.name}
                                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <InputLabel value="Email Subject Line" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1" />
                            <TextInput
                                className="w-full text-xs min-h-[44px]"
                                value={templateForm.subject}
                                onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <InputLabel value="Banner Headline (Optional)" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1" />
                        <TextInput
                            className="w-full text-xs min-h-[44px]"
                            placeholder="e.g. Welcome to LikhangKamay!"
                            value={templateForm.headline}
                            onChange={(e) => setTemplateForm({ ...templateForm, headline: e.target.value })}
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <InputLabel value="Email Body Content" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider" />
                            <span className="text-[9px] text-stone-400">Click pill to insert tag</span>
                        </div>
                        
                        {/* Placeholder Pills */}
                        <div className="flex overflow-x-auto scrollbar-none no-scrollbar whitespace-nowrap gap-1.5 mb-2 py-1 scroll-smooth snap-x touch-pan-x min-w-0 max-w-full">
                            {[
                                '{user_name}', 
                                '{shop_name}', 
                                '{order_number}', 
                                '{total_amount}',
                                '{payment_id}',
                                '{payment_method}',
                                '{tier_label}',
                                '{amount_paid}',
                                '{reference_number}',
                                '{login_email}',
                                '{temporary_password}',
                                '{role_name}',
                                '{verification_code}', 
                                '{site_name}', 
                                '{action_url}'
                            ].map((tag) => (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => insertPlaceholder(tag)}
                                    className="text-[9px] font-mono font-bold bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 px-2.5 py-1 rounded-md transition shrink-0 snap-start inline-flex items-center min-h-[32px]"
                                >
                                    + {tag}
                                </button>
                            ))}
                        </div>

                        <textarea
                            rows={7}
                            className="w-full rounded-xl border-stone-200 bg-stone-50/30 text-xs p-3 font-mono text-stone-800 focus:ring-clay-500/20 focus:border-clay-500"
                            value={templateForm.body}
                            onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <InputLabel value="Button Label (Optional)" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1" />
                            <TextInput
                                className="w-full text-xs min-h-[44px]"
                                placeholder="e.g. View Order Details"
                                value={templateForm.button_label}
                                onChange={(e) => setTemplateForm({ ...templateForm, button_label: e.target.value })}
                            />
                        </div>
                        <div>
                            <InputLabel value="Button Target URL (Optional)" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1" />
                            <TextInput
                                className="w-full text-xs min-h-[44px]"
                                placeholder="e.g. {action_url} or https://likhangkamay.app/..."
                                value={templateForm.button_url}
                                onChange={(e) => setTemplateForm({ ...templateForm, button_url: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <PrimaryButton type="submit" disabled={isSavingTemplate} className="px-5 py-2.5 text-xs font-bold gap-2 active:scale-95 min-h-[44px]">
                            <Edit3 size={13} className={isSavingTemplate ? "animate-spin" : ""} />
                            {isSavingTemplate ? "Saving Template..." : "Save Template Changes"}
                        </PrimaryButton>
                    </div>
                </form>
            </div>

            {/* LIVE EMAIL PREVIEW MODAL */}
            <Modal show={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} maxWidth="2xl">
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                        <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Live Email Render Preview</h3>
                        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg">
                            <button
                                type="button"
                                onClick={() => setPreviewDevice('desktop')}
                                className={`p-1.5 rounded text-xs transition ${previewDevice === 'desktop' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
                                title="Desktop Preview"
                            >
                                <Monitor size={14} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreviewDevice('mobile')}
                                className={`p-1.5 rounded text-xs transition ${previewDevice === 'mobile' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
                                title="Mobile Preview"
                            >
                                <Smartphone size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="bg-[#FDFBF9] p-4 rounded-xl border border-stone-200 overflow-x-auto flex justify-center">
                        <div className={`bg-white border border-[#E7E1D8] rounded-xl overflow-hidden shadow-sm transition-all ${
                            previewDevice === 'mobile' ? 'w-[340px]' : 'w-[560px]'
                        }`}>
                            <div className="bg-[#F7F4F0] border-b border-[#E7E1D8] p-4 text-center">
                                <span className="font-serif text-lg font-bold text-[#2E2520]">LikhangKamay</span>
                            </div>

                            <div className="p-6 space-y-4">
                                {templateForm.headline && (
                                    <h2 className="font-serif text-lg font-normal text-[#2E2520] text-center">{templateForm.headline}</h2>
                                )}
                                <div className="text-xs text-[#5C524A] leading-relaxed whitespace-pre-line">
                                    {templateForm.body
                                        .replace(/{user_name}/g, auth?.user?.name || 'Juan Dela Cruz')
                                        .replace(/{shop_name}/g, 'Mayon Pottery Studio')
                                        .replace(/{order_number}/g, 'ORD-SAMPLE-1001')
                                        .replace(/{verification_code}/g, '849204')
                                        .replace(/{site_name}/g, 'LikhangKamay')
                                        .replace(/{action_url}/g, 'https://likhangkamay.app')
                                    }
                                </div>

                                {templateForm.button_label && (
                                    <div className="text-center pt-2">
                                        <span className="inline-block bg-[#8B4513] text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-sm">
                                            {templateForm.button_label}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="bg-[#F7F4F0] border-t border-[#E7E1D8] p-4 text-center text-[10px] text-[#8C827A]">
                                <p>Supporting Filipino artisans and handcrafted goods.</p>
                                <p className="mt-1">&copy; {new Date().getFullYear()} LikhangKamay. All rights reserved.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <SecondaryButton onClick={() => setIsPreviewOpen(false)}>Close Preview</SecondaryButton>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
