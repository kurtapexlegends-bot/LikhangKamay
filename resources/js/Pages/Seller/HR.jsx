import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import SellerSidebar from '@/Components/SellerSidebar';
import Modal from '@/Components/Modal';
import ConfirmationModal from '@/Components/ConfirmationModal';
import Dropdown from '@/Components/Dropdown';
import NotificationDropdown from '@/Components/NotificationDropdown';
import WorkspaceLogoutLink from '@/Components/WorkspaceLogoutLink';
import { 
    Users, UserPlus, Trash2, ChevronDown, User, LogOut,
    Briefcase, Building2, Search, Menu, Banknote, Settings as SettingsIcon, X, Pencil, Eye, EyeOff, CalendarDays, Clock3,
} from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceAccountSummary from '@/Components/WorkspaceAccountSummary';

const FALLBACK_ROLE_PRESETS = [
    { key: 'hr', label: 'HR', description: 'HR records, payroll, and employee management.', modules: ['hr'] },
    { key: 'accounting', label: 'Accounting', description: 'Funds, payroll approval, and finance visibility.', modules: ['accounting'] },
    { key: 'procurement', label: 'Procurement', description: 'Inventory and stock request coordination.', modules: ['procurement', 'stock_requests'] },
    { key: 'customer_support', label: 'Customer Support', description: 'Orders and customer review handling.', modules: ['orders', 'reviews'] },
    { key: 'custom', label: 'Custom', description: 'Start blank and choose modules manually.', modules: [] },
];

const FALLBACK_MODULES = [
    { key: 'overview', label: 'Overview', description: 'Seller dashboard overview.' },
    { key: 'products', label: 'Products', description: 'Product manager and stock actions.' },
    { key: 'analytics', label: 'Analytics', description: 'Sales and product performance reports.' },
    { key: '3d', label: '3D Manager', description: '3D asset uploads and management.' },
    { key: 'orders', label: 'Orders', description: 'Order processing and status updates.' },
    { key: 'reviews', label: 'Reviews', description: 'Customer review replies and moderation.' },
    { key: 'shop_settings', label: 'Shop Settings', description: 'Seller storefront profile settings.' },
    { key: 'hr', label: 'HR', description: 'Employees, payroll, and HR records.' },
    { key: 'accounting', label: 'Accounting', description: 'Finance approvals and payroll visibility.' },
    { key: 'procurement', label: 'Procurement', description: 'Inventory and purchasing workflows.' },
    { key: 'stock_requests', label: 'Stock Requests', description: 'Restock request tracking.' },
];

const DEFAULT_EMPLOYEE_ROLE = 'Potter';
const EMPLOYEE_ROLE_OPTIONS = ['Potter', 'Assistant', 'Packer', 'Logistics / Driver', 'Artist'];

const pesoFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

const precisePesoFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const formatPeso = (value) => pesoFormatter.format(Number(value || 0));
const formatPrecisePeso = (value) => precisePesoFormatter.format(Number(value || 0));
const formatShortDate = (value) => value
    ? new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(value))
    : '—';

const getLoginAccessStatus = (loginAccount) => {
    if (!loginAccount) {
        return {
            label: 'No Login',
            className: 'border-stone-200 bg-stone-100 text-stone-600',
        };
    }

    if (loginAccount.plan_workspace_suspended) {
        return {
            label: 'Plan Suspended',
            className: 'border-amber-200 bg-amber-50 text-amber-700',
        };
    }

    if (loginAccount.workspace_access_enabled === false) {
        return {
            label: 'Suspended',
            className: 'border-red-200 bg-red-50 text-red-700',
        };
    }

    if (loginAccount.is_verified) {
        if (loginAccount.must_change_password) {
            return {
                label: 'Password Reset',
                className: 'border-amber-200 bg-amber-50 text-amber-700',
            };
        }

        return {
            label: 'Active',
            className: 'border-[#E7D8C9] bg-[#FCF7F2] text-clay-700',
        };
    }

    return {
        label: 'Pending',
        className: 'border-stone-200 bg-stone-100 text-stone-700',
    };
};

const getAttendanceStatus = (attendance) => {
    if (!attendance?.has_attendance_source) {
        return {
            label: 'Manual',
            className: 'border-stone-200 bg-stone-100 text-stone-600',
            note: 'No linked staff login',
        };
    }

    if (attendance?.open_session || attendance?.current_state === 'clocked_in') {
        return {
            label: 'Clocked In',
            className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
            note: 'Session active now',
        };
    }

    if (attendance?.current_state === 'paused') {
        return {
            label: 'Paused',
            className: 'border-amber-200 bg-amber-50 text-amber-700',
            note: 'Will resume on next login',
        };
    }

    if (attendance?.current_state === 'clocked_out') {
        return {
            label: 'Clocked Out',
            className: 'border-stone-200 bg-stone-100 text-stone-700',
            note: 'Last session closed',
        };
    }

    return {
        label: 'No Attendance',
        className: 'border-stone-200 bg-stone-100 text-stone-600',
        note: 'No sessions yet',
    };
};

const formatAttendanceTime = (value) => value
    ? new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(value))
    : 'No clock-in yet';

const formatAttendanceDateLabel = (value) => value
    ? new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(`${value}T12:00:00`))
    : '—';

const formatWorkedHoursCount = (minutes) => {
    const hours = Number(minutes || 0) / 60;

    if (hours <= 0) {
        return '0';
    }

    const rounded = Math.round(hours * 10) / 10;

    return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1).replace(/\.0$/, '');
};

const formatWorkedHoursLabel = (minutes) => {
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

const formatWorkedHoursSummary = (attendance) => {
    const days = Number(attendance?.days_worked || 0);
    const dayLabel = days === 1 ? 'day' : 'days';

    return `${formatWorkedHoursCount(attendance?.worked_minutes)} worked hours (${days} ${dayLabel})`;
};

const buildAttendanceCalendarWeeks = (calendarDays = []) => {
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

function RolePresetCard({ preset, isSelected, radioName, onSelect }) {
    const moduleCount = (preset.modules || []).length;

    return (
        <label
            className={`cursor-pointer rounded-2xl border p-3 transition ${
                isSelected
                    ? 'border-clay-300 bg-[#FCF7F2] shadow-sm'
                    : 'border-stone-200 bg-white hover:border-stone-300'
            }`}
        >
            <div className="flex items-start gap-3">
                <input
                    type="radio"
                    name={radioName}
                    className="mt-0.5 border-gray-300 text-clay-600 focus:ring-clay-500"
                    checked={isSelected}
                    onChange={onSelect}
                />
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <span className="min-w-0 text-sm font-bold leading-tight text-gray-900">
                            {preset.label}
                        </span>
                        {moduleCount > 0 && (
                            <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-clay-600 px-1.5 text-[10px] font-bold text-white shadow-sm shadow-clay-200">
                                {moduleCount}
                            </span>
                        )}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{preset.description}</p>
                </div>
            </div>
        </label>
    );
}

function AttendanceSummaryCard({ attendance, attendanceStatus, monthLabel, onOpenCalendar }) {
    const canOpen = attendance?.has_attendance_source && (attendance?.calendar_days?.length || 0) > 0;

    return (
        <button
            type="button"
            onClick={canOpen ? onOpenCalendar : undefined}
            disabled={!canOpen}
            className={`w-full min-w-[190px] rounded-2xl border px-3 py-2 text-left transition ${
                canOpen
                    ? 'border-stone-200 bg-white hover:border-clay-200 hover:bg-[#FCF7F2]'
                    : 'border-stone-200 bg-white'
            } ${!canOpen ? 'cursor-default' : 'cursor-pointer'}`}
        >
            <div className="flex items-start justify-between gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${attendanceStatus.className}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                        attendanceStatus.label === 'Clocked In'
                            ? 'bg-emerald-500'
                            : attendanceStatus.label === 'Paused'
                                ? 'bg-amber-500'
                                : 'bg-stone-400'
                    }`}></span>
                    {attendanceStatus.label}
                </span>

                {canOpen && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#E7D8C9] bg-[#FCF7F2] px-2 py-0.5 text-[10px] font-bold text-clay-700">
                        <CalendarDays size={11} />
                        View Dates
                    </span>
                )}
            </div>

            <div className="mt-2 space-y-1 text-[11px] leading-tight text-stone-600">
                <div>{attendanceStatus.note}</div>
                <div className="font-medium text-gray-700">
                    First today: {formatAttendanceTime(attendance?.today_first_clock_in)}
                </div>
                <div className="text-[10px] text-stone-500">
                    {(attendance?.month_label || monthLabel)}: {formatWorkedHoursSummary(attendance)}
                </div>
            </div>
        </button>
    );
}

function AttendanceCalendarModal({ employee, selectedDate, onSelectDate, onClose }) {
    const calendarDays = employee?.attendance?.calendar_days || [];
    const calendarWeeks = buildAttendanceCalendarWeeks(calendarDays);
    const selectedDay = calendarDays.find((day) => day.date === selectedDate) || calendarDays.find((day) => day.is_today) || calendarDays.find((day) => day.has_hours) || calendarDays[0] || null;
    const daysWorked = Number(employee?.attendance?.days_worked || 0);
    const totalWorkedMinutes = Number(employee?.attendance?.worked_minutes || 0);
    const averageWorkedMinutes = daysWorked > 0 ? Math.round(totalWorkedMinutes / daysWorked) : 0;
    const selectedDayHoursLabel = selectedDay ? formatWorkedHoursLabel(selectedDay.worked_minutes) : '0h';
    const bestLoggedDay = calendarDays.filter((day) => day.has_hours).sort((a, b) => b.worked_minutes - a.worked_minutes)[0] || null;

    return (
        <Modal show={!!employee} onClose={onClose} maxWidth="2xl">
            <div className="bg-stone-50 p-2 sm:p-2.5">
                <div className="rounded-[1.05rem] border border-stone-200 bg-white p-3 shadow-[0_16px_30px_-28px_rgba(15,23,42,0.18)] sm:p-3.5">
                    <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-2.5">
                        <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-clay-50 text-clay-600">
                                <CalendarDays size={16} />
                            </div>

                            <div className="min-w-0">
                                <h2 className="text-base font-bold tracking-tight text-gray-900">Attendance Calendar</h2>
                                <p className="mt-0.5 truncate text-xs text-stone-500">
                                    {employee?.name} · {employee?.attendance?.month_label || 'Current Month'}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full p-2 text-gray-400 transition hover:bg-stone-100 hover:text-gray-600"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1.58fr)_220px]">
                        <div className="rounded-[1rem] border border-stone-200 bg-white p-2.5">
                            <div className="mb-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Daily View</p>
                                    <p className="mt-1 text-[11px] text-stone-500">Select a date to review hours.</p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                                        Worked
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5">
                                        <span className="h-2 w-2 rounded-full bg-clay-500"></span>
                                        Selected
                                    </span>
                                </div>
                            </div>

                            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                    <span key={day}>{day}</span>
                                ))}
                            </div>

                            <div className="grid gap-1">
                                {calendarWeeks.map((week, weekIndex) => (
                                    <div key={`week-${weekIndex}`} className="grid grid-cols-7 gap-1">
                                        {week.map((day) => day.empty ? (
                                            <div key={day.key} className="min-h-[46px] rounded-lg border border-transparent bg-stone-50"></div>
                                        ) : (
                                            <button
                                                key={day.key}
                                                type="button"
                                                onClick={() => onSelectDate(day.date)}
                                                className={`min-h-[46px] rounded-lg border px-1.5 py-1 text-left transition ${
                                                    selectedDay?.date === day.date
                                                        ? 'border-clay-300 bg-clay-50 shadow-sm'
                                                        : day.has_hours
                                                            ? 'border-emerald-200 bg-emerald-50/70 hover:border-emerald-300'
                                                            : 'border-stone-200 bg-white hover:border-stone-300'
                                                } ${day.is_today ? 'ring-1 ring-clay-200' : ''}`}
                                            >
                                                <div className="flex items-start justify-between gap-1">
                                                    <span className="text-xs font-bold text-gray-900">{day.day_number}</span>
                                                    <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                                                        selectedDay?.date === day.date
                                                            ? 'bg-clay-500'
                                                            : day.has_hours
                                                                ? 'bg-emerald-500'
                                                                : day.is_today
                                                                    ? 'bg-clay-300'
                                                            : 'bg-stone-200'
                                                    }`}></span>
                                                </div>

                                                <div className="mt-0.5">
                                                    {day.is_today && (
                                                        <span className="inline-flex rounded-full bg-clay-100 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-clay-700">
                                                            Today
                                                        </span>
                                                    )}
                                                    <p className={`mt-0.5 text-[9px] font-semibold leading-snug ${
                                                        day.has_hours ? 'text-emerald-700' : 'text-stone-400'
                                                    }`}>
                                                        {day.has_hours ? day.worked_hours_label : 'No hours'}
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            <div className="grid grid-cols-3 gap-1.5">
                                <div className="rounded-xl border border-clay-100 bg-clay-50/60 px-2 py-1.5">
                                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400">Total</p>
                                    <p className="mt-0.5 text-xs font-bold text-gray-900">{formatWorkedHoursLabel(totalWorkedMinutes)}</p>
                                </div>
                                <div className="rounded-xl border border-stone-200 bg-stone-50 px-2 py-1.5">
                                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400">Days</p>
                                    <p className="mt-0.5 text-xs font-bold text-gray-900">{daysWorked}</p>
                                </div>
                                <div className="rounded-xl border border-stone-200 bg-stone-50 px-2 py-1.5">
                                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400">Avg</p>
                                    <p className="mt-0.5 text-xs font-bold text-gray-900">{formatWorkedHoursLabel(averageWorkedMinutes)}</p>
                                </div>
                            </div>

                            <div className="rounded-[1rem] border border-stone-200 bg-stone-50 p-3">
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">Selected Date</p>
                                <h3 className="mt-1 text-[15px] font-bold tracking-tight text-gray-900">
                                    {selectedDay ? formatAttendanceDateLabel(selectedDay.date) : 'Choose a date'}
                                </h3>

                                <div className="mt-2 rounded-xl border border-stone-200 bg-white px-2.5 py-2">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-clay-50 text-clay-600">
                                            <Clock3 size={15} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">Worked</p>
                                            <p className="mt-0.5 text-sm font-bold text-gray-900">{selectedDayHoursLabel}</p>
                                        </div>
                                    </div>
                                </div>

                                <p className="mt-2 text-xs leading-5 text-stone-600">
                                    {selectedDay?.has_hours
                                        ? `${employee?.name} logged ${selectedDayHoursLabel} on this date.`
                                        : 'No attendance hours logged on this date.'}
                                </p>
                            </div>

                            <div className="rounded-[1rem] border border-stone-200 bg-white p-3">
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">Month Summary</p>

                                <div className="mt-2.5 space-y-2">
                                    <div className="rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-2">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">Attendance Total</p>
                                        <p className="mt-0.5 text-xs font-bold text-gray-900">{formatWorkedHoursSummary(employee?.attendance)}</p>
                                    </div>

                                    <div className="rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-2">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">Best Day</p>
                                        <p className="mt-0.5 text-xs font-bold text-gray-900">{bestLoggedDay?.worked_hours_label || '0h'}</p>
                                        <p className="mt-0.5 text-xs text-stone-500">
                                            {bestLoggedDay ? formatAttendanceDateLabel(bestLoggedDay.date) : 'No attendance yet'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

export default function HR({ auth, staff = [], payrolls = [], sellerSettings = {}, staffProvisioning = {} }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddPassword, setShowAddPassword] = useState(false);
    const [showEditPassword, setShowEditPassword] = useState(false);
    const [attendanceModalEmployee, setAttendanceModalEmployee] = useState(null);
    const [selectedAttendanceDate, setSelectedAttendanceDate] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, id: null });
    const { addToast } = useToast();
    const canManageStaffAccounts = !!staffProvisioning.canManageStaffAccounts;
    const requiresStaffSchemaUpdate = !!staffProvisioning.requiresStaffSchemaUpdate;
    const canProvisionStaffAccounts = canManageStaffAccounts && !requiresStaffSchemaUpdate;
    const rolePresets = staffProvisioning.rolePresets?.length ? staffProvisioning.rolePresets : FALLBACK_ROLE_PRESETS;
    const availableModules = staffProvisioning.availableModules?.length ? staffProvisioning.availableModules : FALLBACK_MODULES;
    const initialPresetKey = rolePresets[0]?.key || 'hr';
    const [manualEmployeeRole, setManualEmployeeRole] = useState(DEFAULT_EMPLOYEE_ROLE);
    const presetLabelByKey = rolePresets.reduce((acc, preset) => {
        acc[preset.key] = preset.label;
        return acc;
    }, {});

    const buildModuleSelection = (presetKey) => {
        const preset = rolePresets.find((item) => item.key === presetKey) || rolePresets.find((item) => item.key === 'custom');
        const presetModules = new Set(preset?.modules || []);

        return availableModules.reduce((acc, module) => {
            acc[module.key] = presetModules.has(module.key);
            return acc;
        }, {});
    };
    
    // Overtime Rate Settings Modal
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const { data: settingsData, setData: setSettingsData, post: postSettings, processing: settingsProcessing } = useForm({
        overtime_rate: sellerSettings.overtime_rate || 50.00,
        payroll_working_days: sellerSettings.payroll_working_days || 22,
    });

    const submitSettings = (e) => {
        e.preventDefault();
        postSettings(route('hr.settings'), {
            onSuccess: () => {
                setIsSettingsOpen(false);
                addToast('Payroll settings updated successfully', 'success');
            }
        });
    };

    // FORM: Employee record + optional staff login provisioning
    const { data, setData, post, processing, reset, errors } = useForm({
        name: '',
        role: DEFAULT_EMPLOYEE_ROLE,
        salary: '',
        create_login_account: false,
        email: '',
        default_password: '',
        staff_role_preset_key: initialPresetKey,
        module_overrides: buildModuleSelection(initialPresetKey),
    });

    const getPresetRoleLabel = (presetKey) => presetLabelByKey[presetKey] || 'Custom';
    const getFlashSuccessMessage = (page, fallback) => page?.props?.flash?.success || fallback;

    const handleManualRoleChange = (value) => {
        setManualEmployeeRole(value);
        setData('role', value);
    };

    const getModuleSelectionFromLogin = (loginAccount, presetKey) => {
        const defaultSelection = buildModuleSelection(presetKey);

        return availableModules.reduce((acc, module) => {
            const explicitValue = loginAccount?.module_permissions?.[module.key];
            acc[module.key] = typeof explicitValue === 'boolean'
                ? explicitValue
                : !!defaultSelection[module.key];
            return acc;
        }, {});
    };

    const handleProvisionToggle = (enabled) => {
        setData('create_login_account', enabled);

        if (!enabled) {
            setData('role', manualEmployeeRole || DEFAULT_EMPLOYEE_ROLE);
            return;
        }

        const presetKey = data.staff_role_preset_key || initialPresetKey;
        setManualEmployeeRole(data.role || DEFAULT_EMPLOYEE_ROLE);
        setData('role', getPresetRoleLabel(presetKey));
        setData('module_overrides', buildModuleSelection(presetKey));
    };

    const handlePresetChange = (presetKey) => {
        setData('staff_role_preset_key', presetKey);
        if (data.create_login_account) {
            setData('role', getPresetRoleLabel(presetKey));
        }
        setData('module_overrides', buildModuleSelection(presetKey));
    };

    const toggleModuleOverride = (moduleKey) => {
        setData('module_overrides', {
            ...data.module_overrides,
            [moduleKey]: !data.module_overrides?.[moduleKey],
        });
    };

    const submit = (e) => {
        e.preventDefault();
        const isProvisioningLogin = data.create_login_account;

        post(route('hr.store'), {
            onSuccess: (page) => {
                setIsModalOpen(false);
                setShowAddPassword(false);
                reset();
                handleProvisionToggle(false);
                handlePresetChange(initialPresetKey);
                addToast(
                    getFlashSuccessMessage(
                        page,
                        isProvisioningLogin
                            ? 'Employee and staff login created. A verification email was sent.'
                            : 'Employee added successfully.'
                    ),
                    'success'
                );
            }
        });
    };

    const closeAddModal = () => {
        setIsModalOpen(false);
        setShowAddPassword(false);
    };

    const [editManualEmployeeRole, setEditManualEmployeeRole] = useState(DEFAULT_EMPLOYEE_ROLE);
    const { data: editData, setData: setEditData, patch, processing: editProcessing, reset: resetEdit, errors: editErrors } = useForm({
        name: '',
        role: DEFAULT_EMPLOYEE_ROLE,
        salary: '',
        create_login_account: false,
        email: '',
        default_password: '',
        staff_role_preset_key: initialPresetKey,
        module_overrides: buildModuleSelection(initialPresetKey),
    });

    const handleEditManualRoleChange = (value) => {
        setEditManualEmployeeRole(value);
        setEditData('role', value);
    };

    const handleEditProvisionToggle = (enabled) => {
        setEditData('create_login_account', enabled);

        if (!enabled) {
            if (!editingEmployee?.has_login_account) {
                setEditData('role', editManualEmployeeRole || DEFAULT_EMPLOYEE_ROLE);
            }
            return;
        }

        const presetKey = editData.staff_role_preset_key || initialPresetKey;
        setEditManualEmployeeRole(editData.role || DEFAULT_EMPLOYEE_ROLE);
        setEditData('role', getPresetRoleLabel(presetKey));
        if (!editingEmployee?.has_login_account) {
            setEditData('module_overrides', buildModuleSelection(presetKey));
        }
    };

    const handleEditPresetChange = (presetKey) => {
        setEditData('staff_role_preset_key', presetKey);
        if (editData.create_login_account || editingEmployee?.has_login_account) {
            setEditData('role', getPresetRoleLabel(presetKey));
        }
        setEditData('module_overrides', buildModuleSelection(presetKey));
    };

    const toggleEditModuleOverride = (moduleKey) => {
        setEditData('module_overrides', {
            ...editData.module_overrides,
            [moduleKey]: !editData.module_overrides?.[moduleKey],
        });
    };

    const openEditModal = (employee) => {
        const hasLoginAccount = !!employee.has_login_account;
        const workspaceAccessEnabled = employee.login_account?.workspace_access_enabled !== false;
        const presetKey = employee.login_account?.role_preset_key || initialPresetKey;
        const moduleOverrides = hasLoginAccount
            ? getModuleSelectionFromLogin(employee.login_account, presetKey)
            : buildModuleSelection(presetKey);

        setEditingEmployee(employee);
        setShowEditPassword(false);
        setEditManualEmployeeRole(employee.role || DEFAULT_EMPLOYEE_ROLE);
        setEditData({
            name: employee.name || '',
            role: hasLoginAccount ? getPresetRoleLabel(presetKey) : (employee.role || DEFAULT_EMPLOYEE_ROLE),
            salary: employee.salary ?? '',
            create_login_account: hasLoginAccount ? workspaceAccessEnabled : false,
            email: employee.login_account?.email || '',
            default_password: '',
            staff_role_preset_key: presetKey,
            module_overrides: moduleOverrides,
        });
        setIsEditModalOpen(true);
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setEditingEmployee(null);
        setShowEditPassword(false);
        resetEdit();
        setEditManualEmployeeRole(DEFAULT_EMPLOYEE_ROLE);
    };

    const submitEdit = (e) => {
        e.preventDefault();

        if (!editingEmployee) {
            return;
        }

        patch(route('hr.update', editingEmployee.id), {
            onSuccess: (page) => {
                closeEditModal();
                addToast(getFlashSuccessMessage(page, 'Employee details updated successfully.'), 'success');
            },
        });
    };

    const closeConfirmModal = () => {
        setConfirmModal({ isOpen: false, type: null, id: null });
    };

    const deleteEmployee = (id) => {
        setConfirmModal({ isOpen: true, type: 'employee', id });
    };

    const editHasLinkedLogin = !!editingEmployee?.has_login_account;
    const editLinkedLoginIsSuspended = editingEmployee?.login_account?.workspace_access_enabled === false;
    const showLinkedLoginUpdateFields = canProvisionStaffAccounts && (editHasLinkedLogin || editData.create_login_account);
    const isSuspendingLinkedLogin = editHasLinkedLogin && canProvisionStaffAccounts && !editData.create_login_account;

    // Filter Logic for the Table
    const filteredStaff = staff.filter(emp => 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const openAttendanceModal = (employee) => {
        const calendarDays = employee?.attendance?.calendar_days || [];
        const preferredDay = calendarDays.find((day) => day.is_today)
            || calendarDays.find((day) => day.has_hours)
            || calendarDays[0]
            || null;

        setAttendanceModalEmployee(employee);
        setSelectedAttendanceDate(preferredDay?.date || null);
    };

    const closeAttendanceModal = () => {
        setAttendanceModalEmployee(null);
        setSelectedAttendanceDate(null);
    };

    // PAYROLL FORM
    const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
    const { data: payrollData, setData: setPayrollData, post: postPayroll, processing: payrollProcessing, reset: resetPayroll, transform: transformPayroll } = useForm({
        month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
        items: []
    });

    const openPayrollModal = () => {
        // Initialize items with active staff
        const initialItems = staff.map(emp => ({
            employee_id: emp.id,
            name: emp.name,
            salary: Number(emp.salary),
            absences_days: Number(emp.payroll_prefill?.absences_days ?? 0),
            undertime_hours: Number(emp.payroll_prefill?.undertime_hours ?? 0),
            overtime_hours: Number(emp.payroll_prefill?.overtime_hours ?? 0),
            attendance_days_worked: Number(emp.payroll_prefill?.days_worked ?? 0),
            has_attendance_source: !!emp.attendance?.has_attendance_source,
            isSelected: true
        }));
        setPayrollData('month', sellerSettings.attendance_month_label || new Date().toLocaleString('default', { month: 'long', year: 'numeric' }));
        setPayrollData('items', initialItems);
        setIsPayrollModalOpen(true);
    };

    const updatePayrollItem = (index, field, value) => {
        const newItems = [...payrollData.items];
        newItems[index][field] = value;
        setPayrollData('items', newItems);
    };

    const submitPayroll = (e) => {
        e.preventDefault();
        
        const selectedItems = payrollData.items.filter(i => i.isSelected);
        if (selectedItems.length === 0) {
            addToast("Please select at least one employee.", "error");
            return;
        }

        transformPayroll((data) => ({
            month: data.month,
            items: data.items.filter(i => i.isSelected).map(i => ({
                ...i,
                absences_days: i.absences_days || 0,
                undertime_hours: i.undertime_hours || 0,
                overtime_hours: i.overtime_hours || 0
            }))
        }));

        postPayroll(route('hr.generate'), {
            onSuccess: () => {
                setIsPayrollModalOpen(false);
                resetPayroll();
                addToast("Payroll generated successfully", "success");
            }
        });
    };

    const deletePayroll = (id) => {
        setConfirmModal({ isOpen: true, type: 'payroll', id });
    };

    const confirmDeleteAction = () => {
        if (!confirmModal.id) {
            return;
        }

        if (confirmModal.type === 'employee') {
            router.delete(route('hr.destroy', confirmModal.id), {
                onSuccess: (page) => addToast(getFlashSuccessMessage(page, 'Employee removed'), 'success'),
                onFinish: closeConfirmModal,
            });
            return;
        }

        if (confirmModal.type === 'payroll') {
            router.delete(route('hr.payroll.destroy', confirmModal.id), {
                onSuccess: () => addToast('Payroll request deleted', 'success'),
                onFinish: closeConfirmModal,
            });
        }
    };

    // Helper to calculate estimated net pay for preview
    const calculateNetPay = (item) => {
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

    return (
        <div className="min-h-screen bg-[#FDFBF9] flex font-sans text-gray-800">
            <Head title="HR Management" />
            
            {/* SIDEBAR */}
            <SellerSidebar active="hr" user={auth.user} mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col min-w-0 lg:ml-56 transition-all duration-300">
                
                {/* --- HEADER (Standardized) --- */}
                <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 flex flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8 sm:flex-row sm:items-center sm:justify-between sticky top-0 z-40">
                    <div className="flex items-center gap-3 min-w-0">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-clay-600">
                            <Menu size={24} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-gray-900">Human Resources</h1>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-900 text-[10px] font-bold uppercase tracking-wider text-gray-300">
                                    <Building2 size={10} className="text-clay-400" /> Enterprise
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 font-medium mt-0.5 hidden sm:block">Manage payroll records and seller staff access</p>
                        </div>
                    </div>

                                        
                    <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap sm:gap-6">
                        {/* Actions */}
                        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                            <button 
                                onClick={() => setIsSettingsOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-700 rounded-xl text-xs font-bold hover:bg-stone-200 transition transform active:scale-95"
                                title="Payroll Settings"
                            >
                                <SettingsIcon size={16} />
                            </button>
                            <button 
                                onClick={openPayrollModal}
                                className="flex items-center gap-2 px-4 py-2 bg-clay-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-clay-200 hover:bg-clay-700 transition transform active:scale-95"
                            >
                                <Banknote size={16} /> Generate Payroll
                            </button>
                            <button 
                                onClick={() => setIsModalOpen(true)} 
                                className="flex items-center gap-2 px-4 py-2 bg-clay-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-clay-200 hover:bg-clay-700 transition transform active:scale-95"
                            >
                                <UserPlus size={16} /> Add Employee
                            </button>
                            <NotificationDropdown />
                        </div>

                        {/* Divider */}
                        <div className="hidden sm:block h-8 w-px bg-gray-200"></div>

                        {/* Profile Dropdown (Fixed Layout) */}
                        <div className="relative">
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <span className="inline-flex rounded-md">
                                        <button type="button" className="inline-flex items-center gap-2 sm:gap-3 px-1 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-transparent hover:text-gray-700 focus:outline-none transition ease-in-out duration-150">
                                            <WorkspaceAccountSummary user={auth.user} className="hidden lg:block text-right" />
                                            <UserAvatar user={auth.user} />
                                            <ChevronDown size={16} className="text-gray-400" />
                                        </button>
                                    </span>
                                </Dropdown.Trigger>

                                <Dropdown.Content>
                                    <Dropdown.Link href={route('profile.edit')} className="flex items-center gap-2">
                                        <User size={16} /> Profile
                                    </Dropdown.Link>
                                    <WorkspaceLogoutLink className="flex items-center gap-2 text-red-600 hover:text-red-700">
                                        <LogOut size={16} /> Log Out
                                    </WorkspaceLogoutLink>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>
                    </div>
                </header>

                <main className="p-4 sm:p-6 space-y-6">


                    {/* KPI CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Active Staff</p>
                                <h3 className="text-2xl font-bold text-gray-900 mt-1">{staff.length}</h3>
                            </div>
                            <div className="w-10 h-10 bg-[#F8EEE6] text-clay-600 rounded-xl flex items-center justify-center">
                                <Users size={20} />
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Est. Monthly Payroll</p>
                                <h3 className="text-2xl font-bold text-gray-900 mt-1">{formatPeso(staff.reduce((acc, curr) => acc + Number(curr.salary), 0))}</h3>
                            </div>
                            <div className="w-10 h-10 bg-stone-100 text-stone-700 rounded-xl flex items-center justify-center">
                                <Briefcase size={20} />
                            </div>
                        </div>
                    </div>

                    {/* EMPLOYEE LIST TABLE */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                        
                        {/* Table Header / Toolbar */}
                        <div className="p-4 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/30">
                            <h3 className="font-bold text-gray-900 text-base">Employee Directory</h3>
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input 
                                    type="text" 
                                    placeholder="Search name or role..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-clay-500 focus:border-clay-500 transition-shadow"
                                />
                                {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={12} /></button>}
                            </div>
                        </div>

                        {/* Table Body */}
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full min-w-[860px] text-left">
                                <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-5 py-3">Employee Name</th>
                                        <th className="px-5 py-3">Position / Role</th>
                                        <th className="px-5 py-3">Monthly Salary</th>
                                        <th className="px-5 py-3">Status</th>
                                        <th className="px-5 py-3">Login Access</th>
                                        <th className="px-5 py-3">Attendance</th>
                                        <th className="px-5 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredStaff.length > 0 ? (
                                        filteredStaff.map((emp) => {
                                            const loginAccessStatus = getLoginAccessStatus(emp.login_account);
                                            const attendanceStatus = getAttendanceStatus(emp.attendance);

                                            return (
                                            <tr key={emp.id} className="hover:bg-gray-50/50 transition duration-150">
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        {emp.has_login_account ? (
                                                            <UserAvatar
                                                                user={{
                                                                    ...emp.login_account,
                                                                    name: emp.login_account?.name || emp.name,
                                                                    role: 'staff',
                                                                }}
                                                                className="w-8 h-8 text-xs"
                                                            />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-clay-100 flex items-center justify-center text-clay-700 font-bold border border-clay-200 text-xs">
                                                                {emp.name.charAt(0)}
                                                            </div>
                                                        )}
                                                        <span className="font-bold text-gray-900 text-sm">{emp.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 text-xs text-gray-600 font-medium">{emp.role}</td>
                                                <td className="px-5 py-3 font-bold text-gray-900 text-sm">{formatPeso(emp.salary)}</td>
                                                <td className="px-5 py-3">
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Active
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3">
                                                    {emp.has_login_account ? (
                                                        <div className="min-w-[190px] rounded-2xl border border-stone-200 bg-stone-50/80 px-3 py-2">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${loginAccessStatus.className}`}>
                                                                    <span className={`h-1.5 w-1.5 rounded-full ${
                                                                        emp.login_account?.workspace_access_enabled === false
                                                                            ? 'bg-red-500'
                                                                            : emp.login_account?.is_verified
                                                                                ? emp.login_account?.must_change_password
                                                                                    ? 'bg-amber-500'
                                                                                    : 'bg-clay-500'
                                                                                : 'bg-stone-400'
                                                                    }`}></span>
                                                                    {loginAccessStatus.label}
                                                                </span>
                                                                <span className="shrink-0 rounded-full border border-[#E7D8C9] bg-white px-2 py-0.5 text-[10px] font-bold text-clay-700">
                                                                    {presetLabelByKey[emp.login_account?.role_preset_key] || 'Custom'}
                                                                </span>
                                                            </div>
                                                            <div className="mt-2 text-[11px] leading-tight text-stone-600">
                                                                <div className="break-all font-medium text-gray-700">
                                                                    {emp.login_account?.email}
                                                                </div>
                                                                {emp.login_account?.plan_workspace_suspended && (
                                                                    <div className="mt-1 text-[10px] font-medium text-amber-700">
                                                                        Seller plan downgrade is currently suspending this workspace login.
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex min-w-[150px] items-center gap-2 rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-3 py-2 text-[11px] font-medium text-stone-500">
                                                            <span className="h-2 w-2 rounded-full bg-stone-300"></span>
                                                            No linked login
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <AttendanceSummaryCard
                                                        attendance={emp.attendance}
                                                        attendanceStatus={attendanceStatus}
                                                        monthLabel={sellerSettings.attendance_month_label || payrollData.month}
                                                        onOpenCalendar={() => openAttendanceModal(emp)}
                                                    />
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <div className="flex justify-end gap-1.5">
                                                        <button
                                                            onClick={() => openEditModal(emp)}
                                                            className="p-1.5 text-clay-600 hover:bg-[#FCF7F2] rounded-md transition"
                                                            title="Update Data"
                                                            type="button"
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteEmployee(emp.id)}
                                                            disabled={emp.has_login_account && !canManageStaffAccounts}
                                                            className={`p-1.5 rounded-md transition ${
                                                                emp.has_login_account && !canManageStaffAccounts
                                                                    ? 'cursor-not-allowed text-gray-300'
                                                                    : 'text-red-500 hover:bg-red-50'
                                                            }`}
                                                            title={emp.has_login_account && !canManageStaffAccounts
                                                                ? 'Only the shop owner can remove employees with login access'
                                                                : 'Remove Employee'}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )})
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-20 text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                                                        <Users size={32} className="text-gray-300" />
                                                    </div>
                                                    <h3 className="text-lg font-bold text-gray-900 mb-1">No Staff Found</h3>
                                                    <p className="text-sm text-gray-500 mb-6">Start by adding your first employee to the list.</p>
                                                    <button onClick={() => setIsModalOpen(true)} className="text-clay-600 font-bold hover:underline text-sm">Create New Record</button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* PAYROLL HISTORY TABLE */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col mt-8">
                        <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                            <h3 className="font-bold text-gray-900 text-base">Payroll Requests History</h3>
                        </div>
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full min-w-[860px] text-left">
                                <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-5 py-3">Date</th>
                                        <th className="px-5 py-3 text-center">Employees</th>
                                        <th className="px-5 py-3 text-right">Total Amount</th>
                                        <th className="px-5 py-3 text-center">Status</th>
                                        <th className="px-5 py-3">Reason</th>
                                        <th className="px-5 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {payrolls.data && payrolls.data.length > 0 ? (
                                        payrolls.data.map((payroll) => (
                                            <tr key={payroll.id} className="hover:bg-gray-50/50 transition duration-150 relative">
                                                <td className="px-5 py-4">
                                                    <div className="font-bold text-gray-900 text-sm">{formatShortDate(payroll.created_at)}</div>
                                                    <div className="mt-1 text-xs text-gray-500">{payroll.month}</div>
                                                    <div className="mt-1 text-xs text-gray-400">
                                                        Requested by <span className="font-bold text-gray-600">{payroll.requester?.name || 'Seller owner'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-center font-bold text-gray-600">
                                                    {payroll.employee_count}
                                                </td>
                                                <td className="px-5 py-4 text-right font-bold text-gray-900">
                                                    {formatPeso(payroll.total_amount)}
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold ${
                                                        payroll.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                                                        payroll.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                                        'bg-[#F8EEE6] text-clay-700'
                                                    }`}>
                                                        {payroll.status}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className={`text-xs leading-relaxed ${
                                                        payroll.rejection_reason ? 'text-red-600' : 'text-gray-400'
                                                    }`}>
                                                        {payroll.rejection_reason || '—'}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    {['Pending', 'Rejected'].includes(payroll.status) ? (
                                                        <button 
                                                            onClick={() => deletePayroll(payroll.id)} 
                                                            className="text-red-500 hover:text-red-700 font-bold text-xs bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition"
                                                        >
                                                            Delete Request
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs italic">Locked</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-10 text-center text-gray-500 text-sm">
                                                No payroll requests generated yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Pagination Component */}
                        {payrolls.links && payrolls.links.length > 3 && (
                            <div className="px-6 py-4 flex items-center justify-between border-t border-gray-100 bg-gray-50/30">
                                <div className="text-xs text-gray-500 font-medium">
                                    Showing <span className="font-bold text-gray-900">{payrolls.from || 0}</span> to <span className="font-bold text-gray-900">{payrolls.to || 0}</span> of <span className="font-bold text-gray-900">{payrolls.total}</span> entries
                                </div>
                                <div className="flex gap-1">
                                    {payrolls.links.map((link, i) => (
                                        <button
                                            key={i}
                                            disabled={!link.url || link.active}
                                            onClick={() => router.get(link.url)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                link.active 
                                                    ? 'bg-clay-600 text-white shadow-md shadow-clay-200' 
                                                    : !link.url 
                                                        ? 'bg-gray-50 text-gray-300 cursor-not-allowed' 
                                                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                            }`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            <AttendanceCalendarModal
                employee={attendanceModalEmployee}
                selectedDate={selectedAttendanceDate}
                onSelectDate={setSelectedAttendanceDate}
                onClose={closeAttendanceModal}
            />

            {/* ADD EMPLOYEE MODAL */}
            <Modal show={isModalOpen} onClose={closeAddModal} maxWidth="2xl">
                <form onSubmit={submit} className="p-4 sm:p-6 max-h-[85vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Add New Staff</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Create an employee record and optionally provision seller portal access.
                            </p>
                        </div>
                        <button type="button" onClick={closeAddModal} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                    </div>
                    
                    <div className="space-y-5">
                        <div className={`rounded-2xl border px-4 py-3 shadow-sm ${canProvisionStaffAccounts ? 'border-[#E7D8C9] bg-[#FCF7F2]' : 'border-stone-200 bg-stone-50'}`}>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold text-gray-900">Seller Portal Login</p>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                            data.create_login_account
                                                ? 'bg-clay-600 text-white'
                                                : 'bg-stone-200 text-stone-600'
                                        }`}>
                                            {data.create_login_account ? 'On' : 'Off'}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs leading-relaxed text-stone-500">
                                        Enable this only for employees who need seller workspace access.
                                    </p>
                                </div>

                                <label className={`relative inline-flex shrink-0 items-center ${canProvisionStaffAccounts ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                                    <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={data.create_login_account}
                                        disabled={!canProvisionStaffAccounts}
                                        onChange={(e) => handleProvisionToggle(e.target.checked)}
                                    />
                                    <div className="h-6 w-11 rounded-full bg-stone-300 transition-colors peer-checked:bg-clay-600 peer-focus:ring-2 peer-focus:ring-clay-500 peer-focus:ring-offset-2" />
                                    <div className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
                                </label>
                            </div>

                            {requiresStaffSchemaUpdate && (
                                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                                    Database migration required before this feature can be used.
                                </div>
                            )}

                            {!requiresStaffSchemaUpdate && !canManageStaffAccounts && (
                                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                                    Only the shop owner can create staff login accounts.
                                </div>
                            )}
                        </div>

                        {!data.create_login_account && (
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="md:col-span-2">
                                    <label className="mb-1 block text-sm font-bold text-gray-700">Employee Name</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-xl border-gray-300 shadow-sm transition focus:border-clay-500 focus:ring-clay-500"
                                        placeholder="e.g. John Doe"
                                        value={data.name}
                                        onChange={e => setData('name', e.target.value)}
                                        required
                                    />
                                    {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-bold text-gray-700">Position / Role</label>
                                    <select
                                        className="w-full rounded-xl border-gray-300 shadow-sm transition focus:border-clay-500 focus:ring-clay-500"
                                        value={data.role}
                                        onChange={e => handleManualRoleChange(e.target.value)}
                                    >
                                        {EMPLOYEE_ROLE_OPTIONS.map((roleOption) => (
                                            <option key={roleOption}>{roleOption}</option>
                                        ))}
                                    </select>
                                    {errors.role && <p className="mt-1 text-xs text-red-500">{errors.role}</p>}
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-bold text-gray-700">Monthly Salary (PHP)</label>
                                    <input
                                        type="number"
                                        className="w-full rounded-xl border-gray-300 shadow-sm transition focus:border-clay-500 focus:ring-clay-500"
                                        placeholder="e.g. 15000"
                                        value={data.salary}
                                        onChange={e => setData('salary', e.target.value)}
                                        required
                                    />
                                    {errors.salary && <p className="mt-1 text-xs text-red-500">{errors.salary}</p>}
                                </div>
                            </div>
                        )}

                        {data.create_login_account && canProvisionStaffAccounts && (
                            <div className="space-y-5">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="md:col-span-2">
                                        <label className="mb-1 block text-sm font-bold text-gray-700">Employee Name</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-xl border-gray-300 shadow-sm transition focus:border-clay-500 focus:ring-clay-500"
                                            placeholder="e.g. John Doe"
                                            value={data.name}
                                            onChange={e => setData('name', e.target.value)}
                                            required
                                        />
                                        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-bold text-gray-700">Email Address</label>
                                        <input
                                            type="email"
                                            className="w-full rounded-xl border-gray-300 shadow-sm transition focus:border-clay-500 focus:ring-clay-500"
                                            placeholder="employee@gmail.com"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                        />
                                        {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-bold text-gray-700">Initial Password</label>
                                        <div className="relative">
                                            <input
                                                type={showAddPassword ? 'text' : 'password'}
                                                className="w-full rounded-xl border-gray-300 pr-11 shadow-sm transition focus:border-clay-500 focus:ring-clay-500"
                                                placeholder="Set initial password"
                                                value={data.default_password}
                                                onChange={(e) => setData('default_password', e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowAddPassword((value) => !value)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 transition hover:text-stone-600"
                                                aria-label={showAddPassword ? 'Hide initial password' : 'Show initial password'}
                                            >
                                                {showAddPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                        {errors.default_password && <p className="mt-1 text-xs text-red-500">{errors.default_password}</p>}
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="mb-1 block text-sm font-bold text-gray-700">Monthly Salary (PHP)</label>
                                        <input
                                            type="number"
                                            className="w-full rounded-xl border-gray-300 shadow-sm transition focus:border-clay-500 focus:ring-clay-500"
                                            placeholder="e.g. 15000"
                                            value={data.salary}
                                            onChange={e => setData('salary', e.target.value)}
                                            required
                                        />
                                        {errors.salary && <p className="mt-1 text-xs text-red-500">{errors.salary}</p>}
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-[#E7D8C9] bg-[#FCF7F2] px-4 py-3 text-xs leading-relaxed text-stone-600">
                                    Use the employee&apos;s active Gmail account. The selected role preset will also be saved as this employee&apos;s role, and they must verify the email plus replace the initial password before entering seller modules.
                                </div>

                                {errors.role && <p className="mt-1 text-xs text-red-500">{errors.role}</p>}

                                <div className="rounded-2xl border border-stone-200 bg-white p-4">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700">Role Preset</label>
                                            <p className="mt-1 text-xs text-gray-500">Choose the closest access role, then adjust modules if needed.</p>
                                        </div>
                                        <span className="rounded-full border border-clay-200 bg-[#FCF7F2] px-3 py-1 text-[11px] font-bold text-clay-700">
                                            {presetLabelByKey[data.staff_role_preset_key] || 'Custom'}
                                        </span>
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                        {rolePresets.map((preset) => (
                                            <RolePresetCard
                                                key={preset.key}
                                                preset={preset}
                                                radioName="staff_role_preset_key"
                                                isSelected={data.staff_role_preset_key === preset.key}
                                                onSelect={() => handlePresetChange(preset.key)}
                                            />
                                        ))}
                                    </div>
                                    {errors.staff_role_preset_key && <p className="mt-1 text-xs text-red-500">{errors.staff_role_preset_key}</p>}
                                </div>

                                <div className="rounded-2xl border border-stone-200 bg-white p-4">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700">Module Access Overrides</label>
                                            <p className="mt-1 text-xs text-gray-500">Turn modules on or off based on the employee&apos;s actual responsibilities.</p>
                                        </div>
                                        <span className="rounded-full border border-[#E7D8C9] bg-[#FCF7F2] px-3 py-1 text-[11px] font-bold text-clay-700">
                                            {Object.values(data.module_overrides || {}).filter(Boolean).length} enabled
                                        </span>
                                    </div>
                                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                                        {availableModules.map((module) => (
                                            <label
                                                key={module.key}
                                                className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 transition ${
                                                    data.module_overrides?.[module.key]
                                                        ? 'border-clay-300 bg-[#FCF7F2]'
                                                        : 'border-stone-200 bg-white hover:border-stone-300'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="mt-0.5 rounded border-gray-300 text-clay-600 focus:ring-clay-500"
                                                    checked={!!data.module_overrides?.[module.key]}
                                                    onChange={() => toggleModuleOverride(module.key)}
                                                />
                                                <div className="min-w-0">
                                                    <div className="text-xs font-bold text-gray-900">{module.label}</div>
                                                    <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">{module.description}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                    {errors.module_overrides && <p className="mt-1 text-xs text-red-500">{errors.module_overrides}</p>}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 flex flex-col-reverse gap-3 pt-4 border-t border-gray-100 sm:flex-row sm:justify-end">
                        <button type="button" onClick={closeAddModal} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-50 rounded-lg transition">Cancel</button>
                        <button type="submit" disabled={processing} className="px-6 py-2 bg-clay-600 text-white rounded-xl font-bold hover:bg-clay-700 transition">
                            {data.create_login_account ? 'Save Employee & Login' : 'Save Employee'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal show={isEditModalOpen} onClose={closeEditModal} maxWidth="lg">
                <form onSubmit={submitEdit} className="p-4 sm:p-6 max-h-[85vh] overflow-y-auto">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-xl font-bold text-gray-900">Update Employee</h2>
                                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${
                                    editHasLinkedLogin
                                        ? editLinkedLoginIsSuspended
                                            ? 'border-red-200 bg-red-50 text-red-700'
                                            : 'border-[#E7D8C9] bg-[#FCF7F2] text-clay-700'
                                        : 'border-stone-200 bg-stone-100 text-stone-600'
                                }`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${
                                        editHasLinkedLogin
                                            ? editLinkedLoginIsSuspended
                                                ? 'bg-red-500'
                                                : 'bg-clay-500'
                                            : 'bg-stone-400'
                                    }`}></span>
                                    {editHasLinkedLogin
                                        ? editLinkedLoginIsSuspended
                                            ? 'Access Suspended'
                                            : 'Workspace Active'
                                        : 'No Login Yet'}
                                </span>
                            </div>
                            <p className="mt-1 text-sm text-gray-500">
                                Update the employee record and, when allowed, the linked seller workspace access.
                            </p>
                        </div>
                        <button type="button" onClick={closeEditModal} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-5">
                        <div className={`rounded-2xl border px-4 py-3 shadow-sm ${canProvisionStaffAccounts ? 'border-[#E7D8C9] bg-[#FCF7F2]' : 'border-stone-200 bg-stone-50'}`}>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold text-gray-900">Seller Portal Login</p>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                            editHasLinkedLogin && !editData.create_login_account
                                                ? 'bg-red-600 text-white'
                                                : editData.create_login_account
                                                ? 'bg-clay-600 text-white'
                                                : 'bg-stone-200 text-stone-600'
                                        }`}>
                                            {editHasLinkedLogin && !editData.create_login_account
                                                ? 'Suspended'
                                                : editData.create_login_account ? 'On' : 'Off'}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs leading-relaxed text-stone-500">
                                        {editHasLinkedLogin
                                            ? 'Suspend or restore workspace access here without deleting the linked staff account.'
                                            : 'Enable this only when the employee needs seller workspace access.'}
                                    </p>
                                </div>

                                <label className={`relative inline-flex shrink-0 items-center ${
                                    canProvisionStaffAccounts
                                        ? 'cursor-pointer'
                                        : 'cursor-not-allowed opacity-60'
                                }`}>
                                    <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={editData.create_login_account}
                                        disabled={!canProvisionStaffAccounts}
                                        onChange={(e) => handleEditProvisionToggle(e.target.checked)}
                                    />
                                    <div className="h-6 w-11 rounded-full bg-stone-300 transition-colors peer-checked:bg-clay-600 peer-focus:ring-2 peer-focus:ring-clay-500 peer-focus:ring-offset-2" />
                                    <div className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
                                </label>
                            </div>

                            {requiresStaffSchemaUpdate && (
                                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                                    Database migration required before login access can be updated here.
                                </div>
                            )}

                            {!requiresStaffSchemaUpdate && !canManageStaffAccounts && (
                                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                                    Only the shop owner can update seller login access, role presets, and module permissions.
                                </div>
                            )}

                            {editHasLinkedLogin && canProvisionStaffAccounts && (
                                <div className="mt-3 rounded-xl border border-[#E7D8C9] bg-white px-3 py-2 text-xs font-medium text-stone-600">
                                    This employee already has a linked seller login. You can update the linked email, reset the password, adjust access below, or suspend workspace access while keeping the account ready for restoration later.
                                </div>
                            )}

                            {isSuspendingLinkedLogin && (
                                <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                                            Access Suspension
                                        </span>
                                        <span className="font-bold">Seller workspace access will be suspended when you submit this update.</span>
                                    </div>
                                    <div className="mt-2 space-y-1 leading-relaxed">
                                        <p>The employee record will stay in HR and payroll history.</p>
                                        <p>The linked seller login account, email, and role setup will be preserved.</p>
                                        <p>All seller workspace module access will stay blocked until you restore access here.</p>
                                    </div>
                                </div>
                            )}

                            {editLinkedLoginIsSuspended && editData.create_login_account && canProvisionStaffAccounts && (
                                <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                                            Access Restore
                                        </span>
                                        <span className="font-bold">Seller workspace access will be restored when you submit this update.</span>
                                    </div>
                                    <div className="mt-2 space-y-1 leading-relaxed">
                                        <p>The existing linked login account will be reused.</p>
                                        <p>Saved role preset and module settings can be updated before the account is reactivated.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {!showLinkedLoginUpdateFields && (
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="md:col-span-2">
                                    <label className="mb-1 block text-sm font-bold text-gray-700">Employee Name</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-xl border-gray-300 shadow-sm transition focus:border-clay-500 focus:ring-clay-500"
                                        value={editData.name}
                                        onChange={(e) => setEditData('name', e.target.value)}
                                        required
                                    />
                                    {editErrors.name && <p className="mt-1 text-xs text-red-500">{editErrors.name}</p>}
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-bold text-gray-700">Position / Role</label>
                                    <select
                                        className="w-full rounded-xl border-gray-300 shadow-sm transition focus:border-clay-500 focus:ring-clay-500"
                                        value={editData.role}
                                        onChange={(e) => handleEditManualRoleChange(e.target.value)}
                                    >
                                        {EMPLOYEE_ROLE_OPTIONS.map((roleOption) => (
                                            <option key={roleOption}>{roleOption}</option>
                                        ))}
                                    </select>
                                    {editErrors.role && <p className="mt-1 text-xs text-red-500">{editErrors.role}</p>}
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-bold text-gray-700">Monthly Salary (PHP)</label>
                                    <input
                                        type="number"
                                        className="w-full rounded-xl border-gray-300 shadow-sm transition focus:border-clay-500 focus:ring-clay-500"
                                        value={editData.salary}
                                        onChange={(e) => setEditData('salary', e.target.value)}
                                        required
                                    />
                                    {editErrors.salary && <p className="mt-1 text-xs text-red-500">{editErrors.salary}</p>}
                                </div>
                            </div>
                        )}

                        {showLinkedLoginUpdateFields && (
                            <div className="space-y-5">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="md:col-span-2">
                                        <label className="mb-1 block text-sm font-bold text-gray-700">Employee Name</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-xl border-gray-300 shadow-sm transition focus:border-clay-500 focus:ring-clay-500"
                                            value={editData.name}
                                            onChange={(e) => setEditData('name', e.target.value)}
                                            required
                                        />
                                        {editErrors.name && <p className="mt-1 text-xs text-red-500">{editErrors.name}</p>}
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-bold text-gray-700">Email Address</label>
                                        <input
                                            type="email"
                                            className="w-full rounded-xl border-gray-300 shadow-sm transition focus:border-clay-500 focus:ring-clay-500"
                                            value={editData.email}
                                            onChange={(e) => setEditData('email', e.target.value)}
                                        />
                                        {editErrors.email && <p className="mt-1 text-xs text-red-500">{editErrors.email}</p>}
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-bold text-gray-700">
                                            {editingEmployee?.has_login_account ? 'Reset Password (Optional)' : 'Initial Password'}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showEditPassword ? 'text' : 'password'}
                                                className="w-full rounded-xl border-gray-300 pr-11 shadow-sm transition focus:border-clay-500 focus:ring-clay-500"
                                                placeholder={editingEmployee?.has_login_account ? 'Leave blank to keep current password' : 'Set initial password'}
                                                value={editData.default_password}
                                                onChange={(e) => setEditData('default_password', e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowEditPassword((value) => !value)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 transition hover:text-stone-600"
                                                aria-label={showEditPassword ? 'Hide password field' : 'Show password field'}
                                            >
                                                {showEditPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                        {editErrors.default_password && <p className="mt-1 text-xs text-red-500">{editErrors.default_password}</p>}
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="mb-1 block text-sm font-bold text-gray-700">Monthly Salary (PHP)</label>
                                        <input
                                            type="number"
                                            className="w-full rounded-xl border-gray-300 shadow-sm transition focus:border-clay-500 focus:ring-clay-500"
                                            value={editData.salary}
                                            onChange={(e) => setEditData('salary', e.target.value)}
                                            required
                                        />
                                        {editErrors.salary && <p className="mt-1 text-xs text-red-500">{editErrors.salary}</p>}
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-[#E7D8C9] bg-[#FCF7F2] px-4 py-3 text-xs leading-relaxed text-stone-600">
                                    Use the employee&apos;s active Gmail account. If you change the email, they&apos;ll need to verify it again. If you set a new password, they&apos;ll be asked to change it on next login.
                                </div>

                                {editErrors.role && <p className="mt-1 text-xs text-red-500">{editErrors.role}</p>}

                                <div className="rounded-2xl border border-stone-200 bg-white p-4">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700">Role Preset</label>
                                            <p className="mt-1 text-xs text-gray-500">Choose the closest access role, then adjust modules if needed.</p>
                                        </div>
                                        <span className="rounded-full border border-clay-200 bg-[#FCF7F2] px-3 py-1 text-[11px] font-bold text-clay-700">
                                            {presetLabelByKey[editData.staff_role_preset_key] || 'Custom'}
                                        </span>
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                        {rolePresets.map((preset) => (
                                            <RolePresetCard
                                                key={preset.key}
                                                preset={preset}
                                                radioName="edit_staff_role_preset_key"
                                                isSelected={editData.staff_role_preset_key === preset.key}
                                                onSelect={() => handleEditPresetChange(preset.key)}
                                            />
                                        ))}
                                    </div>
                                    {editErrors.staff_role_preset_key && <p className="mt-1 text-xs text-red-500">{editErrors.staff_role_preset_key}</p>}
                                </div>

                                <div className="rounded-2xl border border-stone-200 bg-white p-4">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700">Module Access Overrides</label>
                                            <p className="mt-1 text-xs text-gray-500">Turn modules on or off based on the employee&apos;s actual responsibilities.</p>
                                        </div>
                                        <span className="rounded-full border border-[#E7D8C9] bg-[#FCF7F2] px-3 py-1 text-[11px] font-bold text-clay-700">
                                            {Object.values(editData.module_overrides || {}).filter(Boolean).length} enabled
                                        </span>
                                    </div>
                                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                                        {availableModules.map((module) => (
                                            <label
                                                key={module.key}
                                                className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 transition ${
                                                    editData.module_overrides?.[module.key]
                                                        ? 'border-clay-300 bg-[#FCF7F2]'
                                                        : 'border-stone-200 bg-white hover:border-stone-300'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="mt-0.5 rounded border-gray-300 text-clay-600 focus:ring-clay-500"
                                                    checked={!!editData.module_overrides?.[module.key]}
                                                    onChange={() => toggleEditModuleOverride(module.key)}
                                                />
                                                <div className="min-w-0">
                                                    <div className="text-xs font-bold text-gray-900">{module.label}</div>
                                                    <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">{module.description}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                    {editErrors.module_overrides && <p className="mt-1 text-xs text-red-500">{editErrors.module_overrides}</p>}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 flex justify-end gap-3 border-t border-gray-100 pt-4">
                        <button type="button" onClick={closeEditModal} className="rounded-lg px-4 py-2 font-bold text-gray-500 transition hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" disabled={editProcessing} className="rounded-xl bg-clay-600 px-6 py-2 font-bold text-white transition hover:bg-clay-700 disabled:cursor-not-allowed disabled:opacity-70">
                            Update Record
                        </button>
                    </div>
                </form>
            </Modal>
            {/* PAYROLL MODAL (NEW) */}
            <Modal show={isPayrollModalOpen} onClose={() => setIsPayrollModalOpen(false)} maxWidth="5xl">
                <form onSubmit={submitPayroll} className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Generate Payroll</h2>
                            <p className="text-sm text-gray-500">Period: {payrollData.month} (Standard {sellerSettings.payroll_working_days || 22} Days/Month) - Fixed OT Rate: {formatPrecisePeso(sellerSettings.overtime_rate || 50)}/hr</p>
                        </div>
                        <button type="button" onClick={() => setIsPayrollModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                    </div>

                    <div className="mb-4 rounded-2xl border border-[#E7D8C9] bg-[#FCF7F2] px-4 py-3 text-xs leading-6 text-clay-700">
                        Attendance for {payrollData.month} now prefills absences, undertime, and overtime for linked staff logins. HR can still adjust the values before submitting payroll.
                    </div>

                    <div className="overflow-x-auto border border-gray-200 rounded-xl mb-6">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 font-bold text-gray-500 uppercase">
                                <tr>
                                    <th className="px-4 py-3 w-10 text-center border-r border-gray-100">Pay</th>
                                    <th className="px-4 py-3">Employee</th>
                                    <th className="px-4 py-3">Base Salary</th>
                                    <th className="px-4 py-3 w-28 bg-red-50/50 text-red-700" title="Deductions per day (Standard 8-hr shift). Reduces total days worked by 22.">Absences (Days)</th>
                                    <th className="px-4 py-3 w-28 bg-orange-50/50 text-orange-700" title="Deductions per hour. Reduces gross salary based on hourly rate.">Undertime (Hrs)</th>
                                    <th className="px-4 py-3 w-28 bg-[#F8EEE6] text-clay-700" title={`Fixed Rate: ${formatPrecisePeso(sellerSettings.overtime_rate || 50)}/hour`}>Overtime (Hrs)</th>
                                    <th className="px-4 py-3 text-right">Net Pay (Est)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {payrollData.items.map((item, index) => (
                                    <tr key={item.employee_id} className={`hover:bg-gray-50 transition ${!item.isSelected && 'opacity-50 grayscale'}`}>
                                        <td className="px-4 py-3 text-center border-r border-gray-100">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 text-clay-600 rounded border-gray-300 focus:ring-clay-500 cursor-pointer"
                                                checked={item.isSelected}
                                                onChange={(e) => updatePayrollItem(index, 'isSelected', e.target.checked)}
                                            />
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-900">
                                            <div>{item.name}</div>
                                            <div className="mt-1 text-[10px] font-medium text-gray-500">
                                                {item.has_attendance_source
                                                    ? `${item.attendance_days_worked || 0} attended day(s) used for prefill`
                                                    : 'Manual payroll entry - no linked attendance source'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 drop-shadow-sm font-semibold">{formatPeso(item.salary)}</td>
                                        
                                        <td className="px-4 py-3 bg-red-50/20">
                                            <input 
                                                type="number" 
                                                className="w-full border-red-200 bg-white shadow-inner rounded-lg text-sm p-1.5 focus:border-red-500 focus:ring-red-500 text-red-900 font-medium"
                                                value={item.absences_days ?? ''}
                                                disabled={!item.isSelected}
                                                onChange={(e) => updatePayrollItem(index, 'absences_days', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                                min="0" max="31" step="0.5"
                                            />
                                        </td>
                                        <td className="px-4 py-3 bg-orange-50/20">
                                            <input 
                                                type="number" 
                                                className="w-full border-orange-200 bg-white shadow-inner rounded-lg text-sm p-1.5 focus:border-orange-500 focus:ring-orange-500 text-orange-900 font-medium"
                                                value={item.undertime_hours ?? ''}
                                                disabled={!item.isSelected}
                                                onChange={(e) => updatePayrollItem(index, 'undertime_hours', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                                min="0" step="0.5"
                                            />
                                        </td>
                                        <td className="px-4 py-3 bg-[#FCF7F2]">
                                            <input 
                                                type="number" 
                                                className="w-full border-[#E7D8C9] bg-white shadow-inner rounded-lg text-sm p-1.5 focus:border-clay-500 focus:ring-clay-500 text-clay-900 font-medium"
                                                value={item.overtime_hours ?? ''}
                                                disabled={!item.isSelected}
                                                onChange={(e) => updatePayrollItem(index, 'overtime_hours', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                                min="0" step="0.5"
                                            />
                                        </td>

                                        <td className="px-4 py-3 text-right font-bold text-gray-900">
                                            {item.isSelected ? formatPrecisePeso(calculateNetPay(item)) : formatPrecisePeso(0)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-between items-center bg-[#FCF7F2] border border-[#E7D8C9] p-4 rounded-xl">
                        <span className="text-gray-500 font-medium">Selected For Payment: {payrollData.items.filter(i => i.isSelected).length}</span>
                        <div className="text-right">
                            <span className="text-gray-500 font-medium mr-3">Total Payroll Estimate:</span>
                            <span className="text-2xl font-bold text-clay-700">
                                {formatPrecisePeso(payrollData.items.filter(i => i.isSelected).reduce((acc, item) => acc + calculateNetPay(item), 0))}
                            </span>
                        </div>
                    </div>

                    <div className="mt-8 flex flex-col-reverse gap-3 pt-4 border-t border-gray-100 sm:flex-row sm:justify-end">
                        <button type="button" onClick={() => setIsPayrollModalOpen(false)} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-50 rounded-lg transition">Cancel</button>
                        <button type="submit" disabled={payrollProcessing || payrollData.items.filter(i => i.isSelected).length === 0} className="disabled:opacity-50 px-6 py-2 bg-clay-600 text-white rounded-xl font-bold hover:bg-clay-700 transition shadow-lg shadow-clay-200">
                            Request Pay
                        </button>
                    </div>
                </form>
            </Modal>

            {/* PAYROLL SETTINGS MODAL */}
            <Modal show={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} maxWidth="sm">
                <form onSubmit={submitSettings} className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Payroll Settings</h2>
                        <button type="button" onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Fixed Overtime Rate (PHP/hr)</label>
                            <input 
                                type="number" 
                                className="w-full border-gray-300 rounded-xl focus:border-clay-500 focus:ring-clay-500 shadow-sm transition" 
                                value={settingsData.overtime_rate ?? ''} 
                                onChange={e => setSettingsData('overtime_rate', e.target.value)} 
                                required min="0" step="any"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Standard Work Days / Month</label>
                            <input 
                                type="number" 
                                className="w-full border-gray-300 rounded-xl focus:border-clay-500 focus:ring-clay-500 shadow-sm transition" 
                                value={settingsData.payroll_working_days ?? ''} 
                                onChange={e => setSettingsData('payroll_working_days', e.target.value)} 
                                required min="1" max="31"
                            />
                        </div>
                    </div>

                    <div className="mt-8 flex flex-col-reverse gap-3 pt-4 border-t border-gray-100 sm:flex-row sm:justify-end">
                        <button type="button" onClick={() => setIsSettingsOpen(false)} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-50 rounded-lg transition">Cancel</button>
                        <button type="submit" disabled={settingsProcessing} className="px-6 py-2 bg-clay-600 text-white rounded-xl font-bold hover:bg-clay-700 transition shadow-lg shadow-clay-200">
                            Save Settings
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={closeConfirmModal}
                onConfirm={confirmDeleteAction}
                title={confirmModal.type === 'employee' ? 'Remove employee?' : 'Delete payroll request?'}
                message={confirmModal.type === 'employee'
                    ? 'This will remove the employee record and stop their payroll calculation.'
                    : 'This payroll request will be removed from the list.'}
                icon={Trash2}
                iconBg="bg-red-50 text-red-600"
                confirmText={confirmModal.type === 'employee' ? 'Remove' : 'Delete'}
                confirmColor="bg-red-600 hover:bg-red-700"
            />
        </div>
    );
}
