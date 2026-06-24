import React, { useState, useMemo } from 'react';
import { X, Hash, FileIcon, ImageIcon, Paperclip, Users } from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';

export default function ChannelInfoSidebar({
    currentChannel,
    setShowInfoPanel,
    activeMessages = []
}) {
    const [activeTab, setActiveTab] = useState('info'); // 'info' | 'files'

    if (!currentChannel) return null;

    // Filter and collect all shared files from activeMessages
    const sharedFiles = useMemo(() => {
        return activeMessages
            .filter((msg) => msg.attachment_path)
            .map((msg) => ({
                id: msg.id,
                name: msg.attachment_path.split('/').pop() || 'Attachment',
                path: `/storage/${msg.attachment_path}`,
                type: msg.attachment_type || 'document',
                time: msg.time
            }))
            .reverse(); // Newest first
    }, [activeMessages]);

    return (
        <>
            {/* Backdrop for mobile */}
            <div
                className="fixed inset-0 bg-stone-900/35 backdrop-blur-[1px] z-50 xl:hidden animate-in fade-in duration-200"
                onClick={() => setShowInfoPanel(false)}
            />
            
            <div className="fixed inset-y-0 right-0 z-50 xl:z-auto w-80 max-w-[85vw] xl:max-w-none xl:w-80 bg-white border-l border-stone-200 flex flex-col shrink-0 h-full shadow-2xl xl:shadow-none xl:relative animate-in slide-in-from-right duration-300 font-sans text-stone-850">
                {/* Header */}
                <header className="px-5 py-4 border-b border-stone-100 flex items-center justify-between shrink-0">
                    <h3 className="font-bold text-stone-900 text-sm tracking-wide uppercase">Channel Details</h3>
                    <button
                        onClick={() => setShowInfoPanel(false)}
                        className="p-2 -mr-2 text-stone-400 hover:text-stone-600 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        type="button"
                    >
                        <X size={18} />
                    </button>
                </header>

                {/* Tab Switcher */}
                <div className="flex border-b border-stone-100 shrink-0">
                    <button
                        type="button"
                        onClick={() => setActiveTab('info')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition ${
                            activeTab === 'info'
                                ? 'border-b-2 border-clay-600 text-clay-700'
                                : 'text-stone-400 hover:text-stone-600'
                        }`}
                    >
                        Info
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('files')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 ${
                            activeTab === 'files'
                                ? 'border-b-2 border-clay-600 text-clay-700'
                                : 'text-stone-400 hover:text-stone-600'
                        }`}
                    >
                        Shared Files
                        {sharedFiles.length > 0 && (
                            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">
                                {sharedFiles.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    {activeTab === 'info' ? (
                        <div className="space-y-6">
                            {/* Profile Card */}
                            <div className="flex flex-col items-center text-center">
                                <div className="mb-4 w-16 h-16 mx-auto shrink-0 bg-stone-100 rounded-2xl border border-stone-200 flex items-center justify-center text-stone-500 shadow-sm">
                                    <Hash size={32} />
                                </div>
                                <h4 className="font-bold text-stone-900 text-lg mb-1 truncate w-full">#{currentChannel.name}</h4>
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400 mb-4">
                                    {currentChannel.members_count || 0} Members
                                </p>
                            </div>

                            {/* Details List */}
                            <div className="space-y-5">
                                {currentChannel.description && (
                                    <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-100">
                                        <h5 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Description</h5>
                                        <p className="text-xs text-stone-700 leading-relaxed">{currentChannel.description}</p>
                                    </div>
                                )}

                                <div>
                                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2 flex items-center gap-1.5">
                                        <Users size={12} /> Members
                                    </h5>
                                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                                        {currentChannel.members?.map((member) => (
                                            <div key={member.id} className="flex items-center gap-2.5">
                                                <UserAvatar user={member} className="w-7 h-7 text-xs shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-semibold text-stone-800 truncate leading-tight">
                                                        {member.name}
                                                    </p>
                                                    <span className="text-[9px] text-stone-400 uppercase tracking-wider font-bold">
                                                        {member.roleLabel}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sharedFiles.length > 0 ? (
                                sharedFiles.map((file) => (
                                    <a
                                        key={file.id}
                                        href={file.path}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-3 p-3 bg-stone-50 hover:bg-stone-100 border border-stone-100 rounded-xl transition text-left group"
                                    >
                                        <div className="p-2 rounded-lg bg-white border border-stone-100 text-stone-500 shadow-sm shrink-0">
                                            {file.type === 'image' ? <ImageIcon size={16} /> : <FileIcon size={16} />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-semibold text-stone-800 truncate group-hover:underline underline-offset-2">
                                                {file.name}
                                            </p>
                                            <span className="text-[10px] text-stone-400 block mt-0.5">{file.time}</span>
                                        </div>
                                    </a>
                                ))
                            ) : (
                                <div className="text-center py-12 text-stone-400">
                                    <Paperclip className="mx-auto mb-3 opacity-40 animate-pulse" size={24} />
                                    <p className="text-xs font-medium">No files shared in this channel yet.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
