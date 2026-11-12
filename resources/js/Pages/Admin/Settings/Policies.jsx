/* global route */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useToast } from '@/Components/ToastContext';
import useFlashToast from '@/hooks/useFlashToast';
import ReturnCriteriaEditor from '@/Components/Admin/Settings/ReturnCriteriaEditor';
import PolicyVersionHistory from '@/Components/Admin/Settings/PolicyVersionHistory';
import {
    FileText,
    ShieldCheck,
    RotateCcw,
    Lock,
    Store,
    Eye,
    Edit3,
    Save,
    AlertCircle,
    SlidersHorizontal,
} from 'lucide-react';

const POLICY_TABS = [
    { id: 'return_refund_policy', label: 'Return & Refund Criteria', icon: RotateCcw },
    { id: 'terms_of_service', label: 'Terms of Service', icon: FileText },
    { id: 'privacy_policy', label: 'Privacy Policy', icon: Lock },
    { id: 'seller_agreement', label: 'Seller Agreement', icon: Store },
    { id: 'seller_privacy', label: 'Seller Privacy', icon: ShieldCheck },
];

const suggestNextVersion = (versions = []) => {
    let maxMajor = 1;
    let maxMinor = 0;
    versions.forEach((v) => {
        const match = String(v.version || '').match(/^(\d+)\.(\d+)/);
        if (match) {
            const maj = Number(match[1]);
            const min = Number(match[2]);
            if (maj > maxMajor || (maj === maxMajor && min >= maxMinor)) {
                maxMajor = maj;
                maxMinor = min + 1;
            }
        }
    });
    return versions.length === 0 ? '1.0' : `${maxMajor}.${maxMinor}`;
};

export default function Policies({ selectedType = 'return_refund_policy', policiesByType = {} }) {
    const { flash } = usePage().props;
    const { addToast } = useToast() || {};
    useFlashToast(flash, addToast);

    const [activeType, setActiveType] = useState(selectedType);
    const [returnSubTab, setReturnSubTab] = useState('criteria');
    const [showPreview, setShowPreview] = useState(false);

    const currentBundle = policiesByType[activeType] || { active: {}, versions: [] };
    const activePolicy = currentBundle.active || {};
    const versions = Array.isArray(currentBundle.versions) ? currentBundle.versions : [];

    const { data, setData, post, processing, errors, clearErrors, transform } = useForm({
        type: activeType,
        title: activePolicy.title || '',
        version: suggestNextVersion(versions),
        content_markdown: activePolicy.content_markdown || '',
        structured_criteria: activePolicy.structured_criteria || null,
    });

    const lastSyncKeyRef = useRef(`${selectedType}:${activePolicy?.id || 'none'}:${activePolicy?.version || 'none'}:${versions.length}`);
    const prevTypeRef = useRef(activeType);

    useEffect(() => {
        const bundle = policiesByType[activeType] || { active: {}, versions: [] };
        const act = bundle.active || {};
        const vers = Array.isArray(bundle.versions) ? bundle.versions : [];
        const nextSyncKey = `${activeType}:${act?.id || 'none'}:${act?.version || 'none'}:${vers.length}`;
        const typeChanged = prevTypeRef.current !== activeType;

        if (!typeChanged && lastSyncKeyRef.current === nextSyncKey) {
            return;
        }

        prevTypeRef.current = activeType;
        lastSyncKeyRef.current = nextSyncKey;

        if (typeChanged) {
            clearErrors();
        }
        setData({
            type: activeType,
            title: act.title || '',
            version: suggestNextVersion(vers),
            content_markdown: act.content_markdown || '',
            structured_criteria: act.structured_criteria || null,
        });
    }, [activeType, policiesByType, clearErrors, setData]);

    const handleSelectType = (typeId) => {
        setActiveType(typeId);
        router.get(route('admin.policies.index', { type: typeId }), {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only: ['selectedType'],
        });
    };

    const handleLoadVersionIntoEditor = (ver) => {
        clearErrors();
        setData({
            type: activeType,
            title: ver.title || '',
            version: suggestNextVersion(versions),
            content_markdown: ver.content_markdown || '',
            structured_criteria: ver.structured_criteria || null,
        });
    };

    const handlePublish = (e) => {
        e.preventDefault();
        transform((curr) => {
            if (curr.type !== 'return_refund_policy' || !curr.structured_criteria) {
                return curr;
            }
            const rawHours = Number(curr.structured_criteria.return_window_hours);
            const normalizedHours = Number.isFinite(rawHours) && rawHours >= 1
                ? Math.min(720, Math.round(rawHours))
                : 24;
            return {
                ...curr,
                structured_criteria: {
                    ...curr.structured_criteria,
                    return_window_hours: normalizedHours,
                },
            };
        });
        post(route('admin.policies.store'), {
            preserveScroll: true,
            onError: (errs) => {
                if (errs?.title || errs?.content_markdown) {
                    setReturnSubTab('document');
                } else if (isReturnPolicy && Object.keys(errs || {}).some((k) => k.startsWith('structured_criteria'))) {
                    setReturnSubTab('criteria');
                }
                const firstErr = Object.values(errs || {})[0];
                if (firstErr && typeof addToast === 'function') {
                    addToast(String(firstErr), 'error');
                }
            },
        });
    };

    const criteriaErrors = useMemo(() => {
        const formatCriteriaMessage = (key, msg) => {
            const text = String(msg || '').trim();
            if (!text.includes('structured_criteria.')) {
                return text;
            }
            if (key.includes('eligible_reasons')) {
                return 'Every eligible claim reason must have a label.';
            }
            if (key.includes('mandatory_photo_angles')) {
                return 'Every mandatory photo angle must have a label.';
            }
            if (key.includes('checklist_items')) {
                return 'Every eligibility checklist item must have a statement.';
            }
            if (key.includes('return_window_hours')) {
                return 'Return inspection window must be between 1 and 720 hours.';
            }
            if (key.includes('max_photos')) {
                return 'Proof photo ceiling must be between 1 and 5 photos.';
            }
            return text.replace(/structured_criteria\.[a-z0-9_.]+/gi, 'return criteria field');
        };

        const formatted = Object.entries(errors || {})
            .filter(([key]) => key.startsWith('structured_criteria'))
            .map(([key, msg]) => formatCriteriaMessage(key, msg))
            .filter(Boolean);

        return Array.from(new Set(formatted));
    }, [errors]);

    const previewSections = useMemo(() => {
        const lines = String(data.content_markdown || '').replace(/\r\n/g, '\n').split('\n');
        const sections = [];
        let current = null;
        lines.forEach((line) => {
            const match = line.match(/^##\s+(.+)$/);
            if (match) {
                if (current) sections.push(current);
                current = { title: match[1].trim(), body: [] };
            } else if (current) {
                current.body.push(line);
            } else if (line.trim()) {
                sections.push({ title: 'Overview', body: [line] });
            }
        });
        if (current) sections.push(current);
        return sections;
    }, [data.content_markdown]);

    const isReturnPolicy = activeType === 'return_refund_policy';
    const showDocumentEditor = !isReturnPolicy || returnSubTab === 'document';

    return (
        <>
            <Head title="Policies & Terms" />

            <form onSubmit={handlePublish} className="space-y-5 pb-16">
                {/* Policy Type Navigation Tabs */}
                <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl w-full sm:w-fit max-w-full overflow-x-auto no-scrollbar">
                    {POLICY_TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeType === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => handleSelectType(tab.id)}
                                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap min-h-[38px] shrink-0 cursor-pointer ${
                                    isActive
                                        ? 'bg-white text-stone-900 shadow-2xs ring-1 ring-stone-900/5'
                                        : 'text-stone-500 hover:text-stone-700 hover:bg-stone-200/50'
                                }`}
                            >
                                <Icon size={13} className={isActive ? 'text-clay-700' : 'text-stone-400'} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {criteriaErrors.length > 0 && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 space-y-1">
                        {criteriaErrors.map((msg, i) => (
                            <div key={i} className="flex items-start gap-2 font-semibold">
                                <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-600" />
                                <span>{msg}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    <div className="lg:col-span-9 space-y-4">
                        {isReturnPolicy && (
                            <div className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white p-1 shadow-2xs">
                                <button
                                    type="button"
                                    onClick={() => setReturnSubTab('criteria')}
                                    className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                                        returnSubTab === 'criteria'
                                            ? 'bg-clay-50 text-clay-800 ring-1 ring-clay-200'
                                            : 'text-stone-500 hover:text-stone-800'
                                    }`}
                                >
                                    <SlidersHorizontal size={13} />
                                    <span>Window & Criteria Rules</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setReturnSubTab('document')}
                                    className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                                        returnSubTab === 'document'
                                            ? 'bg-clay-50 text-clay-800 ring-1 ring-clay-200'
                                            : 'text-stone-500 hover:text-stone-800'
                                    }`}
                                >
                                    <FileText size={13} />
                                    <span>Policy Document</span>
                                </button>
                            </div>
                        )}

                        {isReturnPolicy && returnSubTab === 'criteria' && (
                            <ReturnCriteriaEditor
                                criteria={data.structured_criteria}
                                onChange={(nextCriteria) => setData('structured_criteria', nextCriteria)}
                                errors={errors}
                            />
                        )}

                        {showDocumentEditor && (
                            <section className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                                        Policy Title
                                    </label>
                                    <input
                                        type="text"
                                        value={data.title}
                                        onChange={(e) => setData('title', e.target.value)}
                                        className="w-full rounded-xl border-stone-300 text-sm font-semibold focus:border-clay-500 focus:ring-clay-500"
                                        required
                                    />
                                    {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="block text-xs font-bold text-stone-700">
                                            Policy Content (<span className="font-mono">## Heading</span> starts a section)
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setShowPreview(!showPreview)}
                                            className="inline-flex items-center gap-1 text-xs font-bold text-clay-700 hover:text-clay-800 cursor-pointer"
                                        >
                                            {showPreview ? <Edit3 size={13} /> : <Eye size={13} />}
                                            <span>{showPreview ? 'Edit Markdown' : 'Preview Sections'}</span>
                                        </button>
                                    </div>

                                    {showPreview ? (
                                        <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-4 max-h-[520px] overflow-y-auto">
                                            {previewSections.map((sec, idx) => (
                                                <div key={idx} className="space-y-1">
                                                    <h4 className="font-serif text-sm font-bold text-stone-900">{sec.title}</h4>
                                                    <p className="text-xs text-stone-600 whitespace-pre-line leading-relaxed">
                                                        {sec.body.join('\n').trim()}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <textarea
                                            rows={16}
                                            value={data.content_markdown}
                                            onChange={(e) => setData('content_markdown', e.target.value)}
                                            className="w-full rounded-xl border-stone-300 text-xs font-mono leading-relaxed focus:border-clay-500 focus:ring-clay-500"
                                            required
                                        />
                                    )}
                                    {errors.content_markdown && (
                                        <p className="text-red-500 text-xs mt-1">{errors.content_markdown}</p>
                                    )}
                                </div>
                            </section>
                        )}
                    </div>

                    <div className="lg:col-span-3 space-y-4 lg:sticky lg:top-20">
                        <section className="bg-white border border-stone-200/90 rounded-2xl shadow-2xs overflow-hidden">
                            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-stone-100 bg-stone-50/40">
                                <span className="text-xs font-bold text-stone-900">Publish Revision</span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-700">
                                    Live v{activePolicy.version || '1.0'}
                                </span>
                            </div>

                            <div className="p-4 space-y-3">
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                                        Next Version
                                    </label>
                                    <div className="relative">
                                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-stone-400">
                                            v
                                        </span>
                                        <input
                                            type="text"
                                            value={data.version}
                                            onChange={(e) => setData('version', e.target.value)}
                                            placeholder="1.1"
                                            className="w-full rounded-xl border-stone-200 bg-stone-50/50 pl-7 pr-3 py-2 font-mono text-xs font-bold text-stone-900 focus:bg-white focus:border-clay-500 focus:ring-clay-500"
                                            required
                                        />
                                    </div>
                                    {errors.version && (
                                        <p className="text-red-600 text-[11px] font-semibold mt-1">{errors.version}</p>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-clay-600 px-4 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-clay-700 transition disabled:opacity-50 cursor-pointer min-h-[40px]"
                                >
                                    <Save size={14} />
                                    <span>{processing ? 'Publishing...' : `Publish v${data.version || 'Next'}`}</span>
                                </button>
                            </div>
                        </section>

                        <PolicyVersionHistory
                            versions={versions}
                            onLoadIntoEditor={handleLoadVersionIntoEditor}
                        />
                    </div>
                </div>
            </form>
        </>
    );
}

Policies.layout = (page) => <AdminLayout title="Policies & Terms">{page}</AdminLayout>;
