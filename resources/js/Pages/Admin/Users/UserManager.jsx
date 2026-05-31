import React, { useDeferredValue, useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, router, usePage } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import BulkActionPill, { ActionTooltip } from '@/Components/Admin/Layout/BulkActionPill';
import Checkbox from '@/Components/Checkbox';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import WorkspaceLoadingState from '@/Components/WorkspaceLoadingState';
import CompactPagination from '@/Components/CompactPagination';
import Dropdown from '@/Components/Dropdown';
import ConfirmationModal from '@/Components/ConfirmationModal';
import UserAvatar from '@/Components/UserAvatar';
import { TableSkeleton } from '@/Components/Skeleton';
import { useToast } from '@/Components/ToastContext';
import AdminLayout from '@/Layouts/AdminLayout';
import {
    Users, Store, Search, Shield, Briefcase, ChevronDown, X, Filter, VenetianMask, 
    User as UserIcon, Loader2, Lock, Clock, Eye, CheckCircle, XCircle, Calendar, 
    FileText, Phone, MapPin, AlertTriangle, Download, LoaderCircle
} from 'lucide-react';

// =========================================================================
// CONSTANTS & HELPERS FOR USER DIRECTORY
// =========================================================================
const roleTabs = ['all', 'artisan', 'buyer', 'super_admin'];

const roleBadgeClasses = {
    artisan: 'bg-amber-50 text-amber-900 border-amber-200/60',
    staff: 'bg-[#F2EAE1] text-[#7A5037] border-[#E8D9CB]',
    buyer: 'bg-stone-50 text-stone-700 border-stone-200',
    super_admin: 'bg-stone-900 text-stone-100 border-stone-800',
};

const stateClasses = {
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200/60',
    warning: 'bg-amber-50 text-amber-800 border-amber-200/60',
    danger: 'bg-red-50 text-red-800 border-red-200/60',
    neutral: 'bg-stone-50 text-stone-700 border-stone-200/80',
};

const staffPresetLabels = {
    accounting: 'Accounting',
    customer_support: 'Customer Support',
    custom: 'Custom',
    hr: 'HR',
    procurement: 'Procurement',
};

const getAutoExpandedRows = (accounts) =>
    accounts.reduce((expandedMap, account) => {
        if ((account.matched_staff_count ?? 0) > 0) {
            expandedMap[String(account.id)] = true;
        }
        return expandedMap;
    }, {});

const isExpandableAccount = (account) => account.role === 'artisan' && (account.staff_count ?? 0) > 0;

const formatStaffPreset = (presetKey) => {
    if (!presetKey) return 'Custom';
    return staffPresetLabels[presetKey] || presetKey.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const normalizeModulePermissionLevel = (value) => {
    if (value === 'can_edit' || value === 'update_access' || value === 'full_access' || value === true) {
        return 'can_edit';
    }
    if (value === 'read_only') return 'read_only';
    return null;
};

const summarizeModulePermissions = (modulePermissions = {}) => {
    const values = Object.values(modulePermissions)
        .map((value) => normalizeModulePermissionLevel(value))
        .filter(Boolean);
    return {
        readOnlyCount: values.filter((value) => value === 'read_only').length,
        canEditCount: values.filter((value) => value === 'can_edit').length,
    };
};

function StaffMemberList({ staffMembers, emptyMessage }) {
    if (!staffMembers.length) {
        return (
            <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/50 px-5 py-8 text-center text-xs font-medium tracking-wide uppercase text-stone-400">
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className="grid gap-4 xl:grid-cols-2">
            {staffMembers.map((staffMember) => (
                <div key={staffMember.id} className="rounded-xl border border-stone-200 bg-white p-5 transition hover:border-stone-300 hover:shadow-sm">
                    {(() => {
                        const moduleSummary = summarizeModulePermissions(staffMember.module_permissions || {});
                        return (
                            <>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <UserAvatar user={staffMember} className="h-10 w-10 border border-[#E8D9CB]" />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-stone-900">{staffMember.name}</p>
                                            <p className="truncate text-xs text-stone-500 font-medium">{staffMember.email}</p>
                                        </div>
                                    </div>
                                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-widest ${stateClasses[staffMember.account_state_tone] || stateClasses.neutral}`}>
                                        {staffMember.account_state}
                                    </span>
                                </div>
                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center rounded-md border border-[#E8D9CB] bg-[#F2EAE1] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-[#7A5037]">
                                        {formatStaffPreset(staffMember.staff_role_preset_key)}
                                    </span>
                                    {(moduleSummary.canEditCount + moduleSummary.readOnlyCount) > 0 && (
                                        <span className="inline-flex items-center rounded-md border border-stone-200 bg-white px-2.5 py-1 text-[10px] font-medium tracking-wider text-stone-600">
                                            {moduleSummary.canEditCount} edit / {moduleSummary.readOnlyCount} view
                                        </span>
                                    )}
                                    <span className="inline-flex items-center rounded-md border border-stone-200 bg-stone-100 px-2.5 py-1 text-[10px] font-medium tracking-wider text-stone-600">
                                        {staffMember.employee_linked ? (staffMember.employee_name || 'Employee linked') : 'No employee record'}
                                    </span>
                                    <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[10px] font-medium tracking-wider ${staffMember.email_verified ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                        {staffMember.email_verified ? 'Email verified' : 'Email pending'}
                                    </span>
                                </div>
                                <p className="mt-3 text-xs font-medium leading-relaxed text-stone-500">
                                    {staffMember.requires_password_change
                                        ? 'Password reset required on next sign-in.'
                                        : staffMember.workspace_access_enabled
                                            ? 'Workspace access is active.'
                                            : 'Workspace access is suspended.'}
                                </p>
                            </>
                        );
                    })()}
                </div>
            ))}
        </div>
    );
}

// =========================================================================
// CONSTANTS & HELPERS FOR ARTISAN APPROVALS
// =========================================================================
const ARTISAN_DOCUMENTS = [
    { key: 'business_permit', label: 'Business Permit', icon: FileText },
    { key: 'dti_registration', label: 'DTI Registration', icon: FileText },
    { key: 'valid_id', label: 'Valid ID', icon: FileText },
    { key: 'tin_id', label: 'TIN ID', icon: FileText },
];

const buildViewedDocumentMap = (artisanRows) =>
    artisanRows.reduce((carry, artisan) => {
        carry[artisan.id] = artisan.viewed_document_keys ?? [];
        return carry;
    }, {});

// =========================================================================
// MAIN CONSOLIDATED COMPONENT
// =========================================================================
export default function UserManager({ users, filters, unlinkedStaffGroup = null, artisans }) {
    const { addToast } = useToast();
    const { pendingArtisanCount } = usePage().props;
    const [activeTab, setActiveTab] = useState(filters.tab || 'directory');

    // Sync tab state with URL parameters
    useEffect(() => {
        if (filters.tab && filters.tab !== activeTab) {
            setActiveTab(filters.tab);
        }
    }, [filters.tab]);

    const handleTabChange = (tabName) => {
        setActiveTab(tabName);
        router.get(route('admin.users.manager'), {
            tab: tabName,
            search: tabName === 'directory' ? (filters.search || '') : '',
            role: tabName === 'directory' ? (filters.role || 'all') : undefined,
        }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    // =========================================================================
    // STATE & LOGIC: USER DIRECTORY
    // =========================================================================
    const [search, setSearch] = useState(filters.search || '');
    const [quickView, setQuickView] = useState('all');
    const [impersonateTarget, setImpersonateTarget] = useState(null);
    const [drawerArtisan, setDrawerArtisan] = useState(null);
    const [expandedRows, setExpandedRows] = useState(() =>
        filters.search ? getAutoExpandedRows(users.data || []) : {}
    );
    const deferredSearch = useDeferredValue(search);

    useEffect(() => {
        setSearch(filters.search || '');
    }, [filters.search]);

    useEffect(() => {
        const visibleRowIds = new Set((users.data || []).map((account) => String(account.id)));
        setExpandedRows((currentRows) => {
            const nextRows = Object.fromEntries(
                Object.entries(currentRows).filter(([accountId]) => visibleRowIds.has(accountId))
            );
            if (filters.search) {
                return {
                    ...nextRows,
                    ...getAutoExpandedRows(users.data || []),
                };
            }
            return nextRows;
        });
    }, [filters.search, users.data]);

    const handleSearch = (event) => {
        event.preventDefault();
        router.get(route('admin.users.manager'), { search: search.trim(), role: filters.role, tab: 'directory' }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleRoleFilter = (role) => {
        router.get(route('admin.users.manager'), { search: search.trim(), role, tab: 'directory' }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const clearSearch = () => {
        setSearch('');
        router.get(route('admin.users.manager'), { search: '', role: filters.role, tab: 'directory' }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleImpersonate = (userId) => {
        setImpersonateTarget(userId);
    };

    const confirmImpersonation = () => {
        if (impersonateTarget) {
            window.dispatchEvent(new CustomEvent('start-impersonation-loading'));
            router.post(`/admin/users/${impersonateTarget}/impersonate`, {}, {
                onStart: () => setImpersonateTarget(null),
                onError: () => {
                    window.location.reload();
                },
            });
        }
    };

    const toggleExpandedRow = (accountId) => {
        setExpandedRows((currentRows) => ({
            ...currentRows,
            [String(accountId)]: !currentRows[String(accountId)],
        }));
    };

    const handleRowKeyDown = (event, accountId) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggleExpandedRow(accountId);
        }
    };

    const visibleNestedStaffCount = (users.data || []).reduce(
        (total, account) => total + (account.staff_members?.length || 0),
        0
    ) + (unlinkedStaffGroup?.staff_members?.length || 0);

    const filteredAccounts = useMemo(() => {
        const accountRows = users.data || [];
        if (quickView === 'all') return accountRows;

        return accountRows.filter((account) => {
            if (quickView === 'artisan_staff') {
                return account.role === 'artisan' && (account.staff_count ?? 0) > 0;
            }
            if (quickView === 'buyer_unverified') {
                return account.role === 'buyer' && !account.email_verified;
            }
            if (quickView === 'workspace_attention') {
                return account.role === 'artisan' &&
                    (account.staff_members || []).some((staffMember) => !staffMember.workspace_access_enabled || !staffMember.email_verified);
            }
            return true;
        });
    }, [quickView, users.data]);

    // =========================================================================
    // STATE & LOGIC: ARTISAN APPROVALS
    // =========================================================================
    const [localArtisans, setLocalArtisans] = useState(artisans);
    const [searchQuery, setSearchQuery] = useState('');
    const [reviewFilter, setReviewFilter] = useState('all');
    const [viewingArtisan, setViewingArtisan] = useState(null);
    const [viewingDoc, setViewingDoc] = useState(null);
    const [rejectingArtisan, setRejectingArtisan] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [processing, setProcessing] = useState(false);
    const [approvalError, setApprovalError] = useState('');
    const [viewedDocumentsByArtisan, setViewedDocumentsByArtisan] = useState(() => buildViewedDocumentMap(artisans));
    const [documentPreviewingKey, setDocumentPreviewingKey] = useState(null);
    const [selectedArtisans, setSelectedArtisans] = useState([]);

    const deferredSearchQuery = useDeferredValue(searchQuery);
    const pendingOperations = useRef({});

    useEffect(() => {
        setLocalArtisans(artisans);
    }, [artisans]);

    useEffect(() => {
        setViewedDocumentsByArtisan(buildViewedDocumentMap(artisans));
    }, [artisans]);

    const toggleArtisanSelection = (id) => {
        setSelectedArtisans(prev =>
            prev.includes(id) ? prev.filter(aId => aId !== id) : [...prev, id]
        );
    };

    const toggleAllCurrentPage = () => {
        const pageIds = paginatedArtisans.map(a => a.id);
        const allSelected = pageIds.every(id => selectedArtisans.includes(id));
        if (allSelected) {
            setSelectedArtisans(prev => prev.filter(id => !pageIds.includes(id)));
        } else {
            setSelectedArtisans(prev => [...new Set([...prev, ...pageIds])]);
        }
    };

    const clearSelection = () => setSelectedArtisans([]);

    const getArtisanDocuments = (artisan) =>
        ARTISAN_DOCUMENTS.map((document) => ({
            ...document,
            url: artisan?.[document.key] ?? null,
            viewed: (viewedDocumentsByArtisan[artisan?.id] ?? []).includes(document.key),
            flags: artisan?.document_flags?.[document.key] ?? [],
        }));

    const openReviewModal = (artisan) => {
        setViewingArtisan(artisan);
        setViewingDoc(null);
        setApprovalError('');
    };

    const openDocumentPreview = (doc) => {
        if (!viewingArtisan || !doc.url) return;

        setViewingDoc(doc);
        setApprovalError('');
        setDocumentPreviewingKey(doc.key);

        window.axios
            .post(route('admin.artisan.documents.viewed', viewingArtisan.id), {
                document: doc.key,
            })
            .then(({ data }) => {
                const viewedDocumentKeys = data?.viewed_document_keys || data?.viewed || [];
                setViewedDocumentsByArtisan((previous) => ({
                    ...previous,
                    [viewingArtisan.id]: viewedDocumentKeys,
                }));
            })
            .catch((error) => {
                const message = error?.response?.data?.message || 'Document preview opened, but review progress could not be saved.';
                setApprovalError(message);
                addToast(message, 'error');
            })
            .finally(() => {
                setDocumentPreviewingKey(null);
            });
    };

    const currentDocuments = useMemo(
        () => (viewingArtisan ? getArtisanDocuments(viewingArtisan) : []),
        [viewingArtisan, viewedDocumentsByArtisan]
    );

    const filteredArtisans = useMemo(() => {
        const query = deferredSearchQuery.trim().toLowerCase();
        return localArtisans.filter((artisan) => {
            if (reviewFilter === 'ready' && !artisan.documents_ready_for_approval) {
                // Determine if they actually viewed all submitted documents
                const viewed = viewedDocumentsByArtisan[artisan.id] ?? [];
                const submittedCount = ARTISAN_DOCUMENTS.filter(doc => !!artisan[doc.key]).length;
                if (submittedCount === 0 || viewed.length < submittedCount) return false;
            }
            if (reviewFilter === 'needs_preview') {
                const viewed = viewedDocumentsByArtisan[artisan.id] ?? [];
                const submittedCount = ARTISAN_DOCUMENTS.filter(doc => !!artisan[doc.key]).length;
                if (submittedCount > 0 && viewed.length >= submittedCount) return false;
            }
            if (!query) return true;

            return [
                artisan.shop_name,
                artisan.name,
                artisan.phone_number,
                artisan.address,
            ].some((value) => String(value || '').toLowerCase().includes(query));
        });
    }, [localArtisans, deferredSearchQuery, reviewFilter, viewedDocumentsByArtisan]);

    const ITEMS_PER_PAGE = 5;
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(filteredArtisans.length / ITEMS_PER_PAGE));
    const paginatedArtisans = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredArtisans.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredArtisans, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [deferredSearchQuery, reviewFilter]);

    const viewedDocumentsCount = viewingArtisan ? (viewedDocumentsByArtisan[viewingArtisan.id] ?? []).length : 0;
    const submittedDocumentsCount = viewingArtisan?.submitted_document_count ?? currentDocuments.filter((doc) => !!doc.url).length;
    const allSubmittedDocumentsViewed = submittedDocumentsCount > 0 && viewedDocumentsCount >= submittedDocumentsCount;

    const confirmApprove = () => {
        if (!viewingArtisan) return;

        const artisanToApprove = viewingArtisan;
        const originalArtisans = [...localArtisans];

        setLocalArtisans(prev => prev.filter(a => a.id !== artisanToApprove.id));
        setViewingArtisan(null);
        setViewingDoc(null);

        router.post(route('admin.artisan.approve', artisanToApprove.id), {}, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                addToast(`${artisanToApprove.shop_name} has been approved.`, 'success');
            },
            onError: (errors) => {
                setLocalArtisans(originalArtisans);
                addToast(errors.documents ?? 'Approval failed. Reverting changes...', 'error');
            }
        });
    };

    const handleRejectArtisan = () => {
        if (!rejectingArtisan || rejectReason.length < 10) return;

        setProcessing(true);
        router.post(route('admin.artisan.reject', rejectingArtisan.id), { reason: rejectReason }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setViewingDoc(null);
                setViewingArtisan(null);
                setRejectingArtisan(null);
                setRejectReason('');
                addToast('Artisan application has been rejected.', 'success');
            },
            onFinish: () => {
                setProcessing(false);
            },
            onError: (errors) => {
                addToast(errors.reason ?? 'Rejection failed. Please review the form and try again.', 'error');
            },
        });
    };

    const bulkApprove = () => {
        if (selectedArtisans.length === 0) return;

        const idsToApprove = [...selectedArtisans];
        const originalArtisans = [...localArtisans];
        const prevSelected = [...selectedArtisans];

        try {
            const timerId = setTimeout(() => {
                router.post(route('admin.artisan.bulk-approve'), { ids: idsToApprove }, {
                    onSuccess: () => addToast(`Batch of ${idsToApprove.length} approved.`, 'success'),
                    onError: () => {
                        setLocalArtisans(originalArtisans);
                        addToast('Bulk approval failed. Reverting...', 'error');
                    }
                });
                delete pendingOperations.current[timerId];
            }, 5000);

            pendingOperations.current[timerId] = {
                restore: () => {
                    clearTimeout(timerId);
                    setLocalArtisans(originalArtisans);
                    setSelectedArtisans(prevSelected);
                }
            };

            addToast(`Approving ${idsToApprove.length} applications...`, 'info', 5000, () => {
                if (pendingOperations.current[timerId]) {
                    pendingOperations.current[timerId].restore();
                    delete pendingOperations.current[timerId];
                }
            });

            setLocalArtisans(prev => prev.filter(a => !idsToApprove.includes(a.id)));
            setSelectedArtisans([]);
        } catch (e) {
            console.error("Undo System Error: Bulk operation aborted.", e);
            setLocalArtisans(originalArtisans);
        }
    };

    useEffect(() => {
        return () => {
            Object.values(pendingOperations.current).forEach(op => op.restore());
        };
    }, []);

    // =========================================================================
    // RENDERING
    // =========================================================================
    return (
        <>
            <div className="space-y-6">
                {/* Tab selector */}
                <div className="border-b border-stone-200 bg-white rounded-t-2xl shadow-sm px-4 pt-4 sm:px-6">
                    <div className="flex space-x-6 overflow-x-auto scrollbar-hide">
                        {[
                            { id: 'directory', label: 'User Directory', icon: Users, count: users.total || null },
                            { id: 'approvals', label: 'Artisan Approvals', icon: Store, count: pendingArtisanCount || localArtisans.length || null }
                        ].map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`flex items-center gap-2 border-b-2 pb-4 px-1 text-xs sm:text-sm font-bold transition-all whitespace-nowrap outline-none ${
                                        activeTab === tab.id
                                            ? 'border-clay-600 text-clay-700'
                                            : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-200'
                                    }`}
                                >
                                    <Icon size={16} />
                                    <span>{tab.label}</span>
                                    {tab.count !== null && (
                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                                            activeTab === tab.id ? 'bg-clay-600 text-white' : 'bg-stone-100 text-stone-600'
                                        }`}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                    >
                        {/* =========================================================================
                            TAB: DIRECTORY VIEW
                            ========================================================================= */}
                        {activeTab === 'directory' && (
                            <div className="space-y-6">
                                <div className="z-30 border-b border-stone-200 bg-white rounded-xl shadow-sm">
                                    <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6">
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                            {/* Role filter tab segment */}
                                            <div className="flex w-full sm:w-auto items-center overflow-x-auto bg-stone-100/80 p-1 rounded-xl border border-stone-200/60">
                                                {roleTabs.map((role) => (
                                                    <button
                                                        key={role}
                                                        type="button"
                                                        onClick={() => handleRoleFilter(role)}
                                                        className={`relative flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs font-medium transition-all rounded-lg ${
                                                            filters.role === role
                                                                ? 'bg-white text-stone-900 shadow-sm ring-1 ring-stone-900/5'
                                                                : 'text-stone-500 hover:text-stone-700 hover:bg-stone-200/50'
                                                        }`}
                                                    >
                                                        {role === 'all' && 'All'}
                                                        {role === 'artisan' && <><Store size={14} /> Artisans</>}
                                                        {role === 'buyer' && <><Users size={14} /> Buyers</>}
                                                        {role === 'super_admin' && <><Shield size={14} /> Admins</>}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Search input */}
                                            <form onSubmit={handleSearch} className="relative w-full sm:w-80 flex-shrink-0">
                                                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                                                <input
                                                    type="text"
                                                    value={search}
                                                    onChange={(event) => setSearch(event.target.value)}
                                                    placeholder="Search accounts or staff..."
                                                    className="w-full rounded-full border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-10 text-sm font-medium text-stone-900 placeholder-stone-400 transition-all focus:border-clay-300 focus:bg-white focus:ring-2 focus:ring-clay-500/20"
                                                />
                                                {search && (
                                                    <button
                                                        type="button"
                                                        onClick={clearSearch}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-stone-400 transition-colors hover:text-stone-700"
                                                        aria-label="Clear account search"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </form>
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                                    <div className="border-b border-stone-100 bg-[#FDFBF9] px-4 py-3 sm:px-6">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <p className="text-sm font-semibold text-stone-900">Platform Accounts</p>
                                                <p className="text-xs font-medium text-stone-500">
                                                    Staff accounts stay grouped under their parent shop rows.
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2">
                                                <Dropdown>
                                                    <Dropdown.Trigger>
                                                        <button
                                                            type="button"
                                                            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12px] font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 hover:border-stone-300"
                                                        >
                                                            <Filter size={14} className="text-stone-400" />
                                                            Filter: {quickView === 'all' ? 'All visible' : quickView === 'artisan_staff' ? 'Shops with staff' : quickView === 'buyer_unverified' ? 'Buyer email pending' : 'Workspace attention'}
                                                            <ChevronDown size={14} className="ml-1 text-stone-400" />
                                                        </button>
                                                    </Dropdown.Trigger>
                                                    <Dropdown.Content align="right" width="56">
                                                        <button onClick={() => setQuickView('all')} className={`block w-full px-4 py-2.5 text-left text-[13px] transition ${quickView === 'all' ? 'bg-clay-50 text-clay-700 font-medium' : 'text-stone-600 font-medium hover:bg-stone-50'}`}>
                                                            All visible
                                                        </button>
                                                        <button onClick={() => setQuickView('artisan_staff')} className={`block w-full px-4 py-2.5 text-left text-[13px] transition ${quickView === 'artisan_staff' ? 'bg-[#F2EAE1] text-[#7A5037] font-medium' : 'text-stone-600 font-medium hover:bg-stone-50'}`}>
                                                            Shops with staff
                                                        </button>
                                                        <button onClick={() => setQuickView('buyer_unverified')} className={`block w-full px-4 py-2.5 text-left text-[13px] transition ${quickView === 'buyer_unverified' ? 'bg-amber-50 text-amber-700 font-medium' : 'text-stone-600 font-medium hover:bg-stone-50'}`}>
                                                            Buyer email pending
                                                        </button>
                                                        <button onClick={() => setQuickView('workspace_attention')} className={`block w-full px-4 py-2.5 text-left text-[13px] transition ${quickView === 'workspace_attention' ? 'bg-red-50 text-red-700 font-medium' : 'text-stone-600 font-medium hover:bg-stone-50'}`}>
                                                            Workspace attention
                                                        </button>
                                                    </Dropdown.Content>
                                                </Dropdown>
                                                {visibleNestedStaffCount > 0 && (
                                                    <span className="inline-flex items-center rounded-md bg-[#F2EAE1] border border-[#E8D9CB] px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-[#7A5037]">
                                                        {visibleNestedStaffCount} visible staff
                                                    </span>
                                                )}
                                                <span className="inline-flex items-center rounded-md bg-stone-100 border border-stone-200 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-stone-600">
                                                    {users.total} total accounts
                                                </span>
                                                {deferredSearch.trim() !== String(filters.search || '').trim() && (
                                                    <span className="inline-flex items-center rounded-md bg-clay-50 border border-clay-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-clay-700">
                                                        Search pending submit
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mobile Cards View */}
                                    <div className="space-y-3 p-3 md:hidden">
                                        {filteredAccounts.length === 0 && (
                                            <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 px-4 py-10 text-center">
                                                <div className="flex flex-col items-center justify-center gap-3 text-stone-400">
                                                    <Search size={28} className="opacity-50 animate-bounce" />
                                                    <div>
                                                        <p className="text-sm font-semibold text-stone-900">No matching accounts</p>
                                                        <p className="text-xs text-stone-500 mt-0.5">Try another quick view or broaden the search query.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {filteredAccounts.map((user) => {
                                            const isExpandable = isExpandableAccount(user);
                                            return (
                                                <div key={user.id} className="rounded-xl border border-stone-200 bg-white p-3.5 shadow-sm">
                                                    <div className="flex items-start gap-3">
                                                        <UserAvatar user={user} className="h-9 w-9 shrink-0 border border-stone-100" />
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="min-w-0">
                                                                    <p className="truncate text-[13px] font-bold text-stone-900">{user.name}</p>
                                                                    <p className="truncate text-[11px] font-medium text-stone-400">{user.email}</p>
                                                                </div>
                                                                <div className="flex shrink-0 gap-1.5">
                                                                    {isExpandable && (
                                                                        <button
                                                                            onClick={() => setDrawerArtisan(user)}
                                                                            className="inline-flex h-7 px-2.5 items-center gap-1 rounded-lg border border-[#E8D9CB] bg-[#F2EAE1] text-[10px] font-bold uppercase tracking-wider text-[#7A5037]"
                                                                        >
                                                                            <Briefcase size={12} /> {user.staff_count}
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleImpersonate(user.id)}
                                                                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-stone-900 text-white shadow-sm"
                                                                    >
                                                                        <VenetianMask size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                                                                <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${roleBadgeClasses[user.role] || roleBadgeClasses.buyer}`}>
                                                                    {user.role === 'artisan' && <Store size={10} />}
                                                                    {user.role === 'super_admin' && <Shield size={10} />}
                                                                    {user.role === 'buyer' && <Users size={10} />}
                                                                    {user.role_label}
                                                                </span>
                                                                <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${stateClasses[user.account_state_tone] || stateClasses.neutral}`}>
                                                                    {user.account_state}
                                                                </span>
                                                                {user.role === 'artisan' && user.shop_name && (
                                                                    <span className="inline-flex items-center rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 text-[9px] font-bold text-stone-500 uppercase tracking-wider">
                                                                        {user.shop_name}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="mt-3 flex items-center justify-between border-t border-stone-50 pt-2.5 text-[10px] font-medium text-stone-400">
                                                                <span>Joined {user.created_at}</span>
                                                                {user.role === 'buyer' && (
                                                                    <span className={user.email_verified ? 'text-emerald-600' : 'text-amber-600'}>
                                                                        {user.email_verified ? 'Verified' : 'Pending'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Desktop Table View */}
                                    <div className="hidden overflow-x-auto md:block">
                                        <table className="w-full min-w-[960px]">
                                            <thead className="bg-stone-50 border-b border-stone-200">
                                                <tr>
                                                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-stone-500">Primary Identity</th>
                                                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-stone-500">Workspace / Setup</th>
                                                    <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-stone-500">Role</th>
                                                    <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-stone-500">Account State</th>
                                                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-stone-500">Join Date</th>
                                                    <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-stone-500">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-stone-100">
                                                {deferredSearch !== search.trim() ? (
                                                    <tr>
                                                        <td colSpan={6} className="px-0">
                                                            <TableSkeleton rows={8} />
                                                        </td>
                                                    </tr>
                                                ) : filteredAccounts.length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="px-6 py-16 text-center">
                                                            <div className="flex flex-col items-center justify-center text-stone-400 gap-3">
                                                                <Search size={28} className="opacity-50 animate-bounce" />
                                                                <div>
                                                                    <p className="text-sm font-semibold text-stone-900">No matching accounts</p>
                                                                    <p className="text-xs text-stone-500 mt-0.5">Try another quick view or broaden the search query.</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}

                                                {filteredAccounts.map((user) => {
                                                    const isExpandable = isExpandableAccount(user);
                                                    const isExpanded = !!expandedRows[String(user.id)];
                                                    return (
                                                        <React.Fragment key={user.id}>
                                                            <tr
                                                                className={`group transition-colors ${isExpandable ? 'cursor-pointer hover:bg-[#FDFBF9]' : 'hover:bg-stone-50/50'} ${isExpanded ? 'bg-[#FDFBF9]' : ''}`}
                                                                role={isExpandable ? 'button' : undefined}
                                                                tabIndex={isExpandable ? 0 : undefined}
                                                                aria-expanded={isExpandable ? isExpanded : undefined}
                                                                onClick={isExpandable ? () => toggleExpandedRow(user.id) : undefined}
                                                                onKeyDown={isExpandable ? (event) => handleRowKeyDown(event, user.id) : undefined}
                                                            >
                                                                <td className="px-5 py-2.5">
                                                                    <div className="flex items-center gap-3">
                                                                        {isExpandable ? (
                                                                            <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-400 transition-all duration-300 group-hover:scale-105 ${isExpanded ? 'shadow-inner border-stone-300 text-stone-600 bg-stone-50' : 'group-hover:bg-stone-50 group-hover:border-stone-300'}`}>
                                                                                <ChevronDown size={14} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                                                            </span>
                                                                        ) : <div className="w-6 shrink-0"></div>}

                                                                        <UserAvatar user={user} className="h-8 w-8 border border-stone-200 transition-all" />
                                                                        <div className="min-w-0">
                                                                            <p className="text-xs font-medium text-stone-900 truncate">{user.name}</p>
                                                                            <p className="text-xs text-stone-500 truncate font-medium">{user.email}</p>
                                                                        </div>
                                                                    </div>
                                                                </td>

                                                                <td className="px-5 py-2.5">
                                                                    {user.role === 'artisan' ? (
                                                                        <div className="space-y-0.5">
                                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                                <p className="text-xs font-medium text-stone-900">{user.shop_name || 'Unnamed Shop'}</p>
                                                                                <span className="inline-flex items-center rounded bg-stone-100 border border-stone-200 px-1.5 py-0 text-[10px] font-medium text-stone-600">
                                                                                    {user.staff_count === 1 ? '1 staff' : `${user.staff_count} staff`}
                                                                                </span>
                                                                                {filters.search && user.matched_staff_count > 0 && (
                                                                                    <span className="inline-flex items-center rounded bg-clay-50 border border-clay-100 px-1.5 py-0 text-[10px] font-medium text-clay-700">
                                                                                        {user.matched_staff_count} match
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400 font-medium">
                                                                                <span>
                                                                                    {isExpandable ? (isExpanded ? 'Hide staff list.' : 'Click to view staff.') : 'No staff accounts.'}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    ) : user.role === 'super_admin' ? (
                                                                        <span className="text-xs uppercase tracking-wider font-medium text-stone-400">Platform Admins</span>
                                                                    ) : (
                                                                        <span className="text-xs uppercase tracking-wider font-medium text-stone-400">Standard User</span>
                                                                    )}
                                                                </td>

                                                                <td className="px-5 py-2.5 text-center">
                                                                    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${roleBadgeClasses[user.role] || roleBadgeClasses.buyer}`}>
                                                                        {user.role === 'artisan' && <Store size={10} />}
                                                                        {user.role === 'super_admin' && <Shield size={10} />}
                                                                        {user.role === 'buyer' && <Users size={10} />}
                                                                        {user.role === 'artisan' && 'Artisan'}
                                                                        {user.role === 'super_admin' && 'Admin'}
                                                                        {user.role === 'buyer' && 'Buyer'}
                                                                    </span>
                                                                </td>

                                                                <td className="px-5 py-2.5 text-center">
                                                                    <div className="flex flex-col items-center gap-1">
                                                                        <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${stateClasses[user.account_state_tone] || stateClasses.neutral}`}>
                                                                            {user.account_state}
                                                                        </span>
                                                                        {user.role === 'buyer' && (
                                                                            <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">
                                                                                {user.email_verified ? 'Verified' : 'Unverified'}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </td>

                                                                <td className="px-5 py-2.5 text-xs font-medium text-stone-500 whitespace-nowrap">
                                                                    {user.created_at}
                                                                </td>
                                                                
                                                                <td className="px-5 py-2.5 text-right whitespace-nowrap">
                                                                    {user.role !== 'super_admin' && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => { e.stopPropagation(); handleImpersonate(user.id); }}
                                                                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-stone-900 border border-stone-800 px-3 py-1.5 text-[10px] font-bold text-white shadow-sm transition hover:bg-black hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-stone-900/20"
                                                                            title={`Impersonate ${user.name}`}
                                                                        >
                                                                            <VenetianMask size={12} /> Login As
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            </tr>

                                                            {isExpandable && isExpanded && (
                                                                <tr className="bg-[#F8F6F4] relative">
                                                                    <td colSpan={6} className="px-4 pb-4 pt-1 sm:px-6">
                                                                        <div className="absolute left-[36px] top-0 h-6 w-5 rounded-bl-xl border-b-2 border-l-2 border-[#E8D9CB] z-0 hidden sm:block"></div>
                                                                        <div className="relative z-10 mt-1 rounded-2xl border border-[#E8D9CB] bg-white p-5 shadow-sm sm:ml-[42px] animate-in fade-in slide-in-from-top-2 duration-300">
                                                                            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-4">
                                                                                <div>
                                                                                    <h3 className="text-sm font-semibold tracking-wide text-stone-900 flex items-center gap-2"><Briefcase size={16} className="text-[#7A5037]" /> Connected Staff</h3>
                                                                                    <p className="text-xs text-stone-500 font-medium mt-1">
                                                                                        {filters.search && user.matched_staff_count > 0
                                                                                            ? `${user.matched_staff_count} matching staff result${user.matched_staff_count === 1 ? '' : 's'} shown inside ${user.shop_name || user.name}.`
                                                                                            : `All staff managed by ${user.shop_name || user.name}.`}
                                                                                    </p>
                                                                                </div>
                                                                                <span className="inline-flex items-center rounded-md bg-stone-100 border border-stone-200 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-stone-600">
                                                                                    {user.staff_members.length} visible
                                                                                </span>
                                                                            </div>
                                                                            <StaffMemberList
                                                                                staffMembers={user.staff_members || []}
                                                                                emptyMessage="No staff accounts linked to this shop."
                                                                            />
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Unlinked Staff Section */}
                                    {unlinkedStaffGroup && unlinkedStaffGroup.staff_count > 0 && (
                                        <div className="border-t border-stone-200 bg-[#FDFBF9] px-4 py-4 sm:px-6">
                                            <div className="rounded-xl border border-dashed border-[#D8B797] bg-white p-4">
                                                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                    <div className="flex items-start gap-3">
                                                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E8D9CB] bg-[#F2EAE1] text-[#7A5037]">
                                                            <Briefcase size={16} />
                                                        </span>
                                                        <div>
                                                            <h3 className="text-sm font-medium text-stone-900">Unlinked Staff</h3>
                                                            <p className="text-xs font-medium text-stone-500">Staff accounts with no associated artisan shop owner</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="inline-flex items-center rounded-md bg-stone-100 border border-stone-200 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-stone-600">
                                                            {unlinkedStaffGroup.staff_count} total
                                                        </span>
                                                    </div>
                                                </div>
                                                <StaffMemberList
                                                    staffMembers={unlinkedStaffGroup.staff_members || []}
                                                    emptyMessage="No unlinked staff accounts match the current query."
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {users.last_page > 1 && (
                                        <CompactPagination
                                            currentPage={users.current_page}
                                            totalPages={users.last_page}
                                            totalItems={users.total}
                                            itemsPerPage={users.per_page}
                                            onPageChange={(page) => router.get(route('admin.users.manager'), { search: search.trim(), role: filters.role, tab: 'directory', page }, { preserveState: true, preserveScroll: true, replace: true })}
                                            itemLabel="accounts"
                                        />
                                    )}
                                </div>
                            </div>
                        )}

                        {/* =========================================================================
                            TAB: APPROVALS VIEW
                            ========================================================================= */}
                        {activeTab === 'approvals' && (
                            <div className="space-y-6">
                                {localArtisans.length === 0 ? (
                                    <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center sm:p-16">
                                        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50">
                                            <CheckCircle size={32} className="text-emerald-500" />
                                        </div>
                                        <h3 className="text-xl font-bold tracking-tight text-stone-900 mb-2">Queue is Empty</h3>
                                        <p className="mx-auto max-w-sm text-[13px] text-stone-500">There are no pending artisan applications at the moment.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                                        <div className="flex flex-col gap-3 border-b border-stone-100 bg-[#FDFBF9] px-4 py-3 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setReviewFilter('all')}
                                                    className={`whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
                                                        reviewFilter === 'all'
                                                            ? 'border-clay-200 bg-clay-50 text-clay-700'
                                                            : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-50'
                                                    }`}
                                                >
                                                    All queue
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setReviewFilter('ready')}
                                                    className={`whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
                                                        reviewFilter === 'ready'
                                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                            : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-50'
                                                    }`}
                                                >
                                                    Ready to approve
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setReviewFilter('needs_preview')}
                                                    className={`whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
                                                        reviewFilter === 'needs_preview'
                                                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                                                            : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-50'
                                                    }`}
                                                >
                                                    Needs preview
                                                </button>
                                            </div>
                                            <div className="relative w-full sm:w-72">
                                                <input
                                                    type="text"
                                                    value={searchQuery}
                                                    onChange={(event) => setSearchQuery(event.target.value)}
                                                    placeholder="Search shop, owner, phone, or location"
                                                    className="w-full rounded-full border border-stone-200 bg-white py-2 pl-3 pr-9 text-sm font-medium text-stone-900 placeholder-stone-400 transition-all focus:border-clay-300 focus:ring-2 focus:ring-clay-500/20"
                                                />
                                                {searchQuery && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setSearchQuery('')}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-stone-400 transition-colors hover:text-stone-600"
                                                        aria-label="Clear artisan search"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Header Row */}
                                        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-2.5 bg-stone-50 border-b border-stone-100/80 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                                            <div className="col-span-4">Artisan Shop</div>
                                            <div className="col-span-3">Contact & Location</div>
                                            <div className="col-span-2">Review Progress</div>
                                            <div className="col-span-2 text-center">Status</div>
                                            <div className="col-span-1 text-right">Action</div>
                                        </div>

                                        <div className="divide-y divide-stone-100/80">
                                            {searchQuery !== deferredSearchQuery ? (
                                                <TableSkeleton rows={ITEMS_PER_PAGE} />
                                            ) : filteredArtisans.length === 0 ? (
                                                <div className="px-6 py-10 text-center">
                                                    <WorkspaceEmptyState
                                                        compact
                                                        icon={FileText}
                                                        title="No matching applications"
                                                        description="Try another search or switch the queue filter."
                                                    />
                                                </div>
                                            ) : (
                                                <AnimatePresence initial={false}>
                                                    {paginatedArtisans.map((artisan) => {
                                                        const viewedCount = (viewedDocumentsByArtisan[artisan.id] ?? []).length;
                                                        const submittedCount = ARTISAN_DOCUMENTS.filter(doc => !!artisan[doc.key]).length;
                                                        const isReady = submittedCount > 0 && viewedCount >= submittedCount;
                                                        return (
                                                            <div
                                                                key={artisan.id}
                                                                className="grid grid-cols-1 gap-4 px-4 py-4 transition-all duration-200 hover:bg-stone-50/60 sm:px-6 md:grid-cols-12 md:items-center relative group"
                                                            >
                                                                {/* Hover Accent */}
                                                                <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-clay-500 scale-y-0 group-hover:scale-y-100 transition-transform origin-center" />

                                                                <div className="col-span-4 flex items-center gap-4">
                                                                    <Checkbox
                                                                        checked={selectedArtisans.includes(artisan.id)}
                                                                        onChange={() => toggleArtisanSelection(artisan.id)}
                                                                    />
                                                                    <div className="flex items-center gap-4 min-w-0">
                                                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-clay-100 bg-clay-50/50 text-base font-bold text-clay-700 shadow-sm transition-transform group-hover:scale-105">
                                                                            {artisan.avatar ? (
                                                                                <img
                                                                                    src={artisan.avatar.startsWith('http') ? artisan.avatar : `/storage/${artisan.avatar}`}
                                                                                    alt={artisan.name}
                                                                                    className="w-full h-full object-cover"
                                                                                />
                                                                            ) : (
                                                                                artisan.name?.charAt(0).toUpperCase()
                                                                            )}
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <h3 className="font-bold text-[14px] text-stone-900 leading-tight truncate group-hover:text-clay-800 transition-colors">{artisan.shop_name}</h3>
                                                                            <p className="text-stone-500 text-[11px] font-medium truncate mt-0.5">{artisan.name}</p>
                                                                            <div className="flex items-center gap-1.5 mt-1">
                                                                                <Calendar size={10} className="text-stone-300" />
                                                                                <span className="text-[10px] text-stone-400 font-medium">Submitted {artisan.submitted_at}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="col-span-3">
                                                                    <div className="flex flex-col gap-1.5">
                                                                        <div className="flex items-center gap-2 group/contact">
                                                                            <div className="p-1 rounded-md bg-stone-100/50 text-stone-400 group-hover/contact:bg-clay-50 group-hover/contact:text-clay-500 transition-colors">
                                                                                <Phone size={10} />
                                                                            </div>
                                                                            <span className="text-[11px] font-semibold text-stone-600 truncate">{artisan.phone_number}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 group/contact">
                                                                            <div className="p-1 rounded-md bg-stone-100/50 text-stone-400 group-hover/contact:bg-clay-50 group-hover/contact:text-clay-500 transition-colors">
                                                                                <MapPin size={10} />
                                                                            </div>
                                                                            <span className="text-[11px] text-stone-500 truncate leading-relaxed">{artisan.address}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="col-span-2">
                                                                    <div className="rounded-2xl border border-stone-100 bg-stone-50/40 p-2.5 transition-colors group-hover:bg-white group-hover:border-stone-200">
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className="text-[9px] font-black uppercase tracking-[0.1em] text-stone-400">Progress</span>
                                                                            <span className={`text-[10px] font-black ${isReady ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                                                {viewedCount} <span className="text-stone-300">/</span> {submittedCount}
                                                                            </span>
                                                                        </div>
                                                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200/50 ring-1 ring-inset ring-black/5">
                                                                            <motion.div
                                                                                initial={{ width: 0 }}
                                                                                animate={{
                                                                                    width: `${submittedCount > 0 ? Math.min(100, (viewedCount / submittedCount) * 100) : 0}%`
                                                                                }}
                                                                                className={`h-full rounded-full transition-all duration-700 ${isReady ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-amber-400'}`}
                                                                            />
                                                                        </div>
                                                                        <p className={`mt-2 text-[9px] font-bold leading-tight ${isReady ? 'text-emerald-600' : 'text-stone-400'}`}>
                                                                            {isReady ? 'Ready for approval' : 'Preview all submitted files first'}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="col-span-2 flex flex-col items-start md:items-center gap-1">
                                                                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-600/80 bg-amber-50/50 border border-amber-200/30 px-2 py-0.5 rounded-full">
                                                                        <div className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" /> Pending
                                                                    </span>
                                                                    {Object.values(artisan.document_flags || {}).some(flags => flags.length > 0) && (
                                                                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 border border-rose-200/30 px-2 py-0.5 rounded-full mt-1">
                                                                            <AlertTriangle size={9} /> Flagged
                                                                        </span>
                                                                    )}
                                                                    {isReady && (
                                                                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50/50 border border-emerald-200/30 px-2 py-0.5 rounded-full">
                                                                            <CheckCircle size={9} /> Verified
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div className="col-span-1 flex justify-start md:justify-end">
                                                                    <button
                                                                        onClick={() => openReviewModal(artisan)}
                                                                        className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-[11px] font-bold text-stone-700 shadow-sm transition-all hover:border-clay-300 hover:bg-stone-50 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
                                                                    >
                                                                        <Eye size={13} className="text-clay-500" />
                                                                        <span>Review</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </AnimatePresence>
                                            )}
                                        </div>

                                        {totalPages > 1 && (
                                            <CompactPagination
                                                currentPage={currentPage}
                                                totalPages={totalPages}
                                                totalItems={filteredArtisans.length}
                                                itemsPerPage={ITEMS_PER_PAGE}
                                                onPageChange={setCurrentPage}
                                                itemLabel="applications"
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Impersonation Modal */}
            <ConfirmationModal
                isOpen={!!impersonateTarget}
                onClose={() => setImpersonateTarget(null)}
                onConfirm={confirmImpersonation}
                title="Support Impersonation"
                message="Are you sure you want to securely log in as this user? You will temporarily leave your Super Admin session to view the platform exactly as they do."
                icon={VenetianMask}
                iconBg="bg-stone-100 text-stone-600"
                confirmText="Login As User"
                confirmColor="bg-stone-900 hover:bg-black focus-visible:ring-stone-900/30"
            />

            {/* Staff Details Drawer */}
            <SlideOverDrawer
                show={!!drawerArtisan}
                onClose={() => setDrawerArtisan(null)}
                title={drawerArtisan ? `${drawerArtisan.shop_name || drawerArtisan.name}'s Staff` : 'Connected Staff'}
                widthClass="max-w-xl"
            >
                {drawerArtisan && (
                    <div className="space-y-6">
                        <div className="rounded-2xl bg-stone-50 p-4 border border-stone-100">
                            <div className="flex items-center gap-3">
                                <UserAvatar user={drawerArtisan} className="h-12 w-12 border border-white shadow-sm" />
                                <div>
                                    <h4 className="text-sm font-bold text-stone-900">{drawerArtisan.shop_name || 'Primary Account'}</h4>
                                    <p className="text-xs text-stone-500 font-medium">{drawerArtisan.name} • {drawerArtisan.email}</p>
                                </div>
                            </div>
                        </div>
                        <div className="min-h-[400px]">
                            <StaffMemberList
                                staffMembers={drawerArtisan.staff_members || []}
                                emptyMessage="No staff accounts linked to this shop."
                            />
                        </div>
                    </div>
                )}
            </SlideOverDrawer>

            {/* Artisan Onboarding Review Modal */}
            <Modal
                show={!!viewingArtisan}
                onClose={() => !viewingDoc && setViewingArtisan(null)}
                maxWidth="2xl"
                bottomSheet
            >
                {viewingArtisan && (
                    <div className="p-6 bg-white">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-clay-100 bg-clay-50 text-lg font-bold text-clay-700 shadow-sm">
                                    {viewingArtisan.shop_name?.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-lg font-bold text-stone-900 leading-tight truncate">{viewingArtisan.shop_name}</h3>
                                    <p className="text-xs font-medium text-stone-500 truncate">{viewingArtisan.name} • {viewingArtisan.email}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setViewingArtisan(null)}
                                className="p-2 text-stone-400 hover:text-stone-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="min-h-[400px]">
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-3">
                                    {currentDocuments.map(doc => (
                                        <div
                                            key={doc.key}
                                            onClick={() => documentPreviewingKey !== doc.key && openDocumentPreview(doc)}
                                            className={`group relative overflow-hidden rounded-xl border border-stone-200 p-3 transition ${doc.url ? 'cursor-pointer bg-white hover:border-clay-300 hover:shadow-sm' : 'bg-stone-50/50 opacity-60'} ${documentPreviewingKey === doc.key ? 'pointer-events-none' : ''}`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="p-1.5 bg-stone-50 rounded-lg group-hover:bg-clay-50 border border-stone-50 group-hover:border-clay-100 flex items-center gap-2">
                                                    <doc.icon size={14} className="text-stone-400 group-hover:text-clay-600" />
                                                    {doc.flags.length > 0 && (
                                                        <ActionTooltip text={`Automated check: ${doc.flags.join(', ').replace(/_/g, ' ')}`}>
                                                            <AlertTriangle size={12} className="text-amber-500 fill-amber-50" />
                                                        </ActionTooltip>
                                                    )}
                                                </div>
                                                {doc.viewed && <CheckCircle size={14} className="text-emerald-500" />}
                                            </div>
                                            <p className="font-bold text-[11px] text-stone-800 truncate mb-1">{doc.label}</p>
                                            
                                            {doc.url ? (
                                                <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-stone-100 bg-stone-50">
                                                    {doc.url.endsWith('.pdf') ? (
                                                        <div className="w-full h-full flex items-center justify-center bg-white"><FileText size={20} className="text-clay-200" /></div>
                                                    ) : (
                                                        <img src={doc.url} alt={doc.label} className="w-full h-full object-cover" />
                                                    )}
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 group-hover:bg-black/10 group-hover:opacity-100 transition">
                                                        <Eye size={16} className="text-white drop-shadow-md" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="aspect-video w-full rounded-lg border border-dashed border-stone-200 bg-stone-50 flex items-center justify-center"><X size={16} className="text-stone-300" /></div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="rounded-2xl bg-stone-50 border border-stone-100 p-4 space-y-3">
                                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-stone-400">Review Status</h4>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-[13px] font-bold">
                                            <span className="text-stone-600">Verification Progress</span>
                                            <span className={allSubmittedDocumentsViewed ? 'text-emerald-600' : 'text-amber-600'}>
                                                {viewedDocumentsCount} / {submittedDocumentsCount}
                                            </span>
                                        </div>
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200">
                                            <div
                                                className={`h-full transition-all duration-500 ${allSubmittedDocumentsViewed ? 'bg-emerald-500' : 'bg-amber-400'}`}
                                                style={{ width: `${submittedDocumentsCount > 0 ? (viewedDocumentsCount / submittedDocumentsCount) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setRejectingArtisan(viewingArtisan)}
                                        disabled={processing}
                                        className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white py-3 text-sm font-bold text-stone-600 hover:bg-red-50 hover:text-red-700 hover:border-red-100 transition"
                                    >
                                        <XCircle size={18} /> Reject
                                    </button>
                                    <button
                                        onClick={confirmApprove}
                                        disabled={processing || !allSubmittedDocumentsViewed}
                                        className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 disabled:bg-stone-200 disabled:shadow-none transition"
                                    >
                                        {processing ? <LoaderCircle size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                        {processing ? 'Processing...' : 'Approve Application'}
                                    </button>
                                </div>
                                {approvalError && <p className="text-center text-xs font-bold text-red-600 mt-2">{approvalError}</p>}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Document Preview Modal */}
            <Modal show={!!viewingDoc} onClose={() => setViewingDoc(null)} maxWidth="7xl">
                {viewingDoc && (
                    <div className="h-[85vh] flex flex-col bg-stone-900">
                        <div className="bg-black/50 backdrop-blur-md px-4 sm:px-6 py-4 flex items-center justify-between border-b border-white/10 shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-white">{viewingDoc.label}</h3>
                                <p className="text-xs text-stone-400 mt-0.5">Document Preview</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={viewingDoc.url}
                                    download
                                    className="p-2 hover:bg-white/10 rounded-full transition text-stone-400 hover:text-white"
                                    title="Download"
                                >
                                    <Download size={20} />
                                </a>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setViewingDoc(null); }}
                                    className="p-2 hover:bg-white/10 rounded-full transition text-stone-400 hover:text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden flex items-center justify-center bg-stone-900/50 p-4">
                            {viewingDoc.url.endsWith('.pdf') ? (
                                <iframe
                                    src={viewingDoc.url}
                                    className="h-full w-full rounded-lg bg-white"
                                    title={viewingDoc.label}
                                />
                            ) : (
                                <img
                                    src={viewingDoc.url}
                                    alt={viewingDoc.label}
                                    className="max-h-full max-w-full rounded-lg object-contain"
                                />
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Rejection Reasons Modal */}
            <Modal
                show={!!rejectingArtisan}
                onClose={() => setRejectingArtisan(null)}
                maxWidth="lg"
                bottomSheet
            >
                {rejectingArtisan && (
                    <div className="p-5 sm:p-6 bg-[#FDFBF9]">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-red-50 text-red-600 border border-red-100 rounded-xl flex items-center justify-center shrink-0">
                                    <AlertTriangle size={20} />
                                </div>
                                <div>
                                    <h3 className="text-[15px] font-bold text-stone-900 leading-tight">Reject Application</h3>
                                    <p className="text-stone-500 text-[11px]">Specify a reason for <span className="font-bold text-stone-700">{rejectingArtisan.shop_name}</span></p>
                                </div>
                            </div>
                            <button onClick={() => setRejectingArtisan(null)} className="rounded border border-stone-200 bg-white p-1 px-1.5 text-stone-400 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30">
                                <X size={14} />
                            </button>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-stone-600 ml-1">Rejection Reason</label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="E.g., The uploaded business permit belongs to a different entity. Please upload..."
                                className="h-28 w-full resize-none rounded-xl border border-stone-200 bg-white p-3 text-[13px] focus:border-red-400 focus:ring-2 focus:ring-red-500/20"
                            />
                            <div className="flex justify-between items-center px-1">
                                <p className="text-[10px] text-stone-400">This will be shared with the artisan.</p>
                                <span className={`text-[10px] font-bold ${rejectReason.length < 10 ? 'text-red-500' : 'text-emerald-600'}`}>
                                    {rejectReason.length} chars (min 10)
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-5">
                            {processing && (
                                <WorkspaceLoadingState
                                    label="Submitting rejection"
                                    detail="Sending reason to applicant"
                                    className="mr-auto"
                                />
                            )}
                            <button
                                onClick={() => setRejectingArtisan(null)}
                                disabled={processing}
                                className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-[12px] font-bold text-stone-600 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRejectArtisan}
                                disabled={processing || rejectReason.length < 10}
                                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-5 py-2 text-[12px] font-bold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {processing ? <LoaderCircle size={14} className="animate-spin" /> : <XCircle size={14} />}
                                {processing ? 'Rejecting...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Bulk Actions Bar */}
            <BulkActionPill selectedCount={selectedArtisans.length} onClear={clearSelection}>
                <ActionTooltip text="Approve Selected">
                    <button
                        onClick={bulkApprove}
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-600 active:scale-90"
                    >
                        <CheckCircle size={20} />
                    </button>
                </ActionTooltip>

                <ActionTooltip text="Reject Selected">
                    <button
                        onClick={() => {
                            if (selectedArtisans.length > 0) {
                                setRejectingArtisan(localArtisans.find(a => a.id === selectedArtisans[0]));
                            }
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500 text-white shadow-lg shadow-rose-500/20 transition-all hover:bg-rose-600 active:scale-90"
                    >
                        <XCircle size={20} />
                    </button>
                </ActionTooltip>
            </BulkActionPill>
        </>
    );
}

UserManager.layout = page => <AdminLayout title="User Directory & Approvals Center">{page}</AdminLayout>;
