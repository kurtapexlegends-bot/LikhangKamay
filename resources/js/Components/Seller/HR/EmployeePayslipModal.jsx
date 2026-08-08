import React, { useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Printer, X, FileText, Building2, CheckCircle2 } from 'lucide-react';

const money = (value) => new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
}).format(Number(value || 0));

export default function EmployeePayslipModal({ item, payroll, sellerName, isOpen, onClose }) {
    const printRef = useRef(null);

    if (!item || !payroll) return null;

    const meta = item.meta || {};
    const dailyRate = Number(meta.daily_rate || (item.base_salary ? item.base_salary / 22 : 0));
    const hourlyRate = Number(meta.hourly_rate || (dailyRate / 8));
    const totalOt = Number(item.overtime_pay || 0) + Number(item.rest_day_ot_pay || 0) + Number(item.holiday_ot_pay || 0);
    const totalDeductions = Number(item.absence_deduction || 0) + Number(item.undertime_deduction || 0);
    const grossPay = Number(item.base_salary || 0) + totalOt;
    const netPay = Number(item.net_pay || 0);

    const handlePrint = () => {
        const content = printRef.current;
        if (!content) return;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Payslip - ${item.employee_name} (${payroll.month})</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1c1917; background: #fff; }
                        .payslip-container { max-width: 650px; margin: 0 auto; border: 1px solid #e7e5e4; border-radius: 16px; padding: 32px; }
                        .header { text-align: center; border-bottom: 2px solid #f5f5f4; padding-bottom: 20px; margin-bottom: 24px; }
                        .shop-name { font-size: 20px; font-weight: 800; color: #1c1917; margin: 0; }
                        .subtitle { font-size: 12px; color: #78716c; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; }
                        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
                        .field-box { background: #fafaf9; border: 1px solid #f5f5f4; border-radius: 12px; padding: 12px 16px; }
                        .field-label { font-size: 10px; text-transform: uppercase; color: #a8a29e; font-weight: 800; letter-spacing: 0.05em; }
                        .field-value { font-size: 14px; font-weight: 700; color: #1c1917; margin-top: 2px; }
                        .section-title { font-size: 11px; text-transform: uppercase; color: #78716c; font-weight: 800; letter-spacing: 0.08em; border-bottom: 1px solid #f5f5f4; padding-bottom: 8px; margin-top: 24px; margin-bottom: 12px; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
                        th { text-align: left; font-size: 10px; text-transform: uppercase; color: #a8a29e; font-weight: 800; padding: 8px 0; border-bottom: 1px solid #f5f5f4; }
                        td { padding: 10px 0; border-bottom: 1px dashed #f5f5f4; color: #292524; font-weight: 500; }
                        td.amount { text-align: right; font-weight: 700; }
                        .text-red { color: #dc2626; }
                        .text-green { color: #16a34a; }
                        .net-pay-box { background: #fcfaf8; border: 2px solid #e7d8c9; border-radius: 16px; padding: 20px; text-align: center; margin-top: 24px; }
                        .net-pay-label { font-size: 11px; text-transform: uppercase; font-weight: 800; color: #78716c; letter-spacing: 0.1em; }
                        .net-pay-amount { font-size: 28px; font-weight: 900; color: #844d2d; margin-top: 4px; }
                        .footer { font-size: 10px; color: #a8a29e; text-align: center; margin-top: 32px; border-top: 1px solid #f5f5f4; pt: 16px; }
                    </style>
                </head>
                <body>
                    <div class="payslip-container">
                        ${content.innerHTML}
                    </div>
                    <script>
                        window.onload = () => { window.print(); window.close(); };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50 font-sans" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    <div className="flex min-h-full items-center justify-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-[28px] bg-white border border-stone-200/80 p-6 sm:p-8 shadow-2xl transition-all">
                                {/* Header Controls */}
                                <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-6">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-clay-50 text-clay-700 border border-clay-100">
                                            <FileText size={18} />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-black text-stone-900 tracking-tight">Official Employee Payslip</h3>
                                            <p className="text-xs text-stone-500 font-medium">DOLE Compliant Earnings Breakdown</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handlePrint}
                                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-clay-600 hover:bg-clay-700 text-white text-xs font-bold transition-all shadow-xs active:scale-[0.98]"
                                        >
                                            <Printer size={14} />
                                            Print / PDF
                                        </button>
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="rounded-xl p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Printable Area */}
                                <div ref={printRef} className="space-y-6">
                                    <div className="header text-center border-b border-stone-100 pb-4">
                                        <h2 className="shop-name text-xl font-black text-stone-900">{sellerName || 'LikhangKamay Merchant'}</h2>
                                        <p className="subtitle text-[10px] font-extrabold uppercase tracking-widest text-stone-400 mt-1">
                                            Official Compensation Statement • {payroll.month}
                                        </p>
                                    </div>

                                    {/* Employee Info Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="field-box bg-stone-50/60 p-3 rounded-xl border border-stone-200/60">
                                            <span className="field-label text-[9px] font-extrabold uppercase tracking-wider text-stone-400 block">Employee Name</span>
                                            <span className="field-value text-xs font-bold text-stone-900 block mt-0.5">{item.employee_name}</span>
                                        </div>
                                        <div className="field-box bg-stone-50/60 p-3 rounded-xl border border-stone-200/60">
                                            <span className="field-label text-[9px] font-extrabold uppercase tracking-wider text-stone-400 block">Role / Position</span>
                                            <span className="field-value text-xs font-bold text-stone-900 block mt-0.5">{item.employee_role || 'Staff Operator'}</span>
                                        </div>
                                        <div className="field-box bg-stone-50/60 p-3 rounded-xl border border-stone-200/60">
                                            <span className="field-label text-[9px] font-extrabold uppercase tracking-wider text-stone-400 block">Daily Rate</span>
                                            <span className="field-value text-xs font-bold text-stone-900 block mt-0.5">{money(dailyRate)}</span>
                                        </div>
                                        <div className="field-box bg-stone-50/60 p-3 rounded-xl border border-stone-200/60">
                                            <span className="field-label text-[9px] font-extrabold uppercase tracking-wider text-stone-400 block">Hourly Rate</span>
                                            <span className="field-value text-xs font-bold text-stone-900 block mt-0.5">{money(hourlyRate)}</span>
                                        </div>
                                    </div>

                                    {/* Earnings Breakdown */}
                                    <div>
                                        <h4 className="section-title text-xs font-black uppercase tracking-wider text-stone-500 mb-2 border-b border-stone-100 pb-1">
                                            Earnings & Compensation
                                        </h4>
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-stone-100 text-[10px] uppercase font-bold text-stone-400">
                                                    <th className="py-1.5 text-left font-bold">Item Description</th>
                                                    <th className="py-1.5 text-center font-bold">Days / Hours</th>
                                                    <th className="py-1.5 text-right font-bold">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-stone-100">
                                                <tr>
                                                    <td className="py-2 font-medium text-stone-800">Base Monthly Salary</td>
                                                    <td className="py-2 text-center text-stone-500">{item.days_worked || 0} days worked</td>
                                                    <td className="py-2 text-right font-bold text-stone-900">{money(item.base_salary)}</td>
                                                </tr>
                                                {Number(item.overtime_pay || 0) > 0 && (
                                                    <tr>
                                                        <td className="py-2 font-medium text-stone-800">Regular Overtime (125%)</td>
                                                        <td className="py-2 text-center text-stone-500">{meta.overtime || item.overtime_hours || 0} hrs</td>
                                                        <td className="py-2 text-right font-bold text-emerald-700">+{money(item.overtime_pay)}</td>
                                                    </tr>
                                                )}
                                                {Number(item.rest_day_ot_pay || 0) > 0 && (
                                                    <tr>
                                                        <td className="py-2 font-medium text-stone-800">Rest Day Overtime (169%)</td>
                                                        <td className="py-2 text-center text-stone-500">{meta.rest_day_ot || item.rest_day_ot_hours || 0} hrs</td>
                                                        <td className="py-2 text-right font-bold text-emerald-700">+{money(item.rest_day_ot_pay)}</td>
                                                    </tr>
                                                )}
                                                {Number(item.holiday_ot_pay || 0) > 0 && (
                                                    <tr>
                                                        <td className="py-2 font-medium text-stone-800">Holiday Overtime (260%)</td>
                                                        <td className="py-2 text-center text-stone-500">{meta.holiday_ot || item.holiday_ot_hours || 0} hrs</td>
                                                        <td className="py-2 text-right font-bold text-emerald-700">+{money(item.holiday_ot_pay)}</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Deductions Breakdown */}
                                    <div>
                                        <h4 className="section-title text-xs font-black uppercase tracking-wider text-stone-500 mb-2 border-b border-stone-100 pb-1">
                                            Deductions & Adjustments
                                        </h4>
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-stone-100 text-[10px] uppercase font-bold text-stone-400">
                                                    <th className="py-1.5 text-left font-bold">Item Description</th>
                                                    <th className="py-1.5 text-center font-bold">Count</th>
                                                    <th className="py-1.5 text-right font-bold">Deduction</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-stone-100">
                                                {Number(item.absence_deduction || 0) > 0 ? (
                                                    <tr>
                                                        <td className="py-2 font-medium text-stone-800">Unpaid Absences</td>
                                                        <td className="py-2 text-center text-stone-500">{item.absences_days || 0} days</td>
                                                        <td className="py-2 text-right font-bold text-rose-700">-{money(item.absence_deduction)}</td>
                                                    </tr>
                                                ) : (
                                                    <tr>
                                                        <td className="py-2 font-medium text-stone-800">Unpaid Absences</td>
                                                        <td className="py-2 text-center text-stone-400">0 days</td>
                                                        <td className="py-2 text-right font-bold text-stone-400">{money(0)}</td>
                                                    </tr>
                                                )}
                                                {Number(item.undertime_deduction || 0) > 0 && (
                                                    <tr>
                                                        <td className="py-2 font-medium text-stone-800">Undertime / Tardiness</td>
                                                        <td className="py-2 text-center text-stone-500">{item.undertime_hours || 0} hrs</td>
                                                        <td className="py-2 text-right font-bold text-rose-700">-{money(item.undertime_deduction)}</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Net Take-Home Pay Box */}
                                    <div className="net-pay-box bg-[#FCF8F5] border-2 border-[#E7D8C9] rounded-2xl p-5 text-center">
                                        <span className="net-pay-label text-[10px] font-black uppercase tracking-widest text-stone-500 block">Net Take-Home Pay</span>
                                        <span className="net-pay-amount text-3xl font-black text-clay-800 block mt-1">{money(netPay)}</span>
                                        <p className="text-[10px] text-stone-400 font-semibold mt-1">Disbursed via Approved Payroll Run • {payroll.run_number || 'PR-001'}</p>
                                    </div>

                                    <div className="footer text-[10px] text-stone-400 text-center border-t border-stone-100 pt-3">
                                        This statement is computer-generated by LikhangKamay ERP System. No physical signature required.
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
