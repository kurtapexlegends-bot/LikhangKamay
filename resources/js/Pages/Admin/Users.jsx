import React, { useEffect, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { Users, Store, Search, Shield, Briefcase, ChevronDown } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import UserAvatar from '@/Components/UserAvatar';

const roleTabs = ['all', 'artisan', 'buyer', 'super_admin'];

const roleBadgeClasses = {
    artisan: 'bg-orange-100 text-orange-800 border-orange-200',
    staff: 'bg-[#F5EEE6] text-[#7A5037] border-[#E7D8C9]',
    buyer: 'bg-blue-50 text-blue-700 border-blue-100',
    super_admin: 'bg-gray-900 text-white border-gray-900',
};

const stateClasses = {
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    danger: 'bg-red-100 text-red-800 border-red-200',
    neutral: 'bg-stone-100 text-stone-700 border-stone-200',
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
    if (!presetKey) {
        return 'Custom';
    }

    return staffPresetLabels[presetKey] || presetKey.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};

function StaffMemberList({ staffMembers, emptyMessage }) {
    if (!staffMembers.length) {
        return (
            <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-6 text-center text-xs font-medium text-stone-500">
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className="grid gap-3 xl:grid-cols-2">
            {staffMembers.map((staffMember) => (
                <div key={staffMember.id} className="rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <UserAvatar user={staffMember} className="h-10 w-10 border border-[#E7D8C9] shadow-sm" />
                            <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-gray-900">{staffMember.name}</p>
                                <p className="truncate text-xs text-gray-500">{staffMember.email}</p>
                            </div>
                        </div>

                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold shadow-sm ${
                            stateClasses[staffMember.account_state_tone] || stateClasses.neutral
                        }`}>
                            {staffMember.account_state}
                        </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-[#F5EEE6] px-2.5 py-1 text-[10px] font-bold text-[#7A5037]">
                            {formatStaffPreset(staffMember.staff_role_preset_key)}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-bold text-stone-600">
                            {staffMember.employee_linked ? (staffMember.employee_name || 'Employee linked') : 'No employee record'}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ${
                            staffMember.email_verified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                            {staffMember.email_verified ? 'Email verified' : 'Email pending'}
                        </span>
                    </div>

                    <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
                        {staffMember.requires_password_change
                            ? 'Password reset is still required on the next sign-in.'
                            : staffMember.workspace_access_enabled
                                ? 'Workspace access is active for this staff account.'
                                : 'Workspace access is currently suspended for this staff account.'}
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
            <div className="sticky top-20 z-30 mb-8 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
                <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
                    <form onSubmit={handleSearch} className="relative w-full flex-1 sm:w-auto">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search by account, shop, staff, or employee..."
                            className="w-full rounded-xl border-none bg-stone-50 py-3 pl-11 pr-4 font-medium text-gray-900 placeholder-gray-400 transition-all focus:ring-2 focus:ring-clay-500/20"
                        />
                    </form>

                    <div className="flex w-full items-center gap-1 overflow-x-auto rounded-xl bg-stone-100/50 p-1 sm:w-auto">
                        {roleTabs.map((role) => (
                            <button
                                key={role}
                                type="button"
                                onClick={() => handleRoleFilter(role)}
                                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold transition ${
                                    filters.role === role
                                        ? 'bg-white text-clay-700 shadow-sm ring-1 ring-black/5'
                                        : 'text-gray-500 hover:bg-stone-200/50 hover:text-gray-700'
                                }`}
                            >
                                {role === 'all' && 'All Users'}
                                {role === 'artisan' && <><Store size={14} /> Artisans</>}
                                {role === 'buyer' && <><Users size={14} /> Buyers</>}
                                {role === 'super_admin' && <><Shield size={14} /> Admins</>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="border-b border-gray-100 bg-[#FDFBF9] px-4 py-3 sm:px-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-bold text-gray-900">Primary accounts</p>
                            <p className="text-xs text-gray-500">
                                Staff accounts are grouped beneath their parent shops to keep the admin workspace cleaner.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {visibleNestedStaffCount > 0 && (
                                <span className="inline-flex items-center rounded-full bg-[#F5EEE6] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#7A5037]">
                                    {visibleNestedStaffCount} visible staff
                                </span>
                            )}
                            <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-600">
                                {users.total} total primary accounts
                            </span>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-stone-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Primary Identity</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Workspace / Staff</th>
                                <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Role</th>
                                <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Account State</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Join Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {users.data.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center">
                                        <p className="text-sm font-bold text-gray-900">No primary accounts found</p>
                                        <p className="mt-1 text-xs text-gray-500">
                                            Try adjusting the role filter or broadening the search query.
                                        </p>
                                    </td>
                                </tr>
                            )}

                            {users.data.map((user) => {
                                const isExpandable = isExpandableAccount(user);
                                const isExpanded = !!expandedRows[String(user.id)];

                                return (
                                    <React.Fragment key={user.id}>
                                        <tr
                                            className={`group transition ${
                                                isExpandable ? 'cursor-pointer hover:bg-[#F8F3EE]' : 'hover:bg-stone-50'
                                            }`}
                                            role={isExpandable ? 'button' : undefined}
                                            tabIndex={isExpandable ? 0 : undefined}
                                            aria-expanded={isExpandable ? isExpanded : undefined}
                                            onClick={isExpandable ? () => toggleExpandedRow(user.id) : undefined}
                                            onKeyDown={isExpandable ? (event) => handleRowKeyDown(event, user.id) : undefined}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {isExpandable ? (
                                                        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#E7D8C9] bg-[#F5EEE6] text-[#7A5037] transition ${
                                                            isExpanded ? 'shadow-sm' : ''
                                                        }`}>
                                                            <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                        </span>
                                                    ) : null}

                                                    <UserAvatar user={user} className="h-10 w-10 border border-clay-200 shadow-sm transition-all" />
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900">{user.name}</p>
                                                        <p className="text-xs text-gray-500">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                {user.role === 'artisan' ? (
                                                    <div className="space-y-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="text-sm font-medium text-gray-900">{user.shop_name || 'Unnamed Shop'}</p>
                                                            <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">
                                                                {user.staff_count === 1 ? '1 staff member' : `${user.staff_count} staff members`}
                                                            </span>
                                                            {filters.search && user.matched_staff_count > 0 && (
                                                                <span className="inline-flex items-center rounded-full bg-clay-50 px-2 py-0.5 text-[10px] font-bold text-clay-700">
                                                                    {user.matched_staff_count} matching
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                                                            <span>
                                                                {isExpandable
                                                                    ? (isExpanded ? 'Click the row to hide linked staff.' : 'Click the row to reveal linked staff.')
                                                                    : 'No staff accounts linked yet.'}
                                                            </span>

                                                            {user.shop_slug ? (
                                                                <Link
                                                                    href={route('shop.seller', user.shop_slug)}
                                                                    onClick={(event) => event.stopPropagation()}
                                                                    className="font-bold text-clay-600 hover:underline"
                                                                >
                                                                    View Shop
                                                                </Link>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                ) : user.role === 'super_admin' ? (
                                                    <span className="text-xs font-medium text-gray-400">Platform administration</span>
                                                ) : (
                                                    <span className="text-xs font-medium text-gray-400">No seller workspace</span>
                                                )}
                                            </td>

                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider shadow-sm ${
                                                    roleBadgeClasses[user.role] || roleBadgeClasses.buyer
                                                }`}>
                                                    {user.role === 'artisan' && <Store size={14} />}
                                                    {user.role === 'super_admin' && <Shield size={14} />}
                                                    {user.role === 'buyer' && <Users size={14} />}

                                                    {user.role === 'artisan' && 'Artisan'}
                                                    {user.role === 'super_admin' && 'Admin'}
                                                    {user.role === 'buyer' && 'Buyer'}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold shadow-sm ${
                                                        stateClasses[user.account_state_tone] || stateClasses.neutral
                                                    }`}>
                                                        {user.account_state}
                                                    </span>
                                                    {user.role === 'buyer' && (
                                                        <p className="text-[10px] text-gray-500">
                                                            {user.email_verified ? 'Email verified' : 'Email pending'}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 text-xs font-medium text-gray-500">
                                                {user.created_at}
                                            </td>
                                        </tr>

                                        {isExpandable && isExpanded && (
                                            <tr className="bg-[#FDFBF9]">
                                                <td colSpan={5} className="px-4 pb-4 pt-0 sm:px-6">
                                                    <div className="rounded-2xl border border-[#E8D9CB] bg-white/90 p-4 shadow-sm">
                                                        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                            <div>
                                                                <h3 className="text-sm font-bold text-gray-900">Shop Staff</h3>
                                                                <p className="text-xs text-gray-500">
                                                                    {filters.search && user.matched_staff_count > 0
                                                                        ? `${user.matched_staff_count} matching staff result${user.matched_staff_count === 1 ? '' : 's'} shown inside ${user.shop_name || user.name}.`
                                                                        : `Staff accounts linked to ${user.shop_name || user.name}.`}
                                                                </p>
                                                            </div>

                                                            <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-600">
                                                                {user.staff_members.length} visible
                                                            </span>
                                                        </div>

                                                        <StaffMemberList
                                                            staffMembers={user.staff_members || []}
                                                            emptyMessage="No staff accounts linked to this shop yet."
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
                    <div className="border-t border-gray-100 bg-[#FDFBF9] px-4 py-4 sm:px-6">
                        <div className="rounded-2xl border border-dashed border-[#D8B797] bg-white/80 p-4">
                            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-start gap-3">
                                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F5EEE6] text-[#7A5037]">
                                        <Briefcase size={16} />
                                    </span>
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900">{unlinkedStaffGroup.label}</h3>
                                        <p className="text-xs text-gray-500">{unlinkedStaffGroup.description}</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-600">
                                        {unlinkedStaffGroup.staff_count} total
                                    </span>
                                    {filters.search && unlinkedStaffGroup.matched_staff_count > 0 && (
                                        <span className="inline-flex items-center rounded-full bg-clay-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-clay-700">
                                            {unlinkedStaffGroup.matched_staff_count} matching
                                        </span>
                                    )}
                                </div>
                            </div>

                            <StaffMemberList
                                staffMembers={unlinkedStaffGroup.staff_members || []}
                                emptyMessage="No unlinked staff accounts matched the current search."
                            />
                        </div>
                    </div>
                )}

                {users.last_page > 1 && (
                    <div className="flex items-center justify-between border-t border-gray-50 px-6 py-4">
                        <p className="text-xs font-medium text-gray-500">
                            Displaying {users.from}-{users.to} of {users.total} total primary accounts
                        </p>
                        <div className="flex items-center gap-2">
                            {users.prev_page_url && (
                                <Link href={users.prev_page_url} className="rounded-lg bg-gray-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-600 transition hover:bg-clay-100 hover:text-clay-700">
                                    Previous
                                </Link>
                            )}
                            {users.next_page_url && (
                                <Link href={users.next_page_url} className="rounded-lg bg-clay-600 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm shadow-clay-200 transition hover:bg-clay-700">
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
