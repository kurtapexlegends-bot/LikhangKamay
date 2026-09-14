/* global route */
import React, { useState, useEffect } from 'react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import {
    Users,
    User,
    Mail,
    Search,
    ChevronDown,
    Sparkles,
    Zap,
    RotateCcw,
    Send,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react';

export default function AudienceBroadcastComposer({
    templates = [],
    auth,
}) {
    const [targetType, setTargetType] = useState('user'); // 'user' | 'role' | 'email'
    const [searchQuery, setSearchQuery] = useState('');
    const [userSearchResults, setUserSearchResults] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [targetRole, setTargetRole] = useState('all_artisans');
    const [targetEmail, setTargetEmail] = useState(auth?.user?.email || '');

    const [loadedBroadcastTemplateId, setLoadedBroadcastTemplateId] = useState('');
    const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);
    const [templateSearchQuery, setTemplateSearchQuery] = useState('');
    const [broadcastSubject, setBroadcastSubject] = useState('');
    const [broadcastHeadline, setBroadcastHeadline] = useState('');
    const [broadcastBody, setBroadcastBody] = useState('');
    const [broadcastButtonLabel, setBroadcastButtonLabel] = useState('');
    const [broadcastButtonUrl, setBroadcastButtonUrl] = useState('');
    const [isDispatching, setIsDispatching] = useState(false);
    const [dispatchResult, setDispatchResult] = useState(null);

    // User Search for Broadcast
    useEffect(() => {
        if (targetType === 'user' && searchQuery.trim().length > 1) {
            const timer = setTimeout(async () => {
                try {
                    const res = await window.axios.get(route('admin.email-templates.index'), {
                        params: { query: searchQuery }
                    });
                    setUserSearchResults(res.data.users || []);
                } catch (err) {
                    console.error('User search failed', err);
                }
            }, 300);
            return () => clearTimeout(timer);
        } else {
            setUserSearchResults([]);
        }
    }, [searchQuery, targetType]);

    const handleSelectBroadcastTemplate = (tplId) => {
        setLoadedBroadcastTemplateId(tplId);
        if (!tplId) {
            return;
        }
        const found = templates.find(t => t.id === Number(tplId));
        if (found) {
            setBroadcastSubject(found.subject);
            setBroadcastHeadline(found.headline || '');
            setBroadcastBody(found.body || '');
            setBroadcastButtonLabel(found.button_label || '');
            setBroadcastButtonUrl(found.button_url || '');
        }
    };

    const handleClearBroadcastForm = () => {
        setLoadedBroadcastTemplateId('');
        setBroadcastSubject('');
        setBroadcastHeadline('');
        setBroadcastBody('');
        setBroadcastButtonLabel('');
        setBroadcastButtonUrl('');
    };

    const handleDispatchBroadcast = async () => {
        setIsDispatching(true);
        setDispatchResult(null);

        try {
            const payload = {
                target_type: targetType,
                target_user_id: selectedUser?.id || null,
                target_role: targetRole,
                target_email: targetEmail,
                subject: broadcastSubject,
                headline: broadcastHeadline,
                body: broadcastBody,
                button_label: broadcastButtonLabel,
                button_url: broadcastButtonUrl,
            };

            const res = await window.axios.post(route('admin.email-templates.dispatch'), payload);
            setDispatchResult({
                success: true,
                message: res.data.message,
                dispatched_count: res.data.dispatched_count,
                latency: res.data.latency_ms,
                driver: res.data.driver,
            });
        } catch (err) {
            setDispatchResult({
                success: false,
                message: err.response?.data?.message || 'Email broadcast failed. Check system logs.',
            });
        } finally {
            setIsDispatching(false);
        }
    };

    const systemTemplates = templates.filter(t => t.category === 'system');
    const customTemplates = templates.filter(t => t.category === 'custom');
    const loadedTemplateObj = templates.find(t => t.id === Number(loadedBroadcastTemplateId));

    const filteredSystem = systemTemplates.filter(t => 
        !templateSearchQuery || 
        t.name.toLowerCase().includes(templateSearchQuery.toLowerCase()) || 
        t.subject.toLowerCase().includes(templateSearchQuery.toLowerCase())
    );

    const filteredCustom = customTemplates.filter(t => 
        !templateSearchQuery || 
        t.name.toLowerCase().includes(templateSearchQuery.toLowerCase()) || 
        t.subject.toLowerCase().includes(templateSearchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Target Audience Selector */}
            <div className="bg-stone-50/80 rounded-xl p-4 border border-stone-200/60 space-y-4">
                <h4 className="text-[10px] font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                    <Users size={14} className="text-clay-600" />
                    Select Target Audience
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                        type="button"
                        onClick={() => setTargetType('user')}
                        className={`p-3.5 rounded-xl border text-left transition-all active:scale-95 flex items-start gap-3 ${
                            targetType === 'user' ? 'bg-white border-clay-500 shadow-sm ring-2 ring-clay-500/20' : 'bg-white border-stone-200 hover:border-stone-300'
                        }`}
                    >
                        <div className={`p-2 rounded-lg shrink-0 ${targetType === 'user' ? 'bg-clay-100 text-clay-700' : 'bg-stone-100 text-stone-500'}`}>
                            <User size={16} />
                        </div>
                        <div>
                            <span className="block text-xs font-bold text-stone-900">Specific User</span>
                            <span className="block text-[9px] text-stone-500 mt-0.5 leading-snug">Search and select a single registered account.</span>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => setTargetType('role')}
                        className={`p-3.5 rounded-xl border text-left transition-all active:scale-95 flex items-start gap-3 ${
                            targetType === 'role' ? 'bg-white border-clay-500 shadow-sm ring-2 ring-clay-500/20' : 'bg-white border-stone-200 hover:border-stone-300'
                        }`}
                    >
                        <div className={`p-2 rounded-lg shrink-0 ${targetType === 'role' ? 'bg-clay-100 text-clay-700' : 'bg-stone-100 text-stone-500'}`}>
                            <Users size={16} />
                        </div>
                        <div>
                            <span className="block text-xs font-bold text-stone-900">User Role Group</span>
                            <span className="block text-[9px] text-stone-500 mt-0.5 leading-snug">Broadcast to all Artisans, Buyers, or Tier users.</span>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => setTargetType('email')}
                        className={`p-3.5 rounded-xl border text-left transition-all active:scale-95 flex items-start gap-3 ${
                            targetType === 'email' ? 'bg-white border-clay-500 shadow-sm ring-2 ring-clay-500/20' : 'bg-white border-stone-200 hover:border-stone-300'
                        }`}
                    >
                        <div className={`p-2 rounded-lg shrink-0 ${targetType === 'email' ? 'bg-clay-100 text-clay-700' : 'bg-stone-100 text-stone-500'}`}>
                            <Mail size={16} />
                        </div>
                        <div>
                            <span className="block text-xs font-bold text-stone-900">Custom Email</span>
                            <span className="block text-[9px] text-stone-500 mt-0.5 leading-snug">Type any single external email address for testing.</span>
                        </div>
                    </button>
                </div>

                {/* Audience Specific Inputs */}
                {targetType === 'user' && (
                    <div className="relative">
                        <InputLabel value="Search User by Name, Email, or Shop Name" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1" />
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                            <TextInput
                                className="w-full pl-9 text-xs"
                                placeholder="Type to search users..."
                                value={selectedUser ? `${selectedUser.name} (${selectedUser.email})` : searchQuery}
                                onChange={(e) => {
                                    setSelectedUser(null);
                                    setSearchQuery(e.target.value);
                                }}
                            />
                        </div>

                        {userSearchResults.length > 0 && !selectedUser && (
                            <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                {userSearchResults.map((u) => (
                                    <div
                                        key={u.id}
                                        onClick={() => {
                                            setSelectedUser(u);
                                            setUserSearchResults([]);
                                        }}
                                        className="p-2.5 hover:bg-stone-50 cursor-pointer text-xs border-b border-stone-100 flex items-center justify-between"
                                    >
                                        <div>
                                            <span className="font-bold text-stone-900">{u.name}</span>
                                            <span className="text-stone-500 text-[10px] ml-2">({u.email})</span>
                                        </div>
                                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 bg-stone-100 text-stone-700 rounded">{u.role}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {targetType === 'role' && (
                    <div>
                        <InputLabel value="Select Role Group Segment" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1" />
                        <select
                            value={targetRole}
                            onChange={(e) => setTargetRole(e.target.value)}
                            className="block w-full rounded-xl border-stone-200 bg-white text-xs py-2 px-3 min-h-[44px] text-stone-800 font-semibold focus:ring-clay-500/20 focus:border-clay-500"
                        >
                            <option value="all_artisans">All Registered Artisans</option>
                            <option value="approved_artisans">All Approved Active Artisans</option>
                            <option value="all_buyers">All Customer / Buyer Accounts</option>
                            <option value="elite_sellers">Elite Tier Subscribers Only</option>
                            <option value="premium_sellers">Premium Tier Subscribers Only</option>
                        </select>
                    </div>
                )}

                {targetType === 'email' && (
                    <div>
                        <InputLabel value="Target Email Address" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1" />
                        <TextInput
                            type="email"
                            className="w-full text-xs"
                            placeholder="e.g. partner@example.com"
                            value={targetEmail}
                            onChange={(e) => setTargetEmail(e.target.value)}
                        />
                    </div>
                )}
            </div>

            {/* Compose Email Content */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-2">
                    <h4 className="text-xs font-bold text-stone-900">Compose Broadcast Content</h4>
                    
                    {/* Compact Searchable Template Combobox Popover */}
                    <div className="flex items-center gap-2 relative">
                        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider shrink-0">Load Saved Template:</span>
                        
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
                                className="flex items-center justify-between gap-2 text-xs rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800 font-semibold py-1.5 px-3 transition min-w-[220px] max-w-[280px]"
                            >
                                <span className="truncate">
                                    {loadedTemplateObj ? loadedTemplateObj.name : '-- Choose Template to Load --'}
                                </span>
                                <ChevronDown size={14} className={`text-stone-400 shrink-0 transition-transform ${isTemplateDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isTemplateDropdownOpen && (
                                <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-stone-200 rounded-xl shadow-xl z-30 p-2 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                                    <div className="relative">
                                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                                        <input
                                            type="text"
                                            placeholder="Search template or subject..."
                                            value={templateSearchQuery}
                                            onChange={(e) => setTemplateSearchQuery(e.target.value)}
                                            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border-stone-200 bg-stone-50 text-stone-800 focus:ring-clay-500/20 focus:border-clay-500"
                                            autoFocus
                                        />
                                    </div>

                                    <div className="max-h-52 overflow-y-auto space-y-2 pr-0.5 scrollbar-thin">
                                        {filteredCustom.length > 0 && (
                                            <div>
                                                <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-clay-700 px-2 py-1 bg-clay-50 rounded mb-1">
                                                    <Sparkles size={11} className="text-clay-600 shrink-0" />
                                                    <span>Custom Broadcast Templates</span>
                                                </span>
                                                {filteredCustom.map(t => (
                                                    <div
                                                        key={t.id}
                                                        onClick={() => {
                                                            handleSelectBroadcastTemplate(t.id);
                                                            setIsTemplateDropdownOpen(false);
                                                        }}
                                                        className={`p-2 hover:bg-clay-50 rounded-lg cursor-pointer transition text-xs border-b border-stone-100/60 last:border-none ${
                                                            loadedBroadcastTemplateId === String(t.id) ? 'bg-clay-50/80 font-bold text-clay-900' : ''
                                                        }`}
                                                    >
                                                        <span className="font-bold text-stone-900 block truncate">{t.name}</span>
                                                        <span className="text-[9px] text-stone-500 truncate block mt-0.5">{t.subject}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {filteredSystem.length > 0 && (
                                            <div>
                                                <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-stone-500 px-2 py-1 bg-stone-100 rounded mb-1">
                                                    <Zap size={11} className="text-stone-500 shrink-0" />
                                                    <span>System Default Templates</span>
                                                </span>
                                                {filteredSystem.map(t => (
                                                    <div
                                                        key={t.id}
                                                        onClick={() => {
                                                            handleSelectBroadcastTemplate(t.id);
                                                            setIsTemplateDropdownOpen(false);
                                                        }}
                                                        className={`p-2 hover:bg-stone-50 rounded-lg cursor-pointer transition text-xs border-b border-stone-100/60 last:border-none ${
                                                            loadedBroadcastTemplateId === String(t.id) ? 'bg-stone-100 font-bold text-stone-900' : ''
                                                        }`}
                                                    >
                                                        <span className="font-bold text-stone-900 block truncate">{t.name}</span>
                                                        <span className="text-[9px] text-stone-500 truncate block mt-0.5">{t.subject}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {filteredCustom.length === 0 && filteredSystem.length === 0 && (
                                            <div className="p-3 text-center text-xs text-stone-400 font-medium">
                                                No templates matching &quot;{templateSearchQuery}&quot;
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {loadedTemplateObj && (
                    <div className="bg-clay-50/70 border border-clay-200 rounded-xl p-3 flex items-center justify-between text-xs">
                        <div>
                            <span className="font-bold text-clay-900">Loaded Template: {loadedTemplateObj.name}</span>
                            <span className="block text-[10px] text-clay-700 truncate mt-0.5">Subject: {loadedTemplateObj.subject}</span>
                        </div>
                        <button
                            type="button"
                            onClick={handleClearBroadcastForm}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-600 hover:text-stone-900 bg-white px-2 py-1 rounded-lg border border-stone-200 shadow-2xs transition shrink-0"
                        >
                            <RotateCcw size={11} />
                            Clear Form
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <InputLabel value="Subject Line" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1" />
                        <TextInput
                            className="w-full text-xs"
                            value={broadcastSubject}
                            onChange={(e) => setBroadcastSubject(e.target.value)}
                            placeholder="Enter email subject..."
                        />
                    </div>
                    <div>
                        <InputLabel value="Banner Headline (Optional)" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1" />
                        <TextInput
                            className="w-full text-xs"
                            value={broadcastHeadline}
                            onChange={(e) => setBroadcastHeadline(e.target.value)}
                            placeholder="Enter header text..."
                        />
                    </div>
                </div>

                <div>
                    <InputLabel value="Message Body" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1" />
                    <textarea
                        rows={6}
                        className="w-full rounded-xl border-stone-200 bg-stone-50/30 text-xs p-3 font-mono text-stone-800 focus:ring-clay-500/20 focus:border-clay-500"
                        value={broadcastBody}
                        onChange={(e) => setBroadcastBody(e.target.value)}
                        placeholder="Type your broadcast message content..."
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <InputLabel value="Button Text (Optional)" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1" />
                        <TextInput
                            className="w-full text-xs"
                            value={broadcastButtonLabel}
                            onChange={(e) => setBroadcastButtonLabel(e.target.value)}
                        />
                    </div>
                    <div>
                        <InputLabel value="Button URL (Optional)" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1" />
                        <TextInput
                            className="w-full text-xs"
                            value={broadcastButtonUrl}
                            onChange={(e) => setBroadcastButtonUrl(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <PrimaryButton
                        type="button"
                        onClick={handleDispatchBroadcast}
                        disabled={isDispatching || !broadcastSubject || !broadcastBody}
                        className="px-6 py-2.5 text-xs font-bold gap-2 min-h-[42px]"
                    >
                        <Send size={14} className={isDispatching ? "animate-bounce" : ""} />
                        {isDispatching ? "Dispatching Email..." : "Dispatch Broadcast Email"}
                    </PrimaryButton>
                </div>

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
                                <span>Delivery Speed: <strong>{dispatchResult.latency}ms</strong></span>
                                <span>Mail Service: <strong className="uppercase">{dispatchResult.driver}</strong></span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
