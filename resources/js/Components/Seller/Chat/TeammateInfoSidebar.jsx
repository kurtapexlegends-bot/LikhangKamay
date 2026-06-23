import React, { useState, useMemo } from 'react';
import { X, User, Mail, ShieldAlert, Phone, FileIcon, ImageIcon, Paperclip } from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';

export default function TeammateInfoSidebar({
    currentChatUser,
    setShowInfoPanel,
    activeMessages = []
}) {
    const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'files'

    if (!currentChatUser) return null;

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
            
            <div className="fixed inset-y-0 right-0 z-50 xl:z-auto w-80 max-w-[85vw] xl:max-w-none xl:w-80 bg-white border-l border-stone-200 flex flex-col shrink-0 h-full shadow-2xl xl:shadow-none xl:relative animate-in slide-in-from-right duration-300">
                {/* Header */}
                <header className="px-5 py-4 border-b border-stone-100 flex items-center justify-between shrink-0">
                    <h3 className="font-bold text-stone-900 text-sm tracking-wide uppercase">Teammate Details</h3>
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
                        onClick={() => setActiveTab('profile')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition ${
                            activeTab === 'profile'
                                ? 'border-b-2 border-clay-600 text-clay-700'
                                : 'text-stone-400 hover:text-stone-600'
                        }`}
                    >
                        Profile
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
                    {activeTab === 'profile' ? (
                        <div className="space-y-6">
                            {/* Profile Card */}
                            <div className="flex flex-col items-center text-center">
                                <div className="relative mb-4 w-24 h-24 mx-auto shrink-0">
                                    <UserAvatar user={currentChatUser} className="w-24 h-24 text-3xl shadow-md border-4 border-white" />
                                    {currentChatUser.is_online && (
                                        <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-4 border-white z-20" />
                                    )}
                                </div>
                                <h4 className="font-bold text-stone-900 text-lg mb-1 truncate w-full">{currentChatUser.name}</h4>
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400 mb-4">
                                    {currentChatUser.roleLabel}
                                </p>
                            </div>

                            {/* Details List */}
                            <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-100 space-y-4">
                                <div className="flex items-start gap-3">
                                    <Mail size={16} className="text-stone-400 mt-0.5 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-stone-900 break-all">{currentChatUser.email}</p>
                                        <p className="text-xs text-stone-500">Email Address</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <User size={16} className="text-stone-400 mt-0.5 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-stone-900 truncate">{currentChatUser.name}</p>
                                        <p className="text-xs text-stone-500">Contact Person</p>
                                    </div>
                                </div>

                                {currentChatUser.phone_number && (
                                    <div className="flex items-start gap-3">
                                        <Phone size={16} className="text-stone-400 mt-0.5 shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-stone-900 truncate">{currentChatUser.phone_number}</p>
                                            <p className="text-xs text-stone-500">Phone Number</p>
                                        </div>
                                    </div>
                                )}
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
                                    <p className="text-xs font-medium">No files shared in this thread yet.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
