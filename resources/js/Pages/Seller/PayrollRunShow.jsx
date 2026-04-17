import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import SellerHeader from '@/Components/SellerHeader';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import { ArrowLeft, Banknote, CalendarDays, Clock3, Users } from 'lucide-react';

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

    return (
        <div className="min-h-screen bg-[#FDFBF9]">
            <Head title={`Payroll ${payroll?.month || ''}`} />

            <SellerHeader
                title="Payroll Run"
                subtitle="Review the generated payroll request and its line items."
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
                                    <th className="px-5 py-3">Absences</th>
                                    <th className="px-5 py-3">Absence Deduction</th>
                                    <th className="px-5 py-3">Undertime</th>
                                    <th className="px-5 py-3">Overtime</th>
                                    <th className="px-5 py-3 text-right">Net Pay</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {(payroll?.line_items || []).map((item) => (
                                    <tr key={item.id} className="text-sm text-stone-700">
                                        <td className="px-5 py-4">
                                            <div className="font-bold text-stone-900">{item.employee_name}</div>
                                            {item.employee_role && (
                                                <div className="mt-1 text-xs text-stone-500">{item.employee_role}</div>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 font-semibold">{money(item.base_salary)}</td>
                                        <td className="px-5 py-4">{item.absences_days}</td>
                                        <td className="px-5 py-4">{money(item.absence_deduction)}</td>
                                        <td className="px-5 py-4">{item.undertime_hours} hr</td>
                                        <td className="px-5 py-4">{item.overtime_hours} hr / {money(item.overtime_pay)}</td>
                                        <td className="px-5 py-4 text-right font-bold text-stone-900">{money(item.net_pay)}</td>
                                    </tr>
                                ))}
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
