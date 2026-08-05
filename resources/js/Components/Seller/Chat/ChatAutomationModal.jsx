import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { X, Sparkles, MessageSquare, Bot, Plus, Trash2, Edit2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';

export default function ChatAutomationModal({
    isOpen,
    onClose,
    autoReplySettings = null,
    chatTemplates = [],
    canEdit = true
}) {
    if (!isOpen) return null;

    const [activeTab, setActiveTab] = useState('auto-reply'); // 'auto-reply' | 'templates'
    const { addToast } = useToast();

    // Auto-Reply Form
    const autoReplyForm = useForm({
        auto_reply_on_completion: autoReplySettings?.enabled ?? true,
        auto_reply_completion_message: autoReplySettings?.message || '',
    });

    // Quick Templates Form
    const [editingTemplateId, setEditingTemplateId] = useState(null);
    const templateForm = useForm({
        title: '',
        shortcut: '',
        message: '',
    });

    const handleSaveAutoReply = (e) => {
        e.preventDefault();
        autoReplyForm.post(route('chat.auto-reply.update'), {
            preserveScroll: true,
            onSuccess: () => {
                addToast('Order completion auto-reply settings saved!', 'success');
            },
            onError: () => {
                addToast('Failed to save auto-reply settings.', 'error');
            }
        });
    };

    const insertToken = (token) => {
        autoReplyForm.setData('auto_reply_completion_message', (autoReplyForm.data.auto_reply_completion_message || '') + ` ${token} `);
    };

    const handleSaveTemplate = (e) => {
        e.preventDefault();
        if (editingTemplateId) {
            templateForm.put(route('chat.templates.update', editingTemplateId), {
                preserveScroll: true,
                onSuccess: () => {
                    addToast('Template updated successfully.', 'success');
                    resetTemplateForm();
                }
            });
        } else {
            templateForm.post(route('chat.templates.store'), {
                preserveScroll: true,
                onSuccess: () => {
                    addToast('Quick template added.', 'success');
                    resetTemplateForm();
                }
            });
        }
    };

    const handleEditTemplate = (tmpl) => {
        setEditingTemplateId(tmpl.id);
        templateForm.setData({
            title: tmpl.title || '',
            shortcut: tmpl.shortcut || '',
            message: tmpl.message || '',
        });
    };

    const handleDeleteTemplate = (id) => {
        if (!confirm('Are you sure you want to delete this template?')) return;
        templateForm.delete(route('chat.templates.destroy', id), {
            preserveScroll: true,
            onSuccess: () => {
                addToast('Template removed.', 'info');
                if (editingTemplateId === id) resetTemplateForm();
            }
        });
    };

    const resetTemplateForm = () => {
        setEditingTemplateId(null);
        templateForm.reset();
    };

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4 bg-stone-50/70">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-clay-100 text-clay-700 rounded-xl">
                            <Bot size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-stone-900 leading-tight">Chat Automation & Templates</h2>
                            <p className="text-xs text-stone-500">Configure automated customer replies and instant templates</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1.5 text-stone-400 hover:bg-stone-200/60 hover:text-stone-700 transition"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs Header */}
                <div className="flex border-b border-stone-100 bg-white px-6">
                    <button
                        onClick={() => setActiveTab('auto-reply')}
                        className={`flex items-center gap-2 py-3.5 px-2 text-xs font-bold border-b-2 transition ${
                            activeTab === 'auto-reply'
                                ? 'border-clay-600 text-clay-700'
                                : 'border-transparent text-stone-400 hover:text-stone-600'
                        }`}
                    >
                        <Sparkles size={15} />
                        Order Completion Auto-Reply
                    </button>
                    <button
                        onClick={() => setActiveTab('templates')}
                        className={`flex items-center gap-2 py-3.5 px-2 text-xs font-bold border-b-2 transition ${
                            activeTab === 'templates'
                                ? 'border-clay-600 text-clay-700'
                                : 'border-transparent text-stone-400 hover:text-stone-600'
                        }`}
                    >
                        <MessageSquare size={15} />
                        Quick Reply Templates ({chatTemplates.length})
                    </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'auto-reply' && (
                        <form onSubmit={handleSaveAutoReply} className="space-y-5">
                            <div className="flex items-start justify-between gap-4 rounded-2xl border border-stone-200/80 bg-stone-50/50 p-4">
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-stone-900">Enable Order Completion Auto-Reply</h4>
                                    <p className="text-xs text-stone-500 leading-relaxed">
                                        Automatically dispatches your thank-you message to the buyer when an order is completed.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(autoReplyForm.data.auto_reply_on_completion)}
                                        disabled={!canEdit}
                                        onChange={(e) => autoReplyForm.setData('auto_reply_on_completion', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-clay-600"></div>
                                </label>
                            </div>

                            {autoReplyForm.data.auto_reply_on_completion && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                                            Automated Thank You Message
                                        </label>
                                        <span className="text-[11px] text-stone-400">
                                            {autoReplyForm.data.auto_reply_completion_message.length}/1000
                                        </span>
                                    </div>
                                    <textarea
                                        value={autoReplyForm.data.auto_reply_completion_message}
                                        disabled={!canEdit}
                                        onChange={(e) => autoReplyForm.setData('auto_reply_completion_message', e.target.value)}
                                        placeholder="Thank you for your purchase! Your order #{order_number} is now complete. We hope you enjoy your handcrafted items! Feel free to leave a review or reach out if you need anything else."
                                        rows={4}
                                        maxLength={1000}
                                        className="w-full rounded-2xl border border-stone-200 bg-white p-3.5 text-xs font-medium text-stone-800 placeholder-stone-400 focus:border-clay-500 focus:ring-0 transition-all resize-y shadow-xs"
                                    />

                                    {/* Dynamic Token Buttons */}
                                    <div className="rounded-xl border border-stone-200/60 bg-stone-50 p-3">
                                        <p className="text-[11px] font-bold text-stone-600 mb-2">Click to insert dynamic tags:</p>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => insertToken('{order_number}')}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-stone-200 rounded-lg text-xs font-mono text-clay-700 hover:bg-clay-50 transition shadow-2xs"
                                            >
                                                + {"{order_number}"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => insertToken('{buyer_name}')}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-stone-200 rounded-lg text-xs font-mono text-clay-700 hover:bg-clay-50 transition shadow-2xs"
                                            >
                                                + {"{buyer_name}"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => insertToken('{shop_name}')}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-stone-200 rounded-lg text-xs font-mono text-clay-700 hover:bg-clay-50 transition shadow-2xs"
                                            >
                                                + {"{shop_name}"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="pt-3 border-t border-stone-100 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={autoReplyForm.processing || !canEdit}
                                    className="inline-flex items-center gap-2 rounded-xl bg-clay-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-clay-700 disabled:opacity-50 transition"
                                >
                                    <CheckCircle2 size={15} />
                                    Save Auto-Reply Settings
                                </button>
                            </div>
                        </form>
                    )}

                    {activeTab === 'templates' && (
                        <div className="space-y-6">
                            {/* Template Creation/Edit Form */}
                            <form onSubmit={handleSaveTemplate} className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50/50 p-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                                    {editingTemplateId ? 'Edit Quick Template' : 'Add New Quick Reply Template'}
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        placeholder="Template Title (e.g. Shipping Time)"
                                        value={templateForm.data.title}
                                        onChange={(e) => templateForm.setData('title', e.target.value)}
                                        required
                                        className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium focus:border-clay-500 focus:ring-0"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Shortcut Keyword (e.g. /shipping)"
                                        value={templateForm.data.shortcut}
                                        onChange={(e) => templateForm.setData('shortcut', e.target.value)}
                                        className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium focus:border-clay-500 focus:ring-0"
                                    />
                                </div>
                                <textarea
                                    placeholder="Quick reply message body..."
                                    value={templateForm.data.message}
                                    onChange={(e) => templateForm.setData('message', e.target.value)}
                                    required
                                    rows={2}
                                    className="w-full rounded-xl border border-stone-200 bg-white p-3 text-xs font-medium focus:border-clay-500 focus:ring-0 resize-none"
                                />
                                <div className="flex items-center justify-between pt-1">
                                    {editingTemplateId && (
                                        <button
                                            type="button"
                                            onClick={resetTemplateForm}
                                            className="text-xs font-bold text-stone-500 hover:text-stone-800"
                                        >
                                            Cancel Editing
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={templateForm.processing || !canEdit}
                                        className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50 transition"
                                    >
                                        <Plus size={14} />
                                        {editingTemplateId ? 'Update Template' : 'Save Template'}
                                    </button>
                                </div>
                            </form>

                            {/* Existing Templates List */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">Existing Templates</h4>
                                {chatTemplates.length > 0 ? (
                                    <div className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
                                        {chatTemplates.map((tmpl) => (
                                            <div key={tmpl.id} className="flex items-start justify-between p-3.5 hover:bg-stone-50 transition">
                                                <div className="min-w-0 flex-1 pr-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-stone-900">{tmpl.title}</span>
                                                        {tmpl.shortcut && (
                                                            <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-stone-600">
                                                                {tmpl.shortcut}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-stone-600 mt-1 line-clamp-2">{tmpl.message}</p>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        onClick={() => handleEditTemplate(tmpl)}
                                                        className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteTemplate(tmpl.id)}
                                                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-dashed border-stone-200 p-6 text-center text-xs text-stone-400">
                                        No quick reply templates created yet. Add your first template above!
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
