import React, { useState, useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Modal from '@/Components/Modal';
import { 
    Mail, 
    Send, 
    Key, 
    User, 
    CheckCircle2, 
    AlertCircle, 
    Server, 
    FileText, 
    Eye,
    EyeOff,
    Plus,
    Edit3,
    Trash2,
    Sparkles,
    Users,
    Search,
    Monitor,
    Smartphone,
    RotateCcw,
    ChevronDown
} from 'lucide-react';
import FormSkeleton from './Partials/FormSkeleton';

export default function EmailStudioForm({ data, setData, errors, processing }) {
    const { auth } = usePage().props;
    const [subSection, setSubSection] = useState('templates'); // 'templates' | 'broadcast' | 'credentials'

    // Template Studio State
    const [templates, setTemplates] = useState([]);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
    const [selectedTemplateId, setSelectedTemplateId] = useState(null);
    const [templateForm, setTemplateForm] = useState({
        id: null,
        name: '',
        subject: '',
        headline: '',
        body: '',
        button_label: '',
        button_url: '',
        category: 'custom'
    });
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [templateSaveFeedback, setTemplateSaveFeedback] = useState(null); // { success: boolean, message: string }
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'mobile'

    // Broadcast State
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

    // Credentials State
    const [showApiKey, setShowApiKey] = useState(false);

    // Load templates on mount
    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async (keepSelectedId = null) => {
        setIsLoadingTemplates(true);
        try {
            const res = await window.axios.get(route('admin.email-templates.index'));
            const fetched = res.data.templates || [];
            setTemplates(fetched);

            if (fetched.length > 0) {
                const targetId = keepSelectedId ?? selectedTemplateId;
                const found = fetched.find(t => t.id === targetId);
                if (found) {
                    loadTemplateIntoForm(found);
                } else {
                    loadTemplateIntoForm(fetched[0]);
                }
            }
        } catch (err) {
            console.error('Failed to load templates', err);
        } finally {
            setIsLoadingTemplates(false);
        }
    };

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
                    message: res.data.message || `Template "${savedTemplate.name}" saved successfully!`
                });
                await fetchTemplates(savedTemplate.id);
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
                fetchTemplates();
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

    if (processing || isLoadingTemplates) {
        return <FormSkeleton />;
    }

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
        <div className="bg-white rounded-2xl border border-clay-100 p-6 space-y-6 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Header Sub-Navigation Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="text-clay-600" size={18} />
                    <div>
                        <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Email Studio & Audience Broadcast</h3>
                        <p className="text-[10px] text-stone-500 font-medium mt-0.5">Customize system templates, compose broadcast emails, and target specific user segments.</p>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl shrink-0">
                    <button
                        type="button"
                        onClick={() => setSubSection('templates')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                            subSection === 'templates' ? 'bg-white text-clay-700 shadow-sm' : 'text-stone-600 hover:text-stone-900'
                        }`}
                    >
                        <FileText size={13} />
                        Template Studio
                    </button>
                    <button
                        type="button"
                        onClick={() => setSubSection('broadcast')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                            subSection === 'broadcast' ? 'bg-white text-clay-700 shadow-sm' : 'text-stone-600 hover:text-stone-900'
                        }`}
                    >
                        <Send size={13} />
                        Audience Broadcast
                    </button>
                    <button
                        type="button"
                        onClick={() => setSubSection('credentials')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                            subSection === 'credentials' ? 'bg-white text-clay-700 shadow-sm' : 'text-stone-600 hover:text-stone-900'
                        }`}
                    >
                        <Server size={13} />
                        Mail Engine
                    </button>
                </div>
            </div>

            {/* --- SECTION 1: TEMPLATE STUDIO --- */}
            {subSection === 'templates' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Template List */}
                    <div className="space-y-3 lg:border-r border-stone-100 lg:pr-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-bold text-stone-900 uppercase tracking-wider">Templates Library ({templates.length})</h4>
                            <button
                                type="button"
                                onClick={handleCreateNewTemplate}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-clay-600 hover:text-clay-700 bg-clay-50 px-2 py-1 rounded-md transition"
                            >
                                <Plus size={12} />
                                New Template
                            </button>
                        </div>

                        <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                            {templates.map((tpl) => {
                                const isSelected = selectedTemplateId === tpl.id;
                                return (
                                    <div
                                        key={tpl.id}
                                        onClick={() => loadTemplateIntoForm(tpl)}
                                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
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
                    <div className="lg:col-span-2 space-y-4">
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
                            <h4 className="text-xs font-bold text-stone-900">
                                {templateForm.id ? `Editing Template: ${templateForm.name}` : 'Creating New Custom Template'}
                            </h4>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsPreviewOpen(true)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition"
                                >
                                    <Eye size={13} />
                                    Live Preview
                                </button>
                                {templateForm.category === 'custom' && templateForm.id && (
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteTemplate(templateForm.id)}
                                        className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition"
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
                                        className="w-full text-xs"
                                        value={templateForm.name}
                                        onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <InputLabel value="Email Subject Line" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1" />
                                    <TextInput
                                        className="w-full text-xs"
                                        value={templateForm.subject}
                                        onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <InputLabel value="Banner Headline (Optional)" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1" />
                                <TextInput
                                    className="w-full text-xs"
                                    placeholder="e.g. Welcome to LikhangKamay!"
                                    value={templateForm.headline}
                                    onChange={(e) => setTemplateForm({ ...templateForm, headline: e.target.value })}
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <InputLabel value="Email Body Content" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider" />
                                    <span className="text-[9px] text-stone-400">Click pill to insert placeholder</span>
                                </div>
                                
                                {/* Placeholder Pills */}
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {['{user_name}', '{shop_name}', '{order_number}', '{verification_code}', '{site_name}', '{action_url}'].map((tag) => (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => insertPlaceholder(tag)}
                                            className="text-[9px] font-mono font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 px-2 py-0.5 rounded transition"
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
                                        className="w-full text-xs"
                                        placeholder="e.g. View Order Details"
                                        value={templateForm.button_label}
                                        onChange={(e) => setTemplateForm({ ...templateForm, button_label: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <InputLabel value="Button Target URL (Optional)" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1" />
                                    <TextInput
                                        className="w-full text-xs"
                                        placeholder="e.g. {action_url} or https://likhangkamay.app/..."
                                        value={templateForm.button_url}
                                        onChange={(e) => setTemplateForm({ ...templateForm, button_url: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <PrimaryButton type="submit" disabled={isSavingTemplate} className="px-5 py-2 text-xs font-bold gap-2">
                                    <Edit3 size={13} className={isSavingTemplate ? "animate-spin" : ""} />
                                    {isSavingTemplate ? "Saving Template..." : "Save Template Changes"}
                                </PrimaryButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- SECTION 2: AUDIENCE BROADCAST & DIRECT DISPATCH --- */}
            {subSection === 'broadcast' && (
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
                                className={`p-3 rounded-xl border text-left transition-all ${
                                    targetType === 'user' ? 'bg-white border-clay-500 shadow-sm ring-2 ring-clay-500/20' : 'bg-white border-stone-200'
                                }`}
                            >
                                <span className="block text-xs font-bold text-stone-900">Specific User</span>
                                <span className="block text-[9px] text-stone-500 mt-0.5">Search and select a single registered account.</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setTargetType('role')}
                                className={`p-3 rounded-xl border text-left transition-all ${
                                    targetType === 'role' ? 'bg-white border-clay-500 shadow-sm ring-2 ring-clay-500/20' : 'bg-white border-stone-200'
                                }`}
                            >
                                <span className="block text-xs font-bold text-stone-900">User Role Group</span>
                                <span className="block text-[9px] text-stone-500 mt-0.5">Broadcast to all Artisans, Buyers, or Tier users.</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setTargetType('email')}
                                className={`p-3 rounded-xl border text-left transition-all ${
                                    targetType === 'email' ? 'bg-white border-clay-500 shadow-sm ring-2 ring-clay-500/20' : 'bg-white border-stone-200'
                                }`}
                            >
                                <span className="block text-xs font-bold text-stone-900">Custom Email Address</span>
                                <span className="block text-[9px] text-stone-500 mt-0.5">Type any single external email address for testing.</span>
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
                                                        <span className="block text-[9px] font-bold uppercase tracking-wider text-clay-700 px-2 py-1 bg-clay-50 rounded mb-1">
                                                            ✨ Custom Broadcast Templates
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
                                                        <span className="block text-[9px] font-bold uppercase tracking-wider text-stone-500 px-2 py-1 bg-stone-100 rounded mb-1">
                                                            ⚡ System Default Templates
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
                                                        No templates matching "{templateSearchQuery}"
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
                                        <span>Latency: <strong>{dispatchResult.latency}ms</strong></span>
                                        <span>Driver: <strong className="uppercase">{dispatchResult.driver}</strong></span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- SECTION 3: MAIL ENGINE CREDENTIALS --- */}
            {subSection === 'credentials' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <InputLabel value="Active Mail Driver" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1.5" />
                            <select
                                value={data.mail_driver || 'resend'}
                                onChange={(e) => setData('mail_driver', e.target.value)}
                                className="block w-full rounded-xl border-stone-200 bg-stone-50/30 text-xs py-2 px-3 min-h-[44px] text-stone-800 font-medium focus:ring-clay-500/20 focus:border-clay-500"
                            >
                                <option value="resend">Resend API (Production Recommended)</option>
                                <option value="smtp">SMTP Relay Server</option>
                                <option value="log">Local File Log (Development Only)</option>
                            </select>
                        </div>

                        <div>
                            <InputLabel value="Resend API Key" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1.5" />
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                                <TextInput
                                    type={showApiKey ? "text" : "password"}
                                    className="block w-full pl-9 pr-9 bg-stone-50/30 text-xs py-2 min-h-[44px]"
                                    placeholder="re_1234567890..."
                                    value={data.resend_api_key || ''}
                                    onChange={(e) => setData('resend_api_key', e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowApiKey(!showApiKey)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition"
                                >
                                    {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <InputLabel value="From Email Address" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1.5" />
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                                <TextInput
                                    type="email"
                                    className="block w-full pl-9 bg-stone-50/30 text-xs py-2 min-h-[44px]"
                                    value={data.mail_from_address || 'noreply@likhangkamay.app'}
                                    onChange={(e) => setData('mail_from_address', e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <InputLabel value="From Sender Name" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1.5" />
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                                <TextInput
                                    className="block w-full pl-9 bg-stone-50/30 text-xs py-2 min-h-[44px]"
                                    value={data.mail_from_name || 'LikhangKamay'}
                                    onChange={(e) => setData('mail_from_name', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- LIVE EMAIL PREVIEW MODAL --- */}
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
                            {/* Rendered Email Header */}
                            <div className="bg-[#F7F4F0] border-b border-[#E7E1D8] p-4 text-center">
                                <span className="font-serif text-lg font-bold text-[#2E2520]">LikhangKamay</span>
                            </div>

                            {/* Rendered Email Body */}
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

                            {/* Rendered Email Footer */}
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
