import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import TextInput from '@/Components/TextInput';
import { 
    Clock, 
    Search, 
    Download, 
    Filter, 
    ShieldCheck, 
    User, 
    Settings, 
    CreditCard, 
    Users, 
    AlertCircle,
    CheckCircle2,
    RefreshCw,
    Terminal,
    Globe
} from 'lucide-react';

export default function ActivityHistoryDrawer({ isOpen, onClose }) {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    useEffect(() => {
        if (isOpen) {
            fetchActivityData();
        }
    }, [isOpen]);

    const fetchActivityData = async () => {
        setLoading(true);
        try {
            const res = await axios.get(route('audit-log.data'));
            setEntries(res.data.entries || []);
        } catch (err) {
            console.error('Failed to load activity history:', err);
        } finally {
            setLoading(false);
        }
    };

    const categories = ['All', 'System', 'Auth', 'Settings', 'Finance', 'Staff'];

    const filteredEntries = entries.filter((entry) => {
        const matchesCategory = selectedCategory === 'All' || 
            (entry.category && entry.category.toLowerCase().includes(selectedCategory.toLowerCase())) ||
            (entry.module && entry.module.toLowerCase().includes(selectedCategory.toLowerCase()));
        
        const q = search.toLowerCase();
        const matchesSearch = !search || 
            (entry.title && entry.title.toLowerCase().includes(q)) ||
            (entry.description && entry.description.toLowerCase().includes(q)) ||
            (entry.actor && entry.actor.toLowerCase().includes(q));

        return matchesCategory && matchesSearch;
    });

    const getCategoryIcon = (category) => {
        switch ((category || '').toLowerCase()) {
            case 'auth':
            case 'security':
                return <ShieldCheck size={14} className="text-amber-600" />;
            case 'settings':
                return <Settings size={14} className="text-clay-600" />;
            case 'finance':
            case 'billing':
                return <CreditCard size={14} className="text-emerald-600" />;
            case 'staff':
            case 'hr':
                return <Users size={14} className="text-sky-600" />;
            default:
                return <Terminal size={14} className="text-stone-600" />;
        }
    };

    const handleExport = () => {
        window.location.href = route('audit-log.export', {
            category: selectedCategory !== 'All' ? selectedCategory : null,
            search: search || null
        });
    };

    return (
        <SlideOverDrawer
            show={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-clay-50 border border-clay-200/60 flex items-center justify-center">
                        <Clock size={16} className="text-clay-700" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Activity History</h2>
                        <p className="text-[11px] text-stone-400 font-medium">Personal & system operational audit logs</p>
                    </div>
                </div>
            }
            widthClass="max-w-lg"
            position="right"
        >
            <div className="space-y-4">
                {/* Search & Export Actions */}
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        <TextInput
                            type="text"
                            placeholder="Search activity history..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border-stone-200 rounded-xl focus:bg-white"
                        />
                    </div>
                    <button
                        onClick={handleExport}
                        title="Export CSV"
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200/80 rounded-xl transition-all active:scale-95 shrink-0"
                    >
                        <Download size={14} />
                        <span className="hidden sm:inline">Export</span>
                    </button>
                    <button
                        onClick={fetchActivityData}
                        title="Refresh"
                        className="p-2 text-stone-400 hover:text-stone-700 bg-stone-100 hover:bg-stone-200/80 rounded-xl transition-all active:scale-95 shrink-0"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shrink-0 active:scale-95 ${
                                selectedCategory === cat
                                    ? 'bg-stone-900 text-white shadow-xs'
                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200/60'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Timeline List */}
                {loading ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 text-stone-400">
                        <RefreshCw size={20} className="animate-spin text-clay-600" />
                        <span className="text-xs font-medium">Loading audit history...</span>
                    </div>
                ) : filteredEntries.length === 0 ? (
                    <div className="py-12 text-center border border-dashed border-stone-200 rounded-2xl p-6">
                        <AlertCircle size={28} className="mx-auto text-stone-300 mb-2" />
                        <p className="text-xs font-bold text-stone-700">No activity records found</p>
                        <p className="text-[11px] text-stone-400 mt-0.5">Try clearing filters or search terms.</p>
                    </div>
                ) : (
                    <div className="relative pl-4 space-y-6 before:absolute before:left-[19px] before:top-3 before:bottom-3 before:w-0.5 before:bg-stone-200/70">
                        {filteredEntries.map((item, idx) => (
                            <div key={item.id || idx} className="relative flex items-start gap-3.5 group">
                                {/* Timeline Bullet Icon */}
                                <div className="relative z-10 w-8 h-8 rounded-full bg-white border border-stone-200 shadow-xs flex items-center justify-center shrink-0 group-hover:border-clay-500 transition-colors">
                                    {getCategoryIcon(item.category || item.module)}
                                </div>

                                {/* Content Card */}
                                <div className="flex-1 bg-stone-50/70 hover:bg-stone-50 p-3.5 rounded-xl border border-stone-200/60 transition-all space-y-1.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <h4 className="text-xs font-bold text-stone-900 leading-snug">
                                            {item.title}
                                        </h4>
                                        <span className="text-[10px] font-medium text-stone-400 shrink-0">
                                            {item.occurred_at}
                                        </span>
                                    </div>

                                    {item.description && (
                                        <p className="text-[11px] text-stone-600 leading-relaxed font-normal">
                                            {item.description}
                                        </p>
                                    )}

                                    {/* Metadata Footer */}
                                    <div className="pt-2 border-t border-stone-200/40 flex items-center justify-between text-[9.5px] text-stone-400 font-medium">
                                        <span className="flex items-center gap-1">
                                            <User size={10} />
                                            {item.actor || item.actor_type || 'System'}
                                        </span>
                                        {item.ip_address && (
                                            <span className="flex items-center gap-1">
                                                <Globe size={10} />
                                                {item.ip_address}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </SlideOverDrawer>
    );
}
