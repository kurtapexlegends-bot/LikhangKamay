import React from 'react';
import { useForm } from '@inertiajs/react';
import { Plus, X } from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';

export default function CreateChannelModal({ isOpen, onClose, eligibleContacts = [] }) {
    const form = useForm({
        name: '',
        description: '',
        member_ids: [],
    });

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        form.post(route('team-messages.channels.store'), {
            onSuccess: () => {
                form.reset();
                onClose();
            }
        });
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <div 
                className="fixed inset-0 bg-stone-900/40 backdrop-blur-[2px] transition-opacity" 
                onClick={onClose}
            />
            <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-2xl transition-all border border-stone-200 font-sans text-stone-850">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
                    <h3 className="text-base font-bold text-stone-950 flex items-center gap-2">
                        <Plus size={18} /> Create Channel
                    </h3>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1.5 text-stone-400 hover:bg-stone-50 hover:text-stone-600 transition"
                        type="button"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1 font-sans">
                            Channel Name
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold">#</span>
                            <input
                                type="text"
                                required
                                placeholder="e.g. general, marketing"
                                value={form.data.name}
                                onChange={e => form.setData('name', e.target.value)}
                                className="w-full rounded-xl border border-stone-250 py-2.5 pl-7 pr-4 text-sm focus:border-clay-400 focus:bg-white focus:ring-clay-100"
                            />
                        </div>
                        {form.errors.name && (
                            <p className="mt-1 text-xs text-red-600">{form.errors.name}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1 font-sans">
                            Description
                        </label>
                        <textarea
                            placeholder="Optional description of the channel"
                            value={form.data.description}
                            onChange={e => form.setData('description', e.target.value)}
                            className="w-full rounded-xl border border-stone-250 py-2.5 px-4 text-sm focus:border-clay-400 focus:bg-white focus:ring-clay-100"
                            rows={2}
                        />
                        {form.errors.description && (
                            <p className="mt-1 text-xs text-red-600">{form.errors.description}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2 font-sans">
                            Add Members
                        </label>
                        <div className="max-h-48 overflow-y-auto space-y-2 bg-stone-50 border border-stone-200 rounded-xl p-3 font-sans">
                            {eligibleContacts.map(contact => {
                                const isChecked = form.data.member_ids.includes(contact.id);
                                return (
                                    <label 
                                        key={contact.id} 
                                        className="flex items-center gap-3 cursor-pointer hover:bg-white p-1.5 rounded-lg transition"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {
                                                const currentIds = [...form.data.member_ids];
                                                if (isChecked) {
                                                    form.setData('member_ids', currentIds.filter(id => id !== contact.id));
                                                } else {
                                                    form.setData('member_ids', [...currentIds, contact.id]);
                                                }
                                            }}
                                            className="rounded border-stone-300 text-clay-650 focus:ring-clay-100"
                                        />
                                        <UserAvatar user={contact} className="w-6 h-6 text-[10px] shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-semibold text-stone-850 truncate leading-none">
                                                {contact.name}
                                            </p>
                                            <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">
                                                {contact.roleLabel}
                                            </span>
                                        </div>
                                    </label>
                                );
                            })}
                            {eligibleContacts.length === 0 && (
                                <p className="text-xs text-stone-400 italic">No other staff members available</p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-bold text-stone-600 hover:bg-stone-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="rounded-xl bg-clay-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-clay-700 disabled:opacity-50"
                        >
                            {form.processing ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
