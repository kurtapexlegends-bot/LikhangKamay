import React from 'react';
import { motion } from 'framer-motion';
import { router } from '@inertiajs/react';
import { ChevronDown, Briefcase, Store, Users, Shield, VenetianMask, Search } from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import CompactPagination from '@/Components/CompactPagination';
import { TableSkeleton } from '@/Components/Skeleton';
import {
    roleBadgeClasses,
    stateClasses,
    isExpandableAccount,
    formatStaffPreset,
    summarizeModulePermissions
} from '@/utils/userManagerHelpers';

function StaffMemberList({ staffMembers, emptyMessage }) {
    if (!staffMembers || !staffMembers.length) {
        return (
            <WorkspaceEmptyState
                compact
                icon={Users}
                title="No Connected Staff"
                description={emptyMessage}
            />
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
                                            <p className="truncate text-xs text-stone-505 font-medium">{staffMember.email}</p>
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

export default function UserTable({
    filteredAccounts,
    filters,
    expandedRows,
    toggleExpandedRow,
    handleRowKeyDown,
    setDrawerArtisan,
    handleImpersonate,
    unlinkedStaffGroup,
    users,
    search,
    deferredSearch,
}) {
    return (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            {/* Mobile Cards View */}
            <div className="space-y-3 p-3 md:hidden">
                {filteredAccounts.length === 0 && (
                    <WorkspaceEmptyState
                        compact
                        icon={Search}
                        title="No matching accounts"
                        description="Try another quick view or broaden the search query."
                    />
                )}

                {filteredAccounts.map((user) => {
                    const isExpandable = isExpandableAccount(user);
                    return (
                        <div key={user.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                            <div className="flex items-start gap-4">
                                <UserAvatar user={user} className="h-10 w-10 shrink-0 border border-stone-100" />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="truncate text-[13px] font-bold text-stone-900">{user.name}</p>
                                            <p className="truncate text-[11px] font-medium text-stone-400">{user.email}</p>
                                        </div>
                                        <div className="flex shrink-0 gap-2 items-center">
                                            {isExpandable && (
                                                <button
                                                    onClick={() => setDrawerArtisan(user)}
                                                    className="inline-flex h-11 px-3 items-center gap-1 rounded-lg border border-[#E8D9CB] bg-[#F2EAE1] text-[10px] font-bold uppercase tracking-wider text-[#7A5037] active:scale-95 transition-all"
                                                >
                                                    <Briefcase size={12} /> {user.staff_count}
                                                </button>
                                            )}
                                            {user.role !== 'super_admin' && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleImpersonate(user.id)}
                                                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-stone-900 text-white shadow-sm active:scale-95 transition-all"
                                                    title={`Impersonate ${user.name}`}
                                                >
                                                    <VenetianMask size={16} />
                                                </button>
                                            )}
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
                                            <span className="inline-flex items-center rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 text-[9px] font-bold text-stone-550 uppercase tracking-wider">
                                                {user.shop_name}
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-3 flex items-center justify-between border-t border-stone-50 pt-2.5 text-[10px] font-medium text-stone-400">
                                        <span>Joined {user.created_at}</span>
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
                                <td colSpan={6} className="px-6 py-16">
                                    <WorkspaceEmptyState
                                        compact
                                        icon={Search}
                                        title="No matching accounts"
                                        description="Try another search filter or broaden the query."
                                    />
                                </td>
                            </tr>
                        )}

                        {filteredAccounts.map((user) => {
                            const isExpandable = isExpandableAccount(user);
                            const isExpanded = !!expandedRows[String(user.id)];
                            return (
                                <React.Fragment key={user.id}>
                                    <motion.tr
                                         initial={{ opacity: 0, y: 4 }}
                                         animate={{ opacity: 1, y: 0 }}
                                         transition={{ duration: 0.2 }}
                                         className={`group transition-colors ${isExpandable ? 'cursor-pointer hover:bg-[#FDFBF9]' : 'hover:bg-stone-50/50'} ${isExpanded ? 'bg-[#FDFBF9]' : ''}`}
                                         role={isExpandable ? 'button' : undefined}
                                         tabIndex={isExpandable ? 0 : undefined}
                                         aria-expanded={isExpandable ? isExpanded : undefined}
                                         onClick={isExpandable ? () => toggleExpandedRow(user.id) : undefined}
                                         onKeyDown={isExpandable ? (event) => handleRowKeyDown(event, user.id) : undefined}
                                     >
                                         <td className="px-5 py-4">
                                             <div className="flex items-center gap-4">
                                                 {isExpandable ? (
                                                     <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-400 transition-all duration-300 group-hover:scale-105 ${isExpanded ? 'shadow-inner border-stone-300 text-stone-600 bg-stone-50' : 'group-hover:bg-stone-50 group-hover:border-stone-300'}`}>
                                                         <ChevronDown size={14} className={`transition-transform duration-300 group-hover:translate-y-[1px] ${isExpanded ? 'rotate-180 group-hover:translate-y-[-1px]' : ''}`} />
                                                     </span>
                                                 ) : <div className="w-6 shrink-0"></div>}

                                                 <UserAvatar user={user} className="h-8 w-8 border border-stone-200 transition-all" />
                                                 <div className="min-w-0">
                                                     <p className="text-xs font-semibold text-stone-900 truncate">{user.name}</p>
                                                     <p className="text-xs text-stone-505 truncate font-medium">{user.email}</p>
                                                 </div>
                                             </div>
                                         </td>

                                         <td className="px-5 py-4">
                                             {user.role === 'artisan' ? (
                                                 <div className="space-y-0.5">
                                                     <div className="flex flex-wrap items-center gap-1.5">
                                                         <p className="text-xs font-semibold text-stone-900">{user.shop_name || 'Unnamed Shop'}</p>
                                                         <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                                             user.staff_count > 0 
                                                                 ? 'bg-[#F2EAE1] border-[#E8D9CB] text-[#7A5037]' 
                                                                 : 'bg-stone-50 border-stone-200 text-stone-400'
                                                         }`}>
                                                             {user.staff_count === 1 ? '1 staff' : `${user.staff_count} staff`}
                                                         </span>
                                                         {filters.search && user.matched_staff_count > 0 && (
                                                             <span className="inline-flex items-center rounded bg-clay-50 border border-clay-100 px-1.5 py-0.5 text-[10px] font-medium text-clay-700 animate-pulse">
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
                                                 <span className="text-[11px] font-medium text-stone-400 tracking-wide">Platform administrator</span>
                                             ) : (
                                                 <span className="text-[11px] font-medium text-stone-400 tracking-wide">Standard platform user</span>
                                             )}
                                         </td>

                                         <td className="px-5 py-4 text-center">
                                             <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${roleBadgeClasses[user.role] || roleBadgeClasses.buyer}`}>
                                                 {user.role === 'artisan' && <Store size={10} />}
                                                 {user.role === 'super_admin' && <Shield size={10} />}
                                                 {user.role === 'buyer' && <Users size={10} />}
                                                 {user.role === 'artisan' && 'Artisan'}
                                                 {user.role === 'super_admin' && 'Admin'}
                                                 {user.role === 'buyer' && 'Buyer'}
                                             </span>
                                         </td>

                                         <td className="px-5 py-4 text-center">
                                             <div className="flex flex-col items-center gap-1">
                                                 <span className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${stateClasses[user.account_state_tone] || stateClasses.neutral}`}>
                                                     {user.account_state}
                                                 </span>
                                             </div>
                                         </td>

                                         <td className="px-5 py-4 text-xs font-semibold text-stone-500 whitespace-nowrap">
                                             {user.created_at}
                                         </td>
                                         
                                         <td className="px-5 py-4 text-right whitespace-nowrap">
                                             {user.role !== 'super_admin' && (
                                                 <button
                                                     type="button"
                                                     onClick={(e) => { e.stopPropagation(); handleImpersonate(user.id); }}
                                                     className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-stone-900 border border-stone-850 px-3 py-2 text-[10px] font-bold text-white shadow-sm transition hover:bg-black hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-stone-900/20 min-h-[40px]"
                                                     title={`Impersonate ${user.name}`}
                                                 >
                                                     <VenetianMask size={12} /> Login As
                                                 </button>
                                             )}
                                         </td>
                                     </motion.tr>

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
                                    <h3 className="text-sm font-bold text-stone-900">Unlinked Staff</h3>
                                    <p className="text-xs font-semibold text-stone-500">Staff accounts with no associated artisan shop owner</p>
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
    );
}
