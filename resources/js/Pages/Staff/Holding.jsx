import React from 'react';
import { Head, Link } from '@inertiajs/react';
import WorkspaceLogoutLink from '@/Components/WorkspaceLogoutLink';
import { ShieldAlert, AlertTriangle, ShieldCheck, UserRoundCog, Store, Mail, Clock, LogOut } from 'lucide-react';

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
    const accountSuspended = !workspaceAccessEnabled && !planSuspended;

    let iconConfig = {
        icon: ShieldAlert,
        iconWrapClass: 'border-red-200 bg-red-50 text-red-600',
        badgeClass: 'border-red-200 bg-red-50 text-red-700',
        dotClass: 'bg-red-500',
        badgeText: 'Workspace Suspended',
        title: 'Your workspace account is suspended',
        description: 'The shop owner has temporarily paused this workspace account. Active shift attendance and seller modules are currently disabled.',
        infoPoints: [
            { icon: ShieldAlert, text: 'Portal login and clock-in access are on hold until reactivated by the shop owner.' },
            { icon: Mail, text: 'All your past timecards and payroll records remain safely archived in the system.' },
        ],
    };

    if (planSuspended) {
        iconConfig = {
            icon: AlertTriangle,
            iconWrapClass: 'border-amber-200 bg-amber-50 text-amber-600',
            badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
            dotClass: 'bg-amber-500',
            badgeText: 'Plan Downgrade: Access Paused',
            title: 'Workspace access is paused',
            description: 'The shop recently downgraded its subscription tier. Additional staff workspace access will resume when the shop owner upgrades their plan.',
            infoPoints: [
                { icon: Clock, text: 'Your account credentials and attendance history are fully preserved.' },
                { icon: Store, text: 'Contact your shop owner to renew or upgrade their seller subscription.' },
            ],
        };
    } else if (workspaceAccessEnabled) {
        iconConfig = {
            icon: ShieldCheck,
            iconWrapClass: 'border-clay-200 bg-clay-50 text-clay-700',
            badgeClass: 'border-clay-200 bg-clay-50 text-clay-700',
            dotClass: 'bg-clay-500',
            badgeText: 'Workspace Inactive',
            title: 'Workspace access needs routing',
            description: 'Your account is verified, but has not yet been assigned active seller workspace routes.',
            infoPoints: [
                { icon: Clock, text: 'Ask your shop administrator to assign module permissions to your account.' },
            ],
        };
    }

    const Icon = iconConfig.icon;

    return (
        <>
            <Head title={iconConfig.title} />

            <div className="min-h-screen bg-[#FDFBF9] flex items-center justify-center p-4 font-sans text-stone-800">
                <div className="w-full max-w-[480px] text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Top Icon Badge */}
                    <div className={`mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl border shadow-sm ${iconConfig.iconWrapClass}`}>
                        <Icon size={36} strokeWidth={2.2} />
                    </div>

                    {/* Main Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 text-center">
                        <h1 className="text-xl font-bold text-stone-900 tracking-tight">
                            {iconConfig.title}
                        </h1>
                        <p className="mt-2 text-[13px] font-medium leading-relaxed text-stone-500">
                            {iconConfig.description}
                        </p>

                        {/* Status Alert Badge */}
                        <div className={`mt-6 flex items-center justify-center gap-2 rounded-xl border py-2.5 px-4 text-xs font-bold uppercase tracking-wide ${iconConfig.badgeClass}`}>
                            <span className={`h-2 w-2 rounded-full ${iconConfig.dotClass}`} />
                            <span>{iconConfig.badgeText}</span>
                        </div>

                        {/* Account & Shop Summary Box */}
                        <div className="mt-6 rounded-xl border border-stone-100 bg-[#FCF7F2] p-4 text-left space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white shadow-2xs text-stone-500">
                                    <UserRoundCog size={18} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-bold text-stone-900">
                                        {staffAccount?.name || 'Staff Member'}
                                    </p>
                                    <p className="truncate text-xs text-stone-500">
                                        {staffAccount?.email}
                                    </p>
                                </div>
                                <span className="shrink-0 text-[11px] font-bold text-clay-700 bg-white px-2.5 py-1 rounded-full border border-[#E7D8C9] shadow-2xs">
                                    {formatRolePreset(staffAccount?.role_preset_key)}
                                </span>
                            </div>

                            <div className="pt-3 border-t border-stone-200/60 flex items-center justify-between text-xs text-stone-500">
                                <span className="font-medium">Shop / Artisan:</span>
                                <span className="font-bold text-stone-800 truncate ml-2">
                                    {sellerOwner?.name || 'Shop Linked'}
                                </span>
                            </div>
                        </div>

                        {/* Info Bullet Points */}
                        <div className="mt-6 space-y-3 text-left">
                            {iconConfig.infoPoints.map((point, idx) => {
                                const PointIcon = point.icon;
                                return (
                                    <div key={idx} className="flex items-start gap-3">
                                        <PointIcon size={16} className="mt-0.5 shrink-0 text-stone-400" />
                                        <p className="text-[13px] font-medium leading-relaxed text-stone-600">
                                            {point.text}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-8 flex flex-col gap-2 pt-6 border-t border-stone-100">
                            <Link
                                href={route('home')}
                                className="inline-flex w-full items-center justify-center rounded-xl bg-clay-700 px-4 py-2.5 text-[13px] font-bold text-white transition hover:bg-clay-800 min-h-[44px]"
                            >
                                Return to Homepage
                            </Link>
                            <WorkspaceLogoutLink
                                variant="button"
                                direct
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white border border-stone-200 px-4 py-2.5 text-[13px] font-bold text-stone-700 transition hover:bg-stone-50 min-h-[44px]"
                            >
                                <LogOut size={14} /> Sign Out
                            </WorkspaceLogoutLink>
                        </div>
                    </div>

                    {/* Footer Support Note */}
                    <p className="mt-6 text-xs font-medium text-stone-400">
                        Questions? Contact the shop owner or support at likhangkamaybusiness@gmail.com
                    </p>
                </div>
            </div>
        </>
    );
}
