import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import SellerHeader from '@/Layouts/SellerHeader';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import { ArrowLeft, Banknote, CalendarDays, Clock3, Users, ChevronDown, ChevronUp } from 'lucide-react';

const money = (value) => new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
}).format(Number(value || 0));

const shortDateTime = (value) => value
    ? new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(value))
    : '-';

function SummaryCard({ label, value, icon: Icon }) {
    return (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{label}</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-stone-900">{value}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FCF7F2] text-clay-700">
                    <Icon size={20} />
                </div>
            </div>
        </div>
    );
}

export default function PayrollRunShow({ payroll }) {
    const { auth } = usePage().props;
    const { openSidebar } = useSellerWorkspaceShell();
    const [expandedRows, setExpandedRows] = React.useState({});

    const toggleExpandedRow = (id) => {
        setExpandedRows(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const getBreakdown = (item) => {
        if (!item.meta) {
            const base = Number(item.base_salary || 0);
            const daily = base / 22; // default fallback
            const hourly = daily / 8;
            return {
                dailyRate: daily,
                hourlyRate: hourly,
                formulaText: `₱${base.toLocaleString()} / 22 (Fallback)`,
                regularOtRate: hourly * 1.25,
                restDayOtRate: hourly * 1.69,
                holidayOtRate: hourly * 2.60,
                regularOtPay: Number(item.overtime_pay || 0),
                restDayOtPay: Number(item.rest_day_ot_pay || 0),
                holidayOtPay: Number(item.holiday_ot_pay || 0),
                totalOtPay: Number(item.overtime_pay || 0) + Number(item.rest_day_ot_pay || 0) + Number(item.holiday_ot_pay || 0),
                absenceDeduction: Number(item.absence_deduction || 0),
                undertimeDeduction: Number(item.undertime_deduction || 0),
                net: Number(item.net_pay || 0)
            };
        }

        const meta = item.meta;
        const dailyRate = Number(meta.daily_rate || 0);
        const hourlyRate = Number(meta.hourly_rate || 0);
        
        let formulaText = '';
        if (meta.factor_method === '261') {
            formulaText = `(₱${Number(item.base_salary).toLocaleString()} * 12) / 261`;
        } else if (meta.factor_method === '313') {
            formulaText = `(₱${Number(item.base_salary).toLocaleString()} * 12) / 313`;
        } else {
            formulaText = `₱${Number(item.base_salary).toLocaleString()} / ${meta.working_days || 22}`;
        }

        const regularOtRate = hourlyRate * Number(meta.overtime_multiplier || 1.25);
        const restDayOtRate = hourlyRate * Number(meta.rest_day_ot_multiplier || 1.69);
        const holidayOtRate = hourlyRate * Number(meta.holiday_ot_multiplier || 2.60);

        const regularOtPay = Number(item.overtime_pay || 0);
        const restDayOtPay = Number(item.rest_day_ot_pay || 0);
        const holidayOtPay = Number(item.holiday_ot_pay || 0);
        const totalOtPay = regularOtPay + restDayOtPay + holidayOtPay;

        const absenceDeduction = Number(item.absence_deduction || 0);
        const undertimeDeduction = Number(item.undertime_deduction || 0);

        return {
            dailyRate,
            hourlyRate,
            formulaText,
            regularOtRate,
            restDayOtRate,
            holidayOtRate,
            regularOtPay,
            restDayOtPay,
            holidayOtPay,
            totalOtPay,
            absenceDeduction,
            undertimeDeduction,
            net: Number(item.net_pay || 0)
        };
    };

    return (
        <div className="min-h-screen bg-[#FDFBF9]">
            <Head title={`Payroll ${payroll?.month || ''}`} />

            <SellerHeader
                title="Payroll Run"
                subtitle="Review staff payroll items and release payouts."
                auth={auth}
                onMenuClick={openSidebar}
                badge={{ label: 'Enterprise', iconColor: 'text-emerald-400' }}
                actions={(
                    <Link
                        href={route('hr.index')}
                        className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-bold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50"
                    >
                        <ArrowLeft size={16} />
                        Back to People & Payroll
                    </Link>
                )}
            />

            <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <div className="grid gap-4 md:grid-cols-3">
                    <SummaryCard label="Payroll Month" value={payroll?.month || '-'} icon={CalendarDays} />
                    <SummaryCard label="Employees" value={String(payroll?.employee_count || 0)} icon={Users} />
                    <SummaryCard label="Total Amount" value={money(payroll?.total_amount)} icon={Banknote} />
                </div>

                <div className="mt-6 rounded-2xl border border-stone-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-stone-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-stone-900">{payroll?.run_number || 'Payroll Run'}</h2>
                            <p className="mt-1 text-sm text-stone-500">
                                Status: <span className="font-semibold text-stone-700">{payroll?.status || 'Pending'}</span>
                            </p>
                            {payroll?.notes && (
                                <p className="mt-2 text-sm leading-6 text-stone-600">{payroll.notes}</p>
                            )}
                        </div>

                        <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-600">
                            <div className="flex items-center gap-2 font-semibold text-stone-700">
                                <Clock3 size={14} />
                                Timeline
                            </div>
                            <div className="mt-2 space-y-1.5">
                                <p>Created: <span className="font-medium text-stone-800">{shortDateTime(payroll?.created_at)}</span></p>
                                <p>Submitted: <span className="font-medium text-stone-800">{shortDateTime(payroll?.submitted_at)}</span></p>
                                <p>Updated: <span className="font-medium text-stone-800">{shortDateTime(payroll?.updated_at)}</span></p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 border-b border-stone-100 px-5 py-4 md:grid-cols-4">
                        <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Base Pay</p>
                            <p className="mt-1 text-base font-bold text-stone-900">{money(payroll?.summary?.base_pay)}</p>
                        </div>
                        <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Deductions</p>
                            <p className="mt-1 text-base font-bold text-stone-900">{money(payroll?.summary?.deductions)}</p>
                        </div>
                        <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Overtime</p>
                            <p className="mt-1 text-base font-bold text-stone-900">{money(payroll?.summary?.overtime)}</p>
                        </div>
                        <div className="rounded-xl border border-[#E7D8C9] bg-[#FCF7F2] px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Net Pay</p>
                            <p className="mt-1 text-base font-bold text-clay-800">{money(payroll?.summary?.net_pay)}</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px]">
                            <thead className="bg-[#FAF9F7]">
                                <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-stone-400">
                                    <th className="px-5 py-3">Employee</th>
                                    <th className="px-5 py-3">Base Salary</th>
                                    <th className="px-5 py-3">Absences & Leaves</th>
                                    <th className="px-5 py-3">Absence Deduction</th>
                                    <th className="px-5 py-3">Undertime</th>
                                    <th className="px-5 py-3">Overtime Details</th>
                                    <th className="px-5 py-3 text-right">Net Pay</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {(payroll?.line_items || []).map((item) => {
                                    const breakdown = getBreakdown(item);
                                    return (
                                        <React.Fragment key={item.id}>
                                            <tr className="text-sm text-stone-700 hover:bg-stone-50/50 transition">
                                                <td className="px-5 py-4">
                                                    <div className="font-bold text-stone-900">{item.employee_name}</div>
                                                    {item.employee_role && (
                                                        <div className="mt-1 text-xs text-stone-500">{item.employee_role}</div>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleExpandedRow(item.id)}
                                                        className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-clay-600 hover:text-clay-700 transition underline"
                                                    >
                                                        {expandedRows[item.id] ? (
                                                            <>
                                                                <ChevronUp size={12} />
                                                                Hide Calculation Details
                                                            </>
                                                        ) : (
                                                            <>
                                                                <ChevronDown size={12} />
                                                                Show Calculation Details
                                                            </>
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="px-5 py-4 font-semibold">{money(item.base_salary)}</td>
                                                <td className="px-5 py-4">
                                                    <div>{item.absences_days}d Unpaid</div>
                                                    {Number(item.paid_leave_days || 0) > 0 && (
                                                        <div className="mt-0.5 text-xs text-emerald-600 font-semibold">{item.paid_leave_days}d Paid</div>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4">{money(item.absence_deduction)}</td>
                                                <td className="px-5 py-4">{item.undertime_hours} hr</td>
                                                <td className="px-5 py-4">
                                                    <div>{item.overtime_hours} hr Reg / {money(item.overtime_pay)}</div>
                                                    {Number(item.rest_day_ot_hours || 0) > 0 && (
                                                        <div className="text-xs text-stone-500 mt-0.5">{item.rest_day_ot_hours} hr Rest / {money(item.rest_day_ot_pay)}</div>
                                                    )}
                                                    {Number(item.holiday_ot_hours || 0) > 0 && (
                                                        <div className="text-xs text-stone-500 mt-0.5">{item.holiday_ot_hours} hr Holiday / {money(item.holiday_ot_pay)}</div>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4 text-right font-bold text-stone-900">{money(item.net_pay)}</td>
                                            </tr>
                                            {expandedRows[item.id] && (
                                                <tr key={`breakdown-row-${item.id}`} className="bg-stone-50/50">
                                                    <td colSpan={7} className="px-5 py-4 border-l border-r border-b border-stone-100">
                                                        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm text-xs space-y-3 max-w-3xl mx-auto">
                                                            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                                                                <h4 className="font-bold text-stone-900">Payroll Calculation Transparency Details</h4>
                                                                <span className="text-[10px] font-bold text-clay-600 bg-clay-50 px-2 py-0.5 rounded-md">Audited Formula Breakdown</span>
                                                            </div>
                                                            
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <div className="space-y-2">
                                                                    <h5 className="font-bold text-stone-700 text-[10px] uppercase tracking-wider">Rate Calculations</h5>
                                                                    <div className="space-y-1 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                                                                        <div className="flex justify-between">
                                                                            <span className="text-stone-500">Daily Rate Formula:</span>
                                                                            <span className="font-semibold text-stone-800">{breakdown.formulaText}</span>
                                                                        </div>
                                                                        <div className="flex justify-between border-b border-stone-200/50 pb-1.5 mb-1.5">
                                                                            <span className="text-stone-500">Daily Rate:</span>
                                                                            <span className="font-bold text-stone-900">{money(breakdown.dailyRate)}</span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span className="text-stone-500">Hourly Rate Formula:</span>
                                                                            <span className="font-semibold text-stone-800">Daily Rate / 8 Hours</span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span className="text-stone-500">Hourly Rate:</span>
                                                                            <span className="font-bold text-stone-900">{money(breakdown.hourlyRate)}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <h5 className="font-bold text-stone-700 text-[10px] uppercase tracking-wider">Overtime Premiums</h5>
                                                                    <div className="space-y-1 bg-[#FCF7F2] p-2.5 rounded-xl border border-[#E7D8C9]/60">
                                                                        <div className="flex justify-between">
                                                                            <span className="text-stone-500">Regular OT Rate:</span>
                                                                            <span className="font-semibold text-stone-800">{money(breakdown.regularOtRate)}/hr</span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span className="text-stone-500">Rest Day OT Rate:</span>
                                                                            <span className="font-semibold text-stone-800">{money(breakdown.restDayOtRate)}/hr</span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span className="text-stone-500">Holiday OT Rate:</span>
                                                                            <span className="font-semibold text-stone-800">{money(breakdown.holidayOtRate)}/hr</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="border-t border-stone-100 pt-3 flex flex-col gap-2">
                                                                <h5 className="font-bold text-stone-700 text-[10px] uppercase tracking-wider">Earnings & Deductions Summary</h5>
                                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                                    <div className="bg-stone-50 p-2 rounded-xl border border-stone-100">
                                                                        <span className="text-[10px] text-stone-400 block font-semibold uppercase">Regular Salary</span>
                                                                        <span className="font-bold text-stone-700">{money(item.base_salary)}</span>
                                                                    </div>
                                                                    <div className="bg-emerald-50/50 p-2 rounded-xl border border-emerald-100">
                                                                        <span className="text-[10px] text-emerald-600 block font-semibold uppercase">Total Overtime Pay</span>
                                                                        <span className="font-bold text-emerald-700">+{money(breakdown.totalOtPay)}</span>
                                                                        <div className="text-[9px] text-stone-400 mt-0.5 space-y-0.5">
                                                                            {item.overtime_hours > 0 && <div>Reg: {item.overtime_hours}h x {money(breakdown.regularOtRate)}</div>}
                                                                            {item.rest_day_ot_hours > 0 && <div>Rest: {item.rest_day_ot_hours}h x {money(breakdown.restDayOtRate)}</div>}
                                                                            {item.holiday_ot_hours > 0 && <div>Hol: {item.holiday_ot_hours}h x {money(breakdown.holidayOtRate)}</div>}
                                                                        </div>
                                                                    </div>
                                                                    <div className="bg-red-50/50 p-2 rounded-xl border border-red-100">
                                                                        <span className="text-[10px] text-red-600 block font-semibold uppercase">Total Deductions</span>
                                                                        <span className="font-bold text-red-700">-{money(breakdown.absenceDeduction + breakdown.undertimeDeduction)}</span>
                                                                        <div className="text-[9px] text-stone-400 mt-0.5 space-y-0.5">
                                                                            {item.absences_days > 0 && <div>Absences: {item.absences_days}d x {money(breakdown.dailyRate)}</div>}
                                                                            {item.undertime_hours > 0 && <div>Undertime: {item.undertime_hours}h x {money(breakdown.hourlyRate)}</div>}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex justify-between items-center bg-stone-900 text-white p-3 rounded-xl mt-1">
                                                                    <span className="font-bold text-xs tracking-wide uppercase">Formula: Salary + OT Pay - Deductions</span>
                                                                    <div className="text-right">
                                                                        <span className="text-[9px] block text-stone-400 font-semibold">NET WAGE PAID</span>
                                                                        <span className="font-bold text-base text-clay-400">{money(breakdown.net)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
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

                    {payroll?.rejection_reason && (
                        <div className="border-t border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
                            <span className="font-bold">Rejection reason:</span> {payroll.rejection_reason}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

PayrollRunShow.layout = (page) => <SellerWorkspaceLayout active="hr">{page}</SellerWorkspaceLayout>;
