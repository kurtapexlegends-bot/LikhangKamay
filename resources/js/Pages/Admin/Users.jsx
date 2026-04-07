import React, { useEffect, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { Users, Store, Search, Shield, Briefcase, ChevronDown } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import UserAvatar from '@/Components/UserAvatar';

const roleTabs = ['all', 'artisan', 'buyer', 'super_admin'];

const roleBadgeClasses = {
    artisan: 'bg-amber-50 text-amber-900 border-amber-200/60 shadow-[0_1px_2px_-1px_rgba(251,191,36,0.2)]',
    staff: 'bg-[#F2EAE1] text-[#7A5037] border-[#E8D9CB] shadow-[0_1px_2px_-1px_rgba(122,80,55,0.1)]',
    buyer: 'bg-stone-50 text-stone-700 border-stone-200 shadow-sm',
    super_admin: 'bg-stone-900 text-stone-100 border-stone-800 shadow-md',
};

const stateClasses = {
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200/60 shadow-sm',
    warning: 'bg-amber-50 text-amber-800 border-amber-200/60 shadow-sm',
    danger: 'bg-red-50 text-red-800 border-red-200/60 shadow-sm',
    neutral: 'bg-stone-50 text-stone-700 border-stone-200/80 shadow-sm',
};

const staffPresetLabels = {
    accounting: 'Accounting',
    customer_support: 'Customer Support',
    custom: 'Custom',
    hr: 'HR',
    procurement: 'Procurement',
};

const staffAccessLevelLabels = {
    read_only: 'Read Only',
    update_access: 'Update Access',
    full_access: 'Full Access',
};

const staffAccessLevelClasses = {
    read_only: 'bg-stone-100 text-stone-600 border-stone-200',
    update_access: 'bg-amber-50 text-amber-700 border-amber-100',
    full_access: 'bg-emerald-50 text-emerald-700 border-emerald-100',
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
    if (!presetKey) {
        return 'Custom';
    }

    return staffPresetLabels[presetKey] || presetKey.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};

function StaffMemberList({ staffMembers, emptyMessage }) {
    if (!staffMembers.length) {
        return (
            <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/50 px-4 py-8 text-center text-[11px] font-bold tracking-wide uppercase text-stone-400">
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className="grid gap-3 xl:grid-cols-2">
            {staffMembers.map((staffMember) => (
                <div key={staffMember.id} className="rounded-xl border border-stone-200 bg-white/80 backdrop-blur-sm px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition hover:bg-white hover:shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <UserAvatar user={staffMember} className="h-10 w-10 border border-[#E8D9CB] shadow-[0_1px_2px_rgba(122,80,55,0.1)]" />
                            <div className="min-w-0">
                                <p className="truncate text-sm font-extrabold text-stone-900">{staffMember.name}</p>
                                <p className="truncate text-[11px] text-stone-500 font-medium">{staffMember.email}</p>
                            </div>
                        </div>

                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest ${stateClasses[staffMember.account_state_tone] || stateClasses.neutral
                            }`}>
                            {staffMember.account_state}
                        </span>
                    </div>

                    <div className="mt-3.5 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-md bg-[#F2EAE1] border border-[#E8D9CB] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#7A5037]">
                            {formatStaffPreset(staffMember.staff_role_preset_key)}
                        </span>
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[9px] font-bold tracking-wider ${
                            staffAccessLevelClasses[staffMember.staff_access_permission_level || 'read_only']
                        }`}>
                            {staffAccessLevelLabels[staffMember.staff_access_permission_level || 'read_only']}
                        </span>
                        <span className="inline-flex items-center rounded-md bg-stone-100 border border-stone-200 px-2 py-0.5 text-[9px] font-bold tracking-wider text-stone-600">
                            {staffMember.employee_linked ? (staffMember.employee_name || 'Employee linked') : 'No employee record'}
                        </span>
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[9px] font-bold tracking-wider ${staffMember.email_verified ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                            }`}>
                            {staffMember.email_verified ? 'Email verified' : 'Email pending'}
                        </span>
                    </div>

                    <p className="mt-2.5 text-[10px] font-medium leading-relaxed text-stone-500">
                        {staffMember.requires_password_change
                            ? 'Password reset required on next sign-in.'
                            : staffMember.workspace_access_enabled
                                ? 'Workspace access is active.'
                                : 'Workspace access is suspended.'}
                    </p>
                </div>
            ))}
        </div>
    );
}

export default function AdminUsers({ users, filters, unlinkedStaffGroup = null }) {
    const [search, setSearch] = useState(filters.search || '');
    const [expandedRows, setExpandedRows] = useState(() => (
        filters.search ? getAutoExpandedRows(users.data || []) : {}
    ));

    useEffect(() => {
        setSearch(filters.search || '');
    }, [filters.search]);

    useEffect(() => {
        const visibleRowIds = new Set((users.data || []).map((account) => String(account.id)));

        setExpandedRows((currentRows) => {
            const nextRows = Object.fromEntries(
                Object.entries(currentRows).filter(([accountId]) => visibleRowIds.has(accountId)),
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

        router.get(route('admin.users'), { search, role: filters.role }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleRoleFilter = (role) => {
        router.get(route('admin.users'), { search, role }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
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
        0,
    ) + (unlinkedStaffGroup?.staff_members?.length || 0);

    return (
        <AdminLayout title="User Management">
            <div className="sm:sticky sm:top-20 z-30 mb-6 sm:mb-8 bg-white border-b border-stone-200">
                <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                        {/* Tab Segment for Role Filters */}
                        <div className="flex w-full sm:w-auto items-center gap-6 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                            {roleTabs.map((role) => (
                                <button
                                    key={role}
                                    type="button"
                                    onClick={() => handleRoleFilter(role)}
                                    className={`relative flex items-center gap-2 whitespace-nowrap py-3 text-sm font-bold transition-colors ${filters.role === role
                                            ? 'text-stone-900'
                                            : 'text-stone-500 hover:text-stone-700'
                                        }`}
                                >
                                    {role === 'all' && 'All Users'}
                                    {role === 'artisan' && <><Store size={14} /> Artisans</>}
                                    {role === 'buyer' && <><Users size={14} /> Buyers</>}
                                    {role === 'super_admin' && <><Shield size={14} /> Admins</>}

                                    {/* Active Tab Indicator (Underline) */}
                                    {filters.role === role && (
                                        <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full bg-clay-600 shadow-[0_-1px_4px_rgba(167,139,113,0.3)]"></div>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Elevated Search */}
                        <form onSubmit={handleSearch} className="relative w-full sm:w-80 flex-shrink-0">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search accounts or staff..."
                                className="w-full rounded-full border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-4 text-sm font-medium text-stone-900 placeholder-stone-400 transition-all focus:bg-white focus:ring-2 focus:ring-clay-500/20 focus:border-clay-300 shadow-inner"
                            />
                        </form>
                    </div>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                <div className="border-b border-stone-100 bg-[#FDFBF9] px-4 py-3.5 sm:px-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-extrabold text-stone-900">Platform Accounts</p>
                            <p className="text-[11px] font-medium text-stone-500">
                                Staff identity roles are managed directly within their parent shop rows.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {visibleNestedStaffCount > 0 && (
                                <span className="inline-flex items-center rounded-md bg-[#F2EAE1] border border-[#E8D9CB] px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-[#7A5037]">
                                    {visibleNestedStaffCount} visible staff
                                </span>
                            )}
                            <span className="inline-flex items-center rounded-md bg-stone-100 border border-stone-200 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-stone-600">
                                {users.total} total accounts
                            </span>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[960px]">
                        <thead className="bg-[#FAF9F7] border-b border-stone-200">
                            <tr>
                                <th className="px-5 py-2.5 text-left text-[9px] font-extrabold uppercase tracking-widest text-stone-500">Primary Identity</th>
                                <th className="px-5 py-2.5 text-left text-[9px] font-extrabold uppercase tracking-widest text-stone-500">Workspace / Setup</th>
                                <th className="px-5 py-2.5 text-center text-[9px] font-extrabold uppercase tracking-widest text-stone-500">Role</th>
                                <th className="px-5 py-2.5 text-center text-[9px] font-extrabold uppercase tracking-widest text-stone-500">Account State</th>
                                <th className="px-5 py-2.5 text-left text-[9px] font-extrabold uppercase tracking-widest text-stone-500">Join Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {users.data.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-stone-400 gap-2">
                                            <Search size={24} className="opacity-50" />
                                            <p className="text-sm font-bold text-stone-900">No matching accounts</p>
                                            <p className="text-xs text-stone-500">Try adjusting your filters or broadening the search query.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {users.data.map((user) => {
                                const isExpandable = isExpandableAccount(user);
                                const isExpanded = !!expandedRows[String(user.id)];

                                return (
                                    <React.Fragment key={user.id}>
                                        <tr
                                            className={`group transition-colors ${isExpandable ? 'cursor-pointer hover:bg-[#FDFBF9]' : 'hover:bg-stone-50/50'
                                                } ${isExpanded ? 'bg-[#FDFBF9]' : ''}`}
                                            role={isExpandable ? 'button' : undefined}
                                            tabIndex={isExpandable ? 0 : undefined}
                                            aria-expanded={isExpandable ? isExpanded : undefined}
                                            onClick={isExpandable ? () => toggleExpandedRow(user.id) : undefined}
                                            onKeyDown={isExpandable ? (event) => handleRowKeyDown(event, user.id) : undefined}
                                        >
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    {isExpandable ? (
                                                        <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-400 transition-all ${isExpanded ? 'shadow-inner border-stone-300 text-stone-600 bg-stone-50' : 'group-hover:bg-stone-50 group-hover:border-stone-300'
                                                            }`}>
                                                            <ChevronDown size={14} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                                        </span>
                                                    ) : <div className="w-6 shrink-0"></div>}

                                                    <UserAvatar user={user} className="h-8 w-8 border border-stone-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all" />
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-stone-900 truncate">{user.name}</p>
                                                        <p className="text-[10px] text-stone-500 truncate font-medium">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-3">
                                                {user.role === 'artisan' ? (
                                                    <div className="space-y-0.5">
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <p className="text-[11px] font-bold text-stone-900">{user.shop_name || 'Unnamed Shop'}</p>
                                                            <span className="inline-flex items-center rounded bg-stone-100 border border-stone-200 px-1.5 py-0 text-[9px] font-bold text-stone-600">
                                                                {user.staff_count === 1 ? '1 staff' : `${user.staff_count} staff`}
                                                            </span>
                                                            {filters.search && user.matched_staff_count > 0 && (
                                                                <span className="inline-flex items-center rounded bg-clay-50 border border-clay-100 px-1.5 py-0 text-[9px] font-bold text-clay-700">
                                                                    {user.matched_staff_count} match
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-3 text-[10px] text-stone-400 font-medium">
                                                            <span>
                                                                {isExpandable
                                                                    ? (isExpanded ? 'Hide staff list.' : 'Click to view staff.')
                                                                    : 'No staff accounts.'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : user.role === 'super_admin' ? (
                                                    <span className="text-[10px] uppercase tracking-wider font-bold text-stone-400">Platform Admins</span>
                                                ) : (
                                                    <span className="text-[10px] uppercase tracking-wider font-bold text-stone-400">Standard User</span>
                                                )}
                                            </td>

                                            <td className="px-5 py-3 text-center">
                                                <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest ${roleBadgeClasses[user.role] || roleBadgeClasses.buyer
                                                    }`}>
                                                    {user.role === 'artisan' && <Store size={10} />}
                                                    {user.role === 'super_admin' && <Shield size={10} />}
                                                    {user.role === 'buyer' && <Users size={10} />}

                                                    {user.role === 'artisan' && 'Artisan'}
                                                    {user.role === 'super_admin' && 'Admin'}
                                                    {user.role === 'buyer' && 'Buyer'}
                                                </span>
                                            </td>

                                            <td className="px-5 py-3 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${stateClasses[user.account_state_tone] || stateClasses.neutral
                                                        }`}>
                                                        {user.account_state}
                                                    </span>
                                                    {user.role === 'buyer' && (
                                                        <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">
                                                            {user.email_verified ? 'Verified' : 'Unverified'}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-5 py-3 text-[11px] font-medium text-stone-500 whitespace-nowrap">
                                                {user.created_at}
                                            </td>
                                        </tr>

                                        {isExpandable && isExpanded && (
                                            <tr className="bg-[#F8F6F4] relative">
                                                <td colSpan={5} className="px-4 pb-4 pt-1 sm:px-6">
                                                    <div className="absolute left-[36px] top-0 bottom-4 w-px bg-[#E8D9CB] z-0 hidden sm:block"></div>

                                                    <div className="relative z-10 sm:ml-[42px] rounded-xl border border-[#E8D9CB] bg-[#FDFBF9] p-4 shadow-[0_1px_3px_rgba(122,80,55,0.05)] mt-1">
                                                        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-3">
                                                            <div>
                                                                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1.5"><Briefcase size={14} className="text-[#7A5037]" /> Connected Staff</h3>
                                                                <p className="text-[10px] text-stone-500 font-medium mt-0.5">
                                                                    {filters.search && user.matched_staff_count > 0
                                                                        ? `${user.matched_staff_count} matching staff result${user.matched_staff_count === 1 ? '' : 's'} shown inside ${user.shop_name || user.name}.`
                                                                        : `All staff managed by ${user.shop_name || user.name}.`}
                                                                </p>
                                                            </div>

                                                            <span className="inline-flex items-center rounded-md bg-stone-100 border border-stone-200 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-stone-600">
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

                {unlinkedStaffGroup && (
                    <div className="border-t border-stone-200 bg-[#FDFBF9] px-4 py-4 sm:px-6">
                        <div className="rounded-xl border border-dashed border-[#D8B797] bg-white p-4">
                            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-start gap-3">
                                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#F2EAE1] text-[#7A5037] border border-[#E8D9CB] shadow-sm">
                                        <Briefcase size={16} />
                                    </span>
                                    <div>
                                        <h3 className="text-sm font-bold text-stone-900">{unlinkedStaffGroup.label}</h3>
                                        <p className="text-[11px] font-medium text-stone-500">{unlinkedStaffGroup.description}</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center rounded-md bg-stone-100 border border-stone-200 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-stone-600">
                                        {unlinkedStaffGroup.staff_count} total
                                    </span>
                                    {filters.search && unlinkedStaffGroup.matched_staff_count > 0 && (
                                        <span className="inline-flex items-center rounded-md bg-clay-50 border border-clay-100 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-clay-700">
                                            {unlinkedStaffGroup.matched_staff_count} match
                                        </span>
                                    )}
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
                    <div className="flex items-center justify-between border-t border-stone-100 px-6 py-4 bg-[#FAF9F7]">
                        <p className="text-[11px] font-medium text-stone-500 tracking-wide">
                            Displaying {users.from}-{users.to} of <span className="font-bold text-stone-900">{users.total}</span> accounts
                        </p>
                        <div className="flex items-center gap-2">
                            {users.prev_page_url && (
                                <Link href={users.prev_page_url} className="rounded-lg bg-white border border-stone-200 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-stone-600 transition hover:bg-stone-50 hover:text-stone-900 shadow-sm">
                                    Previous
                                </Link>
                            )}
                            {users.next_page_url && (
                                <Link href={users.next_page_url} className="rounded-lg bg-clay-600 border border-clay-700 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-white shadow-[0_1px_3px_rgba(167,139,113,0.4)] transition hover:bg-clay-700">
                                    Next Page
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
