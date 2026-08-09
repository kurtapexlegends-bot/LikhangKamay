import React, { useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Printer, X, FileText, Building2, ShieldCheck, CheckCircle2 } from 'lucide-react';

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
    const voucherRefNumber = `PR-${payroll.id || '32'}-${item.id || '01'}`;

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
                        @page { size: A4 portrait; margin: 15mm; }
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1917; background: #fff; margin: 0; padding: 20px; -webkit-print-color-adjust: exact; }
                        .payslip-card { max-width: 680px; margin: 0 auto; border: 2px solid #e7e5e4; border-radius: 16px; padding: 28px; background: #fff; }
                        .header-row { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f5f5f4; pb-4; margin-bottom: 20px; }
                        .shop-title { font-size: 22px; font-weight: 900; color: #1c1917; margin: 0; }
                        .doc-badge { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #78716c; background: #f5f5f4; padding: 4px 10px; border-radius: 6px; }
                        .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
                        .info-box { background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 10px; padding: 10px 12px; }
                        .info-label { font-size: 9px; text-transform: uppercase; font-weight: 800; color: #a8a29e; letter-spacing: 0.08em; display: block; }
                        .info-val { font-size: 13px; font-weight: 800; color: #1c1917; margin-top: 2px; display: block; }
                        .columns-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
                        .panel-box { border: 1px solid #e7e5e4; border-radius: 12px; padding: 14px; background: #fff; }
                        .panel-title { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #57534e; margin-bottom: 10px; border-bottom: 1px solid #f5f5f4; padding-bottom: 6px; }
                        table { width: 100%; border-collapse: collapse; font-size: 12px; }
                        th { text-align: left; font-size: 9px; text-transform: uppercase; color: #a8a29e; font-weight: 800; padding: 6px 0; border-bottom: 1px solid #f5f5f4; }
                        td { padding: 8px 0; border-bottom: 1px dashed #f5f5f4; color: #292524; font-weight: 600; }
                        td.amount { text-align: right; font-weight: 800; }
                        .text-green { color: #15803d; }
                        .text-red { color: #be123c; }
                        .total-row { display: flex; justify-between: flex-end; padding-top: 8px; margin-top: 6px; font-size: 11px; font-weight: 800; border-top: 1px solid #e7e5e4; }
                        .net-hero { background: #faf6f0; border: 2px solid #e7d8c9; border-radius: 14px; padding: 18px; text-align: center; margin-bottom: 24px; }
                        .net-label { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.14em; color: #78716c; }
                        .net-amount { font-size: 30px; font-weight: 900; color: #844d2d; margin-top: 2px; }
                        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; pt-4; border-top: 1px solid #f5f5f4; margin-top: 20px; }
                        .sig-line { border-top: 1px solid #78716c; margin-top: 36px; pt-4; text-align: center; font-size: 11px; font-weight: 700; color: #44403c; }
                        .footer-note { font-size: 9px; color: #a8a29e; text-align: center; margin-top: 16px; font-weight: 600; }
                    </style>
                </head>
                <body>
                    <div class="payslip-card">
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
                    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto p-3 sm:p-6">
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
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-3xl bg-white border border-stone-200 p-5 sm:p-7 shadow-2xl transition-all">
                                {/* Top Modal Header & Controls */}
                                <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FCF7F2] text-clay-700 border border-[#E7D8C9] shadow-2xs">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-black text-stone-900 tracking-tight">Official Employee Payslip</h3>
                                            <p className="text-xs text-stone-500 font-medium">DOLE-PH Compliant Compensation Statement</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handlePrint}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-clay-700 hover:bg-clay-800 text-white text-xs font-bold transition-all shadow-xs active:scale-[0.98]"
                                        >
                                            <Printer size={15} />
                                            Print / Export PDF
                                        </button>
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="rounded-xl p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Printable Payslip Body */}
                                <div ref={printRef} className="space-y-5 text-stone-800">
                                    {/* Document Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                                        <div>
                                            <h2 className="text-xl font-black text-stone-900 tracking-tight">{sellerName || 'LikhangKamay Merchant'}</h2>
                                            <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mt-0.5">
                                                Official Compensation Statement · {payroll.month}
                                            </p>
                                        </div>
                                        <div className="text-left sm:text-right">
                                            <span className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-stone-600 border border-stone-200">
                                                <ShieldCheck size={12} className="text-emerald-600" />
                                                Ref: {voucherRefNumber}
                                            </span>
                                            <p className="text-[10px] text-stone-400 font-semibold mt-1">Status: Approved Disbursed</p>
                                        </div>
                                    </div>

                                    {/* Employee Info Cards Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                        <div className="rounded-xl bg-stone-50/80 p-3 border border-stone-200/60">
                                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-stone-400 block">Employee Name</span>
                                            <span className="text-xs font-bold text-stone-900 block mt-0.5 truncate">{item.employee_name}</span>
                                        </div>
                                        <div className="rounded-xl bg-stone-50/80 p-3 border border-stone-200/60">
                                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-stone-400 block">Role / Position</span>
                                            <span className="text-xs font-bold text-stone-900 block mt-0.5 truncate">{item.employee_role || 'Staff Operator'}</span>
                                        </div>
                                        <div className="rounded-xl bg-stone-50/80 p-3 border border-stone-200/60">
                                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-stone-400 block">Daily Rate</span>
                                            <span className="text-xs font-bold text-stone-900 block mt-0.5">{money(dailyRate)}</span>
                                        </div>
                                        <div className="rounded-xl bg-stone-50/80 p-3 border border-stone-200/60">
                                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-stone-400 block">Hourly Rate</span>
                                            <span className="text-xs font-bold text-stone-900 block mt-0.5">{money(hourlyRate)}</span>
                                        </div>
                                    </div>

                                    {/* Itemized Tables Side by Side */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Earnings Panel */}
                                        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 space-y-3 shadow-2xs">
                                            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                                                <h4 className="text-xs font-black uppercase tracking-wider text-stone-700">Gross Earnings</h4>
                                                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase">
                                                    Addition
                                                </span>
                                            </div>
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="border-b border-stone-100 text-[9px] uppercase font-bold text-stone-400">
                                                        <th className="py-1 text-left">Item</th>
                                                        <th className="py-1 text-center">Hours/Days</th>
                                                        <th className="py-1 text-right">Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-stone-100">
                                                    <tr>
                                                        <td className="py-2 font-medium text-stone-800">Base Salary</td>
                                                        <td className="py-2 text-center text-stone-500">{item.days_worked || 0}d worked</td>
                                                        <td className="py-2 text-right font-bold text-stone-900">{money(item.base_salary)}</td>
                                                    </tr>
                                                    {Number(item.overtime_pay || 0) > 0 && (
                                                        <tr>
                                                            <td className="py-2 font-medium text-stone-800">Reg Overtime (125%)</td>
                                                            <td className="py-2 text-center text-stone-500">{meta.overtime || item.overtime_hours || 0} hrs</td>
                                                            <td className="py-2 text-right font-bold text-emerald-700">+{money(item.overtime_pay)}</td>
                                                        </tr>
                                                    )}
                                                    {Number(item.rest_day_ot_pay || 0) > 0 && (
                                                        <tr>
                                                            <td className="py-2 font-medium text-stone-800">Rest Day OT (169%)</td>
                                                            <td className="py-2 text-center text-stone-500">{meta.rest_day_ot || item.rest_day_ot_hours || 0} hrs</td>
                                                            <td className="py-2 text-right font-bold text-emerald-700">+{money(item.rest_day_ot_pay)}</td>
                                                        </tr>
                                                    )}
                                                    {Number(item.holiday_ot_pay || 0) > 0 && (
                                                        <tr>
                                                            <td className="py-2 font-medium text-stone-800">Holiday OT (260%)</td>
                                                            <td className="py-2 text-center text-stone-500">{meta.holiday_ot || item.holiday_ot_hours || 0} hrs</td>
                                                            <td className="py-2 text-right font-bold text-emerald-700">+{money(item.holiday_ot_pay)}</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                            <div className="flex justify-between items-center pt-2 border-t border-stone-100 text-xs font-extrabold text-stone-900">
                                                <span>Total Gross Pay</span>
                                                <span className="text-emerald-700">{money(grossPay)}</span>
                                            </div>
                                        </div>

                                        {/* Deductions Panel */}
                                        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 space-y-3 shadow-2xs">
                                            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                                                <h4 className="text-xs font-black uppercase tracking-wider text-stone-700">Deductions</h4>
                                                <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 uppercase">
                                                    Subtractions
                                                </span>
                                            </div>
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="border-b border-stone-100 text-[9px] uppercase font-bold text-stone-400">
                                                        <th className="py-1 text-left">Item</th>
                                                        <th className="py-1 text-center">Count</th>
                                                        <th className="py-1 text-right">Deduction</th>
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
                                                            <td className="py-2 text-right font-semibold text-stone-400">{money(0)}</td>
                                                        </tr>
                                                    )}
                                                    {Number(item.undertime_deduction || 0) > 0 ? (
                                                        <tr>
                                                            <td className="py-2 font-medium text-stone-800">Undertime / Tardiness</td>
                                                            <td className="py-2 text-center text-stone-500">{item.undertime_hours || 0} hrs</td>
                                                            <td className="py-2 text-right font-bold text-rose-700">-{money(item.undertime_deduction)}</td>
                                                        </tr>
                                                    ) : (
                                                        <tr>
                                                            <td className="py-2 font-medium text-stone-800">Undertime / Tardiness</td>
                                                            <td className="py-2 text-center text-stone-400">0 hrs</td>
                                                            <td className="py-2 text-right font-semibold text-stone-400">{money(0)}</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                            <div className="flex justify-between items-center pt-2 border-t border-stone-100 text-xs font-extrabold text-stone-900">
                                                <span>Total Deductions</span>
                                                <span className="text-rose-700">-{money(totalDeductions)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Net Take-Home Pay Hero Section */}
                                    <div className="rounded-2xl bg-[#FAF6F0] border-2 border-[#E7D8C9] p-5 text-center shadow-xs">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 block">Net Take-Home Pay</span>
                                        <span className="text-3xl font-black text-clay-800 block mt-1 tracking-tight">{money(netPay)}</span>
                                        <p className="text-[10px] text-stone-500 font-semibold mt-1">
                                            Disbursed via Approved Payroll Run · {payroll.month}
                                        </p>
                                    </div>

                                    {/* Official Signatures Block */}
                                    <div className="pt-4 border-t border-stone-100">
                                        <div className="grid grid-cols-2 gap-8 text-center">
                                            <div>
                                                <div className="border-t border-stone-400 pt-2 mt-8">
                                                    <p className="text-xs font-bold text-stone-800">{item.employee_name}</p>
                                                    <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider mt-0.5">Employee Signature (Received in Full)</p>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="border-t border-stone-400 pt-2 mt-8">
                                                    <p className="text-xs font-bold text-stone-800">{sellerName || 'LikhangKamay Management'}</p>
                                                    <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider mt-0.5">Authorized Employer Signature</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Compliance Footer */}
                                    <div className="text-[10px] text-stone-400 text-center border-t border-stone-100 pt-3 font-medium">
                                        Official compensation document issued pursuant to DOLE Labor Code of the Philippines (Art. 103). Verified by LikhangKamay ERP Engine.
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
