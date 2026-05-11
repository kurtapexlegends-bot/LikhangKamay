import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import Modal from '@/Components/Modal';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import { Plus, Edit2, Trash2, Megaphone, Info, AlertTriangle, AlertCircle, CheckCircle, Play, Square, Clock, Calendar, Gift, Star, Zap, Sparkles, Tag, ShoppingBag, Eye } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';

import FloatingModuleActions from '@/Components/FloatingModuleActions';

// Available Icons for the Custom Composer
const AVAILABLE_ICONS = [
    { name: 'megaphone', icon: Megaphone, label: 'Megaphone' },
    { name: 'gift', icon: Gift, label: 'Gift' },
    { name: 'star', icon: Star, label: 'Star' },
    { name: 'zap', icon: Zap, label: 'Flash' },
    { name: 'sparkles', icon: Sparkles, label: 'Sparkles' },
    { name: 'tag', icon: Tag, label: 'Tag' },
    { name: 'shopping-bag', icon: ShoppingBag, label: 'Shopping Bag' },
    { name: 'info', icon: Info, label: 'Info' },
    { name: 'alert-triangle', icon: AlertTriangle, label: 'Warning' },
];

export default function Announcements({ announcements }) {
    const { addToast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        message: '',
        type: 'info',
        target_audience: 'all',
        is_active: false,
        starts_at: '',
        expires_at: '',
        display_duration: '',
        icon_name: 'megaphone',
        bg_color: '#1c1917',
        text_color: '#ffffff',
        action_text: '',
        action_url: '',
    });
    const [processing, setProcessing] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const activeAnnouncement = announcements.find(a => a.is_active);
    const draftAnnouncements = announcements.filter(a => !a.is_active);

    const openCreateModal = () => {
        setFormData({ 
            title: '', message: '', type: 'info', target_audience: 'all', is_active: false, 
            starts_at: '', expires_at: '', display_duration: '', 
            icon_name: 'megaphone', bg_color: '#1c1917', text_color: '#ffffff', action_text: '', action_url: '' 
        });
        setEditingId(null);
        setIsModalOpen(true);
    };

    const formatDatetimeLocal = (isoString) => {
        if (!isoString) return '';
        try {
            const d = new Date(isoString);
            const pad = (n) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        } catch { return ''; }
    };

    const openEditModal = (announcement) => {
        setFormData({
            title: announcement.title,
            message: announcement.message,
            type: announcement.type,
            target_audience: announcement.target_audience,
            is_active: announcement.is_active,
            starts_at: formatDatetimeLocal(announcement.starts_at),
            expires_at: formatDatetimeLocal(announcement.expires_at),
            display_duration: announcement.display_duration || '',
            icon_name: announcement.icon_name || 'megaphone',
            bg_color: announcement.bg_color || '#1c1917',
            text_color: announcement.text_color || '#ffffff',
            action_text: announcement.action_text || '',
            action_url: announcement.action_url || '',
        });
        setEditingId(announcement.id);
        setIsModalOpen(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setProcessing(true);

        const routeName = editingId ? route('admin.announcements.update', editingId) : route('admin.announcements.store');
        const method = editingId ? 'patch' : 'post';

        // Clear custom fields if using standard preset
        const payload = { ...formData };
        if (payload.type !== 'custom') {
            payload.icon_name = null;
            payload.bg_color = null;
            payload.text_color = null;
        }

        router[method](routeName, payload, {
            onSuccess: () => {
                setIsModalOpen(false);
                addToast(`Broadcast draft ${editingId ? 'updated' : 'created'}.`, 'success');
            },
            onFinish: () => setProcessing(false)
        });
    };

    const handleDelete = (id) => {
        if (confirm("Are you sure you want to delete this draft?")) {
            router.delete(route('admin.announcements.destroy', id), {
                only: ['announcements', 'flash'],
                onSuccess: () => addToast('Draft deleted.', 'success')
            });
        }
    };

    const handleBroadcast = (id) => {
        router.post(route('admin.announcements.broadcast', id), {}, {
            only: ['announcements', 'globalAnnouncement', 'flash'],
            preserveScroll: true,
            onSuccess: () => addToast('Broadcast is now live!', 'success')
        });
    };

    const handleStop = (id) => {
        router.post(route('admin.announcements.stop', id), {}, {
            only: ['announcements', 'globalAnnouncement', 'flash'],
            preserveScroll: true,
            onSuccess: () => addToast('Broadcast stopped.', 'success')
        });
    };

    const getTypeDetails = (a) => {
        if (a.type === 'custom') {
            const IconObj = AVAILABLE_ICONS.find(i => i.name === a.icon_name)?.icon || Sparkles;
            return {
                label: 'Custom Campaign',
                color: 'bg-stone-100 text-stone-700 border-stone-200',
                icon: <IconObj size={14} className="mr-1" />
            };
        }
        
        switch(a.type) {
            case 'info': return { label: 'Info', color: 'bg-stone-100 text-stone-700 border-stone-200', icon: <Info size={14} className="mr-1"/> };
            case 'warning': return { label: 'Warning', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <AlertTriangle size={14} className="mr-1"/> };
            case 'danger': return { label: 'Alert', color: 'bg-red-100 text-red-700 border-red-200', icon: <AlertCircle size={14} className="mr-1"/> };
            case 'success': return { label: 'Success', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle size={14} className="mr-1"/> };
            default: return { label: 'Info', color: 'bg-stone-100 text-stone-700 border-stone-200', icon: <Info size={14} className="mr-1"/> };
        }
    };

    const AnnouncementCard = ({ a, isActive = false }) => {
        const typeDetails = getTypeDetails(a);
        const hasSchedule = a.starts_at || a.expires_at;

        return (
            <div className={`relative overflow-hidden rounded-2xl border transition-all ${isActive ? 'border-emerald-200 bg-emerald-50/30 shadow-md' : 'border-stone-200 bg-white shadow-sm hover:shadow-md hover:border-stone-300'}`}>
                {isActive && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 animate-pulse"></div>
                )}
                {a.type === 'custom' && (
                    <div className="absolute top-0 right-0 bottom-0 w-24 opacity-10 pointer-events-none" style={{ backgroundColor: a.bg_color }}></div>
                )}
                <div className="p-5 sm:p-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between relative z-10">
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                            {isActive && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-200 tracking-wider uppercase">
                                    <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" /> Live
                                </span>
                            )}
                            <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${typeDetails.color}`}>
                                {typeDetails.icon} {typeDetails.label}
                            </span>
                            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest bg-stone-100 px-1.5 py-0.5 rounded-md">
                                {a.target_audience}
                            </span>
                            {a.action_url && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-clay-600 bg-clay-50 px-1.5 py-0.5 rounded-md border border-clay-100">
                                    CTA
                                </span>
                            )}
                        </div>
                        <h3 className="text-[15px] font-bold text-stone-900 leading-tight mb-1">{a.title}</h3>
                        <p className="text-xs text-stone-600 line-clamp-2">{a.message}</p>
                        
                        {hasSchedule && (
                            <div className="mt-3 flex flex-wrap items-center gap-y-1 gap-x-3 text-[10px] font-medium text-stone-500 bg-stone-50 rounded-lg w-fit px-2.5 py-1.5 border border-stone-100">
                                <Clock size={12} className="text-stone-400" />
                                {a.starts_at && <span className="whitespace-nowrap">Start: {new Date(a.starts_at).toLocaleDateString()}</span>}
                                {a.expires_at && <span className="whitespace-nowrap">End: {new Date(a.expires_at).toLocaleDateString()}</span>}
                            </div>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 border-t sm:border-t-0 border-stone-50 pt-3.5 sm:pt-0">
                        {isActive ? (
                            <button 
                                onClick={() => handleStop(a.id)}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-stone-900 text-white px-5 py-2 rounded-xl font-bold text-[13px] hover:bg-stone-800 transition shadow-sm active:scale-95"
                            >
                                <Square size={13} className="fill-current" /> Stop Broadcast
                            </button>
                        ) : (
                            <>
                                <button onClick={() => openEditModal(a)} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white py-2 text-[13px] font-bold text-stone-600 hover:bg-stone-50 transition sm:p-2.5 sm:border-0 sm:text-stone-400 sm:hover:text-clay-600">
                                    <Edit2 size={14} /> <span className="sm:hidden">Edit</span>
                                </button>
                                <button onClick={() => handleDelete(a.id)} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white py-2 text-[13px] font-bold text-stone-600 hover:bg-red-50 hover:text-red-700 sm:p-2.5 sm:border-0 sm:text-stone-400 sm:hover:text-red-600">
                                    <Trash2 size={14} /> <span className="sm:hidden">Delete</span>
                                </button>
                                <button 
                                    onClick={() => handleBroadcast(a.id)}
                                    className="flex-[2] sm:flex-none ml-0 sm:ml-2 flex items-center justify-center gap-2 bg-clay-600 text-white px-5 py-2 rounded-xl font-bold text-[13px] hover:bg-clay-700 transition shadow-sm active:scale-95"
                                >
                                    <Play size={13} className="fill-current" /> Broadcast Now
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <AdminLayout title="System Announcements">
            <FloatingModuleActions actions={(
                <button 
                    onClick={openCreateModal}
                    className="flex items-center gap-1.5 bg-stone-900 text-white px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-stone-800 active:scale-95 transition-all shadow-lg shadow-stone-900/20 whitespace-nowrap"
                >
                    <Plus size={14} strokeWidth={3} /> New Broadcast Draft
                </button>
            )} />

            <div className="space-y-8 mt-4">
                {activeAnnouncement && (
                    <section>
                        <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-4">Currently Live</h2>
                        <AnnouncementCard a={activeAnnouncement} isActive={true} />
                    </section>
                )}

                <section>
                    <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-4">Drafts & History</h2>
                    <div className="space-y-4">
                        {draftAnnouncements.length === 0 ? (
                            <div className="border border-dashed border-stone-200 rounded-2xl p-12 text-center flex flex-col items-center bg-stone-50/50">
                                <Megaphone size={32} className="text-stone-300 mb-3" />
                                <p className="text-stone-500 font-medium">No drafts available.</p>
                                <p className="text-xs text-stone-400 mt-1">Create a new broadcast draft to get started.</p>
                            </div>
                        ) : (
                            draftAnnouncements.map(a => <AnnouncementCard key={a.id} a={a} />)
                        )}
                    </div>
                </section>
            </div>

            {isMobile ? (
                <SlideOverDrawer
                    show={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title={editingId ? 'Edit Broadcast' : 'New Broadcast'}
                    widthClass="max-w-xl"
                >
                    <div className="h-full -m-6">
                        <ComposerContent 
                            formData={formData}
                            setFormData={setFormData}
                            handleSubmit={handleSubmit}
                            processing={processing}
                            editingId={editingId}
                            onClose={() => setIsModalOpen(false)}
                            isMobile={true}
                        />
                    </div>
                </SlideOverDrawer>
            ) : (
                <Modal show={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="2xl">
                    <ComposerContent 
                        formData={formData}
                        setFormData={setFormData}
                        handleSubmit={handleSubmit}
                        processing={processing}
                        editingId={editingId}
                        onClose={() => setIsModalOpen(false)}
                        isMobile={false}
                    />
                </Modal>
            )}
        </AdminLayout>
    );
}

const ComposerContent = ({ formData, setFormData, handleSubmit, processing, editingId, onClose, isMobile }) => {
    return (
        <div className={`flex flex-col h-full ${!isMobile ? 'p-6 sm:p-8' : ''}`}>
            <div className={`flex items-center gap-3 mb-6 ${isMobile ? 'p-6 bg-stone-50 border-b border-stone-100' : ''}`}>
                <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600">
                    <Megaphone size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-stone-900 leading-tight">{editingId ? 'Edit Broadcast' : 'Broadcast Composer'}</h3>
                    <p className="text-xs text-stone-500 font-medium">Design and schedule your platform announcement.</p>
                </div>
            </div>
            
            <form onSubmit={handleSubmit} className={`flex-1 flex flex-col ${!isMobile ? 'space-y-6' : 'overflow-hidden'}`}>
                <div className={`${isMobile ? 'flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar' : 'space-y-6'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Left Column: Content */}
                        <div className="space-y-5">
                            <div>
                                <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Headline</label>
                                <input 
                                    type="text" 
                                    required
                                    value={formData.title} 
                                    onChange={e => setFormData({...formData, title: e.target.value})}
                                    placeholder="e.g., Artisan Holiday Sale"
                                    className="w-full rounded-xl border-stone-200 focus:border-stone-900 focus:ring-stone-900 shadow-sm text-sm font-medium"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Message Body</label>
                                <textarea 
                                    required rows="3"
                                    value={formData.message} 
                                    onChange={e => setFormData({...formData, message: e.target.value})}
                                    placeholder="Details about the broadcast..."
                                    className="w-full rounded-xl border-stone-200 focus:border-stone-900 focus:ring-stone-900 shadow-sm text-sm resize-none"
                                />
                            </div>
                            
                            {/* Call to Action */}
                            <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/50 p-4 space-y-4">
                                <h4 className="text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                                    <Eye size={14} className="text-clay-500" /> Optional CTA
                                </h4>
                                <div>
                                    <input 
                                        type="text" 
                                        value={formData.action_text} 
                                        onChange={e => setFormData({...formData, action_text: e.target.value})}
                                        placeholder="Button Text (e.g., Shop Now)"
                                        className="w-full rounded-xl border-stone-200 focus:border-stone-900 focus:ring-stone-900 shadow-sm text-sm mb-2"
                                    />
                                    <input 
                                        type="text" 
                                        value={formData.action_url} 
                                        onChange={e => setFormData({...formData, action_url: e.target.value})}
                                        placeholder="URL (e.g., /shop)"
                                        className="w-full rounded-xl border-stone-200 focus:border-stone-900 focus:ring-stone-900 shadow-sm text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Settings & Theme */}
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Theme Presets</label>
                                    <select 
                                        value={formData.type} 
                                        onChange={e => setFormData({...formData, type: e.target.value})}
                                        className="w-full rounded-xl border-stone-200 focus:border-stone-900 focus:ring-stone-900 shadow-sm text-sm font-medium"
                                    >
                                        <option value="info">Info (Standard)</option>
                                        <option value="warning">Warning (Amber)</option>
                                        <option value="danger">Alert (Red)</option>
                                        <option value="success">Success (Emerald)</option>
                                        <option value="custom">✨ Custom Campaign</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Target Audience</label>
                                    <select 
                                        value={formData.target_audience} 
                                        onChange={e => setFormData({...formData, target_audience: e.target.value})}
                                        className="w-full rounded-xl border-stone-200 focus:border-stone-900 focus:ring-stone-900 shadow-sm text-sm font-medium"
                                    >
                                        <option value="all">Everyone</option>
                                        <option value="artisans">Sellers Only</option>
                                        <option value="buyers">Buyers Only</option>
                                    </select>
                                </div>
                            </div>

                            {/* Custom Theme Controls */}
                            {formData.type === 'custom' && (
                                <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">Banner Icon</label>
                                        <div className="flex flex-wrap gap-2">
                                            {AVAILABLE_ICONS.map(iconOpt => {
                                                const Ico = iconOpt.icon;
                                                return (
                                                    <button 
                                                        key={iconOpt.name}
                                                        type="button"
                                                        onClick={() => setFormData({...formData, icon_name: iconOpt.name})}
                                                        className={`p-2 rounded-lg border transition-all ${formData.icon_name === iconOpt.name ? 'bg-white border-stone-900 text-stone-900 shadow-sm' : 'bg-transparent border-transparent text-stone-400 hover:bg-stone-200/50'}`}
                                                        title={iconOpt.label}
                                                    >
                                                        <Ico size={18} />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Background</label>
                                            <input type="color" value={formData.bg_color} onChange={e => setFormData({...formData, bg_color: e.target.value})} className="h-8 w-full rounded cursor-pointer border-stone-200 p-0.5" />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Text Color</label>
                                            <input type="color" value={formData.text_color} onChange={e => setFormData({...formData, text_color: e.target.value})} className="h-8 w-full rounded cursor-pointer border-stone-200 p-0.5" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Schedule Fields */}
                            <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/50 p-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Calendar size={12}/> Start At</label>
                                        <input 
                                            type="datetime-local" 
                                            value={formData.starts_at} 
                                            onChange={e => setFormData({...formData, starts_at: e.target.value})}
                                            className="w-full rounded-xl border-stone-200 focus:border-stone-900 focus:ring-stone-900 shadow-sm text-[13px] font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Clock size={12}/> Auto-Stop</label>
                                        <input 
                                            type="datetime-local" 
                                            value={formData.expires_at} 
                                            onChange={e => setFormData({...formData, expires_at: e.target.value})}
                                            className="w-full rounded-xl border-stone-200 focus:border-stone-900 focus:ring-stone-900 shadow-sm text-[13px] font-medium"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`mt-8 flex justify-end gap-3 ${isMobile ? 'p-6 bg-white border-t border-stone-100' : 'pt-6 border-t border-stone-100'}`}>
                    <button 
                        type="button" 
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-bold text-stone-500 hover:bg-stone-50 rounded-xl transition"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        disabled={processing}
                        className="px-8 py-2.5 bg-stone-900 text-white rounded-xl font-bold text-sm hover:bg-black active:scale-95 transition shadow-sm disabled:opacity-50"
                    >
                        {processing ? 'Saving...' : 'Save Draft'}
                    </button>
                </div>
            </form>
        </div>
    );
};