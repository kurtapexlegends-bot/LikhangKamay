import React from 'react';

export const FALLBACK_ROLE_PRESETS = [
    { key: 'hr', label: 'People & Payroll', description: 'Employee records, payroll prep, and workspace access coordination.', modules: ['hr'] },
    { key: 'accounting', label: 'Finance Review', description: 'Business funds, payroll approval, and finance visibility.', modules: ['accounting'] },
    { key: 'procurement', label: 'Inventory & Restocking', description: 'Supply tracking, stock requests, and purchasing coordination.', modules: ['procurement', 'stock_requests'] },
    { key: 'customer_support', label: 'Customer Care', description: 'Orders, buyer messages, and customer review handling.', modules: ['orders', 'messages', 'reviews'] },
    { key: 'custom', label: 'Custom Capability Mix', description: 'Start blank and choose the exact capabilities manually.', modules: [] },
];

export const MODULE_PERMISSION_LEVELS = [
    {
        key: 'read_only',
        label: 'Read Only',
        description: 'Can open this capability and view its records.',
    },
    {
        key: 'can_edit',
        label: 'Can Edit',
        description: 'Can create, update, and act inside this capability.',
    },
];

export const FALLBACK_MODULES = [
    { key: 'overview', label: 'Overview', description: 'Seller dashboard overview.' },
    { key: 'products', label: 'Products', description: 'Product manager and stock actions.' },
    { key: 'analytics', label: 'Analytics', description: 'Sales and product performance reports.' },
    { key: '3d', label: '3D Manager', description: '3D asset uploads and management.' },
    { key: 'orders', label: 'Orders', description: 'Order processing and status updates.' },
    { key: 'messages', label: 'Messages', description: 'Buyer inbox and seller order conversations.' },
    { key: 'team_messages', label: 'Team Inbox', description: 'Internal seller workspace conversations.' },
    { key: 'reviews', label: 'Reviews', description: 'Customer review replies and moderation.' },
    { key: 'shop_settings', label: 'Shop Settings', description: 'Seller storefront profile settings.' },
    { key: 'hr', label: 'People & Payroll', description: 'Employee records, payroll prep, and workspace access management.' },
    { key: 'accounting', label: 'Finance Approvals', description: 'Finance review, fund visibility, and payroll approval.' },
    { key: 'procurement', label: 'Inventory', description: 'Inventory tracking, supply management, and purchasing workflows.' },
    { key: 'stock_requests', label: 'Restock Requests', description: 'Restock request tracking.' },
];

export const STAFF_ACCESS_EVENT_LABELS = {
    login_created: 'Login Created',
    login_updated: 'Access Updated',
    login_suspended: 'Access Suspended',
    login_restored: 'Access Restored',
    login_removed: 'Login Removed',
};

export const DEFAULT_EMPLOYEE_ROLE = 'Potter';
export const EMPLOYEE_ROLE_OPTIONS = ['Potter', 'Assistant', 'Packer', 'Logistics / Driver', 'Artist'];

export const pesoFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

export const precisePesoFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

export const formatPeso = (value) => pesoFormatter.format(Number(value || 0));
export const formatPrecisePeso = (value) => precisePesoFormatter.format(Number(value || 0));

export const formatShortDate = (value) => value
    ? new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(value))
    : '-';

export const formatShortDateSafe = formatShortDate;

export const formatAttendanceTime = (value) => value
    ? new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(value))
    : 'No clock-in yet';

export const formatAttendanceDateLabel = (value) => value
    ? new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(`${value}T12:00:00`))
    : '-';

export const formatAttendanceDateLabelSafe = formatAttendanceDateLabel;

export const formatWorkedHoursCount = (minutes) => {
    const hours = Number(minutes || 0) / 60;

    if (hours <= 0) {
        return '0';
    }

    const rounded = Math.round(hours * 10) / 10;

    return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1).replace(/\.0$/, '');
};

export const formatWorkedHoursLabel = (minutes) => {
    const totalMinutes = Number(minutes || 0);

    if (totalMinutes <= 0) {
        return '0h';
    }

    const hours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    if (hours === 0) {
        return `${remainingMinutes}m`;
    }

    if (remainingMinutes === 0) {
        return `${hours}h`;
    }

    return `${hours}h ${remainingMinutes}m`;
};

export const formatRelativeAuditTime = (value) => {
    if (!value) {
        return 'Just now';
    }

    const seconds = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 1000));

    if (seconds < 60) {
        return 'Just now';
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);
    if (days < 7) {
        return `${days}d ago`;
    }

    return formatShortDateSafe(value);
};

export const formatWorkedHoursSummary = (attendance) => {
    const days = Number(attendance?.days_worked || 0);
    const dayLabel = days === 1 ? 'day' : 'days';

    return `${formatWorkedHoursCount(attendance?.worked_minutes)} worked hours (${days} ${dayLabel})`;
};

export const buildAttendanceCalendarWeeks = (calendarDays = []) => {
    if (!calendarDays.length) {
        return [];
    }

    const leadingEmptyDays = Array.from(
        { length: Number(calendarDays[0]?.weekday_index || 0) },
        (_, index) => ({ key: `leading-${index}`, empty: true })
    );

    const cells = [
        ...leadingEmptyDays,
        ...calendarDays.map((day) => ({ ...day, key: day.date, empty: false })),
    ];

    while (cells.length % 7 !== 0) {
        cells.push({ key: `trailing-${cells.length}`, empty: true });
    }

    return Array.from({ length: Math.ceil(cells.length / 7) }, (_, index) =>
        cells.slice(index * 7, index * 7 + 7)
    );
};

export const normalizeModulePermissionLevel = (value) => {
    if (value === 'can_edit' || value === 'update_access' || value === 'full_access' || value === true) {
        return 'can_edit';
    }

    if (value === 'read_only') {
        return 'read_only';
    }

    return null;
};

export const summarizeModulePermissions = (modulePermissions = {}) => {
    const values = Object.values(modulePermissions)
        .map((value) => normalizeModulePermissionLevel(value))
        .filter(Boolean);

    const readOnlyCount = values.filter((value) => value === 'read_only').length;
    const canEditCount = values.filter((value) => value === 'can_edit').length;

    return {
        readOnlyCount,
        canEditCount,
        enabledCount: readOnlyCount + canEditCount,
    };
};

export const humanizePreset = (value) => {
    if (!value) return 'Custom';

    return String(value)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const getLoginAccessStatus = (loginAccount) => {
    if (!loginAccount) {
        return {
            label: 'No Login',
            className: 'border-stone-200 bg-stone-100 text-stone-600',
            dotClassName: 'bg-stone-400',
        };
    }

    if (loginAccount.plan_workspace_suspended) {
        return {
            label: 'Plan Suspended',
            className: 'border-amber-200 bg-amber-50 text-amber-700',
            dotClassName: 'bg-amber-500',
        };
    }

    if (loginAccount.workspace_access_enabled === false) {
        return {
            label: 'Suspended',
            className: 'border-red-200 bg-red-50 text-red-700',
            dotClassName: 'bg-red-500',
        };
    }

    if (loginAccount.is_verified) {
        if (loginAccount.must_change_password) {
            return {
                label: 'Password Reset',
                className: 'border-amber-200 bg-amber-50 text-amber-700',
                dotClassName: 'bg-amber-500',
            };
        }

        return {
            label: 'Active',
            className: 'border-[#E7D8C9] bg-[#FCF7F2] text-clay-700',
            dotClassName: 'bg-clay-500',
        };
    }

    return {
        label: 'Pending',
        className: 'border-stone-200 bg-stone-100 text-stone-700',
        dotClassName: 'bg-stone-400',
    };
};

export const getAttendanceStatus = (attendance) => {
    if (!attendance?.has_attendance_source) {
        return {
            label: 'Manual',
            className: 'border-stone-200 bg-stone-100 text-stone-600',
            dotClassName: 'bg-stone-400',
            note: 'No linked staff login',
        };
    }

    if (attendance?.open_session || attendance?.current_state === 'clocked_in') {
        return {
            label: 'Clocked In',
            className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
            dotClassName: 'bg-emerald-500 animate-pulse',
            note: 'Session active now',
        };
    }

    if (attendance?.current_state === 'paused') {
        return {
            label: 'Paused',
            className: 'border-amber-200 bg-amber-50 text-amber-700',
            dotClassName: 'bg-amber-500',
            note: 'Will resume on next login',
        };
    }

    if (attendance?.current_state === 'clocked_out') {
        return {
            label: 'Clocked Out',
            className: 'border-stone-200 bg-stone-100 text-stone-700',
            dotClassName: 'bg-stone-400',
            note: 'Last session closed',
        };
    }

    return {
        label: 'No Attendance',
        className: 'border-stone-200 bg-stone-100 text-stone-600',
        dotClassName: 'bg-stone-400',
        note: 'No sessions yet',
    };
};

export const getEmployeeDirectoryStatus = (employee, attendanceStatus) => {
    const normalizedStatus = String(employee?.status || '').trim().toLowerCase();

    if (normalizedStatus && normalizedStatus !== 'active') {
        if (normalizedStatus === 'pending') {
            return {
                label: 'Pending',
                className: 'border-amber-200 bg-amber-50 text-amber-700',
                dotClassName: 'bg-amber-500',
            };
        }

        if (normalizedStatus === 'inactive' || normalizedStatus === 'suspended') {
            return {
                label: employee.status,
                className: 'border-red-200 bg-red-50 text-red-700',
                dotClassName: 'bg-red-500',
            };
        }

        return {
            label: employee.status,
            className: 'border-stone-200 bg-stone-100 text-stone-700',
            dotClassName: 'bg-stone-400',
        };
    }

    if (employee?.attendance?.has_attendance_source) {
        return {
            label: attendanceStatus.label,
            className: attendanceStatus.className,
            dotClassName:
                attendanceStatus.label === 'Clocked In'
                    ? 'bg-emerald-500 animate-pulse'
                    : attendanceStatus.label === 'Paused'
                        ? 'bg-amber-50'
                        : 'bg-stone-400',
        };
    }

    return {
        label: 'Active',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        dotClassName: 'bg-emerald-500',
    };
};

export const calculateNetPay = (item, sellerSettings = {}) => {
    const workingDays = sellerSettings.payroll_working_days || 22;
    const dailyRate = item.salary / workingDays;
    const hourlyRate = dailyRate / 8;
    const otRate = sellerSettings.overtime_rate || 50; 
    
    const otPay = (Number(item.overtime_hours) || 0) * otRate;
    const absenceDeduction = (Number(item.absences_days) || 0) * dailyRate;
    const undertimeDeduction = (Number(item.undertime_hours) || 0) * hourlyRate;
    
    let net = item.salary + otPay - absenceDeduction - undertimeDeduction;
    return net > 0 ? net : 0;
};

export const modalFieldClass = 'w-full rounded-xl border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-700 placeholder-stone-400 shadow-none transition focus:border-clay-500 focus:ring-clay-500';
export const modalFieldWithIconClass = `${modalFieldClass} pr-11`;
export const modalSelectClass = 'w-full rounded-xl border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-700 shadow-none transition focus:border-clay-500 focus:ring-clay-500';
export const modalCloseButtonClass = 'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-400 transition hover:border-stone-300 hover:text-stone-700';

export const buildModuleSelection = (presetKey, rolePresets = FALLBACK_ROLE_PRESETS, availableModules = FALLBACK_MODULES) => {
    const preset = rolePresets.find((item) => item.key === presetKey) || rolePresets.find((item) => item.key === 'custom');
    const presetModules = new Set(preset?.modules || []);
    return availableModules.reduce((acc, module) => {
        acc[module.key] = presetModules.has(module.key) ? 'can_edit' : null;
        return acc;
    }, {});
};

export const getModuleSelectionFromLogin = (loginAccount, presetKey, rolePresets = FALLBACK_ROLE_PRESETS, availableModules = FALLBACK_MODULES) => {
    const defaultSelection = buildModuleSelection(presetKey, rolePresets, availableModules);
    return availableModules.reduce((acc, module) => {
        const explicitValue = loginAccount?.module_permissions?.[module.key];
        acc[module.key] = normalizeModulePermissionLevel(explicitValue) ?? defaultSelection[module.key] ?? null;
        return acc;
    }, {});
};

export const generateRandomEmployeeId = () => {
    const randomNum = Math.floor(100000 + Math.random() * 900000); // 6 digits
    return `EMP-${randomNum}`;
};

export const getHrAccessSummary = (canEditHrRecords, canProvisionStaffAccounts, canUpdateStaffAccounts) => {
    if (!canEditHrRecords) return { tone: 'border-stone-200 bg-stone-50 text-stone-600', label: 'View only access' };
    if (canProvisionStaffAccounts) return { tone: 'border-emerald-200 bg-emerald-50 text-emerald-700', label: 'Editable people access' };
    if (canUpdateStaffAccounts) return { tone: 'border-amber-200 bg-amber-50 text-amber-700', label: 'Editable people access' };
    return { tone: 'border-stone-200 bg-stone-50 text-stone-600', label: 'Records only' };
};
