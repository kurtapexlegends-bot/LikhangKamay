import React from 'react';
import { X, Pencil, Trash2, MessageCircle } from 'lucide-react';
import Modal from '@/Components/Modal';
import ConfirmationModal from '@/Components/ConfirmationModal';

export default function QuickTemplateSelector({
    showTemplateManager,
    setShowTemplateManager,
    chatTemplates,
    editingTemplateId,
    setEditingTemplateId,
    templateData,
    setTemplateData,
    templateProcessing,
    submitTemplate,
    resetTemplate,
    templateErrors,
    handleEditTemplate,
    handleDeleteTemplate,
    deletingTemplateId,
    setDeletingTemplateId,
    confirmDeleteTemplate
}) {
    const handleClose = () => {
        setShowTemplateManager(false);
        setEditingTemplateId(null);
        resetTemplate();
    };

    return (
        <>
            {/* TEMPLATE MANAGER MODAL - bottomSheet={true} for mobile ergonomics */}
            <Modal 
                show={showTemplateManager} 
                onClose={handleClose} 
                maxWidth="2xl" 
                bottomSheet={true}
            >
                <div className="flex flex-col max-h-[85vh] sm:h-[80vh]">
                    {/* Header */}
                    <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                        <div>
                            <h3 className="text-base sm:text-lg font-bold text-gray-900">Message Templates</h3>
                            <p className="text-xs text-gray-500">Create reusable responses for faster communication.</p>
                        </div>
                        <button 
                            onClick={handleClose} 
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none"
                            type="button"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content split panel */}
                    <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
                        {/* Templates List */}
                        <div className="w-full md:w-1/2 border-r border-gray-100 overflow-y-auto p-4 space-y-2">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Your Saved Templates</span>
                                <button 
                                    onClick={() => { setEditingTemplateId(null); resetTemplate(); }}
                                    className="text-[10px] font-bold text-clay-600 hover:text-clay-700 min-h-[32px] px-2 flex items-center"
                                    type="button"
                                >
                                    + New Template
                                </button>
                            </div>
                            {chatTemplates.length > 0 ? (
                                chatTemplates.map((tpl) => (
                                    <div 
                                        key={tpl.id} 
                                        className={`p-3 rounded-xl border transition-all ${
                                            editingTemplateId === tpl.id 
                                            ? 'bg-clay-50 border-clay-200 ring-2 ring-clay-100' 
                                            : 'bg-white border-gray-100 hover:border-gray-200 shadow-sm'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start gap-2 mb-1">
                                            <h4 className="text-xs font-bold text-gray-900 truncate">{tpl.title}</h4>
                                            <div className="flex gap-1 shrink-0">
                                                <button 
                                                    onClick={() => handleEditTemplate(tpl)} 
                                                    className="p-1.5 text-gray-400 hover:text-clay-600 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg hover:bg-clay-50"
                                                    type="button"
                                                >
                                                    <Pencil size={13} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteTemplate(tpl.id)} 
                                                    className="p-1.5 text-gray-400 hover:text-red-600 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg hover:bg-red-50"
                                                    type="button"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">{tpl.content}</p>
                                    </div>
                                ))
                            ) : (
                                <div className="py-12 text-center">
                                    <MessageCircle size={32} className="text-gray-200 mx-auto mb-3" />
                                    <p className="text-xs text-gray-400 font-medium">No templates saved yet.</p>
                                </div>
                            )}
                        </div>

                        {/* Template Input Form */}
                        <div className="flex-1 bg-gray-50/50 p-5 sm:p-6 overflow-y-auto">
                            <form onSubmit={submitTemplate} className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">
                                    {editingTemplateId ? 'Edit Template' : 'Create New Template'}
                                </h4>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase">Template Title</label>
                                    <input 
                                        type="text"
                                        value={templateData.title}
                                        onChange={e => setTemplateData('title', e.target.value)}
                                        placeholder="e.g. Greeting, Shipping Update..."
                                        className="w-full bg-white border-gray-200 rounded-xl text-sm focus:ring-clay-500 focus:border-clay-500 shadow-sm min-h-[44px]"
                                        required
                                    />
                                    {templateErrors.title && <p className="mt-1 text-[10px] text-red-500 font-bold">{templateErrors.title}</p>}
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase">Message Content</label>
                                    <textarea 
                                        rows={6}
                                        value={templateData.content}
                                        onChange={e => setTemplateData('content', e.target.value)}
                                        placeholder="Type the message you want to reuse..."
                                        className="w-full bg-white border-gray-200 rounded-xl text-sm focus:ring-clay-500 focus:border-clay-500 shadow-sm resize-none"
                                        required
                                    />
                                    {templateErrors.content && <p className="mt-1 text-[10px] text-red-500 font-bold">{templateErrors.content}</p>}
                                </div>
                                <div className="pt-2">
                                    <button 
                                        type="submit" 
                                        disabled={templateProcessing}
                                        className="w-full py-3 bg-clay-600 text-white rounded-xl text-sm font-bold hover:bg-clay-700 transition shadow-lg shadow-clay-100 disabled:opacity-50 min-h-[44px] flex items-center justify-center focus:outline-none"
                                    >
                                        {templateProcessing ? 'Saving...' : editingTemplateId ? 'Update Template' : 'Save Template'}
                                    </button>
                                    {editingTemplateId && (
                                        <button 
                                            type="button"
                                            onClick={() => { setEditingTemplateId(null); resetTemplate(); }}
                                            className="w-full mt-2 py-2 text-[11px] font-bold text-gray-500 hover:text-gray-700 transition min-h-[44px] flex items-center justify-center"
                                        >
                                            Cancel Editing
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </Modal>

            <ConfirmationModal
                isOpen={!!deletingTemplateId}
                onClose={() => setDeletingTemplateId(null)}
                onConfirm={confirmDeleteTemplate}
                title="Delete Chat Template"
                message="Are you sure you want to permanently delete this chat template? This will remove it from your quick-access list."
                icon={Trash2}
                iconBg="bg-rose-50 text-rose-600"
                confirmText="Delete Template"
                confirmColor="bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-600/30"
                isHighRisk={true}
            />
        </>
    );
}
