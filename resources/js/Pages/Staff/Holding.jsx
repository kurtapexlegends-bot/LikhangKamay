import { Head, Link } from '@inertiajs/react';
import WorkspaceLogoutLink from '@/Components/WorkspaceLogoutLink';
import { Building2, LogOut, ShieldCheck, UserRoundCog } from 'lucide-react';

const formatRolePreset = (value) => {
    if (!value) {
        return 'Custom Staff Access';
    }

    return value
        .split('_')
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ');
};

export default function Holding({ staffAccount, sellerOwner }) {
    const workspaceAccessEnabled = staffAccount?.workspace_access_enabled !== false;
    const planSuspended = !!staffAccount?.plan_workspace_suspended;

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(196,143,103,0.14),_transparent_38%),linear-gradient(180deg,#fcfaf7_0%,#f4efe7_100%)] px-4 py-10 font-sans text-stone-800 sm:px-6">
            <Head title="Staff Workspace" />

            <div className="mx-auto max-w-3xl">
                <div className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-[0_22px_70px_-40px_rgba(120,79,46,0.55)]">
                    <div className="border-b border-stone-200 bg-[linear-gradient(135deg,#6f4e37_0%,#8f6647_100%)] px-6 py-8 text-white sm:px-8">
                        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                            <div className="max-w-xl">
                                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/16 text-white ring-1 ring-white/20">
                                    <ShieldCheck size={24} />
                                </div>
                                <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/70">
                                    {workspaceAccessEnabled ? 'Staff Workspace Status' : planSuspended ? 'Seller Plan Suspension' : 'Seller Access Suspended'}
                                </p>
                                <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
                                    {workspaceAccessEnabled ? 'Workspace access needs a route.' : planSuspended ? 'Workspace access is paused by the current seller plan.' : 'Workspace access is paused.'}
                                </h1>
                                <p className="mt-3 max-w-lg text-sm leading-6 text-stone-100/90">
                                    {workspaceAccessEnabled
                                        ? 'This page is now only used when a staff account signs in without an active seller workspace route. Once a seller context and workspace access are both available, the account should land in the role-specific staff hub instead.'
                                        : planSuspended
                                            ? 'This staff account still exists, but the seller recently downgraded plans and staff workspace access is paused until the shop upgrades again.'
                                            : 'This staff account still exists, but the shop owner has temporarily suspended seller workspace access. Contact the shop owner when access should be restored.'}
                                </p>
                            </div>

                            <WorkspaceLogoutLink
                                variant="button"
                                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/20"
                            >
                                <LogOut size={14} />
                                Log Out
                            </WorkspaceLogoutLink>
                        </div>
                    </div>

                    <div className="grid gap-4 px-6 py-6 sm:grid-cols-2 sm:px-8">
                        <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-5">
                            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-clay-100 text-clay-700">
                                <UserRoundCog size={20} />
                            </div>
                            <p className="text-xs font-bold uppercase tracking-[0.22em] text-stone-400">
                                Staff Account
                            </p>
                            <h2 className="mt-2 text-lg font-bold text-stone-900">{staffAccount.name}</h2>
                            <p className="mt-1 text-sm text-stone-500">{staffAccount.email}</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <div className="inline-flex rounded-full border border-clay-200 bg-clay-50 px-3 py-1 text-xs font-bold text-clay-700">
                                    {formatRolePreset(staffAccount.role_preset_key)}
                                </div>
                                {!workspaceAccessEnabled && (
                                    <div className="inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                                        {planSuspended ? 'Plan Suspended' : 'Access Suspended'}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-5">
                            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-200 text-stone-700">
                                <Building2 size={20} />
                            </div>
                            <p className="text-xs font-bold uppercase tracking-[0.22em] text-stone-400">
                                Seller Context
                            </p>
                            <h2 className="mt-2 text-lg font-bold text-stone-900">
                                {sellerOwner?.name || 'Seller owner not linked yet'}
                            </h2>
                            <p className="mt-1 text-sm text-stone-500">
                                {sellerOwner?.id
                                    ? `Effective seller ID: ${sellerOwner.id}`
                                    : 'This account needs a valid seller owner link before seller modules can be enabled later.'}
                            </p>
                        </div>
                    </div>

                    <div className="border-t border-stone-200 bg-[#f8f3ec] px-6 py-5 sm:px-8">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-stone-600">
                                {workspaceAccessEnabled
                                    ? 'Security setup is complete, but the workspace still needs a valid seller route before staff modules can open safely.'
                                    : planSuspended
                                        ? 'This account can still sign in, but seller workspace routes stay blocked until the shop upgrades to restore staff access.'
                                        : 'This account can sign in, but seller workspace routes stay blocked until the shop owner restores access.'}
                            </p>
                            <Link
                                href={route('home')}
                                className="inline-flex items-center justify-center rounded-full border border-stone-300 px-4 py-2 text-xs font-bold text-stone-700 transition hover:border-stone-400 hover:bg-white"
                            >
                                Return to Homepage
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
