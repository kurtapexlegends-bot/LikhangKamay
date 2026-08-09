import React, { useRef } from 'react';
import { Printer, X, FileText, CheckCircle2, Building2, UserCheck } from 'lucide-react';
import Modal from '@/Components/Modal';

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
    const payslipRefNo = `PS-${payroll.id || '32'}-${item.id || '01'}`;

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
                        @page { size: A4 portrait; margin: 12mm; }
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1917; background: #fff; margin: 0; padding: 20px; -webkit-print-color-adjust: exact; }
                        .payslip-container { max-width: 680px; margin: 0 auto; border: 1.5px solid #d6d3d1; border-radius: 12px; padding: 24px; background: #fff; }
                        .top-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e7e5e4; padding-bottom: 12px; margin-bottom: 16px; }
                        .shop-name { font-size: 20px; font-weight: 800; color: #1c1917; margin: 0; }
                        .doc-title { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #78716c; margin-top: 2px; }
                        .ref-no { font-size: 11px; font-weight: 700; color: #44403c; text-align: right; }
                        .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 18px; }
                        .info-cell { background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 8px; padding: 8px 10px; }
                        .info-cell label { font-size: 9px; font-weight: 800; text-transform: uppercase; color: #a8a29e; letter-spacing: 0.05em; display: block; }
                        .info-cell span { font-size: 12px; font-weight: 700; color: #1c1917; display: block; margin-top: 2px; }
                        .cols-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px; }
                        .panel { border: 1px solid #e7e5e4; border-radius: 10px; padding: 12px; background: #fff; }
                        .panel-header { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #57534e; border-bottom: 1px solid #f5f5f4; padding-bottom: 6px; margin-bottom: 8px; display: flex; justify-content: space-between; }
                        table { width: 100%; border-collapse: collapse; font-size: 11px; }
                        th { text-align: left; font-size: 9px; font-weight: 800; text-transform: uppercase; color: #a8a29e; padding: 4px 0; border-bottom: 1px solid #f5f5f4; }
                        td { padding: 6px 0; border-bottom: 1px dashed #f5f5f4; color: #292524; font-weight: 500; }
                        td.amount { text-align: right; font-weight: 700; }
                        .text-green { color: #15803d; }
                        .text-red { color: #be123c; }
                        .net-card { background: #faf6f0; border: 1.5px solid #e7d8c9; border-radius: 10px; padding: 14px; text-align: center; margin-bottom: 18px; }
                        .net-card label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #78716c; }
                        .net-card .amount { font-size: 26px; font-weight: 900; color: #844d2d; margin-top: 2px; }
                        .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #f5f5f4; }
                        .sig-box { text-align: center; }
                        .sig-line { border-top: 1px solid #78716c; margin-top: 32px; padding-top: 4px; font-size: 10px; font-weight: 700; color: #44403c; }
                        .doc-footer { font-size: 8.5px; color: #a8a29e; text-align: center; margin-top: 14px; font-weight: 500; }
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
        <Modal show={isOpen} onClose={onClose} maxWidth="2xl">
            <div className="p-5 sm:p-6 bg-white space-y-5 rounded-2xl">
                {/* Header Controls */}
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FCF7F2] text-clay-700 border border-[#E7D8C9]">
                            <FileText size={18} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-stone-900 leading-tight">Official Employee Payslip</h3>
                            <p className="text-xs text-stone-500 font-medium">DOLE-PH Compliant Statement · {payroll.month}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-clay-700 hover:bg-clay-800 text-white text-xs font-bold transition shadow-2xs active:scale-[0.98]"
                        >
                            <Printer size={14} />
                            Print / Export PDF
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Printable Document Area */}
                <div ref={printRef} className="space-y-4 text-stone-800 text-xs">
                    {/* Top Document Header */}
                    <div className="flex justify-between items-start border-b border-stone-100 pb-3">
                        <div>
                            <h2 className="text-lg font-extrabold text-stone-900 leading-tight">{sellerName || 'LikhangKamay Merchant'}</h2>
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 mt-0.5">
                                STATEMENT OF EARNINGS & DEDUCTIONS · {payroll.month}
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="inline-block rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600 border border-stone-200">
                                Ref: {payslipRefNo}
                            </span>
                            <p className="text-[10px] text-stone-400 font-semibold mt-1">Disbursed Approved</p>
                        </div>
                    </div>

                    {/* Employee Metadata Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="rounded-xl bg-stone-50/80 p-2.5 border border-stone-200/60">
                            <label className="text-[9px] font-extrabold uppercase tracking-wider text-stone-400 block">Employee Name</label>
                            <span className="text-xs font-bold text-stone-900 block mt-0.5 truncate">{item.employee_name}</span>
                        </div>
                        <div className="rounded-xl bg-stone-50/80 p-2.5 border border-stone-200/60">
                            <label className="text-[9px] font-extrabold uppercase tracking-wider text-stone-400 block">Designation</label>
                            <span className="text-xs font-bold text-stone-900 block mt-0.5 truncate">{item.employee_role || 'Staff Operator'}</span>
                        </div>
                        <div className="rounded-xl bg-stone-50/80 p-2.5 border border-stone-200/60">
                            <label className="text-[9px] font-extrabold uppercase tracking-wider text-stone-400 block">Daily Rate</label>
                            <span className="text-xs font-bold text-stone-900 block mt-0.5">{money(dailyRate)}</span>
                        </div>
                        <div className="rounded-xl bg-stone-50/80 p-2.5 border border-stone-200/60">
                            <label className="text-[9px] font-extrabold uppercase tracking-wider text-stone-400 block">Hourly Rate</label>
                            <span className="text-xs font-bold text-stone-900 block mt-0.5">{money(hourlyRate)}</span>
                        </div>
                    </div>

                    {/* Two-Column Itemized Tables */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Gross Earnings Table */}
                        <div className="rounded-xl border border-stone-200 bg-white p-3 space-y-2">
                            <div className="flex justify-between items-center border-b border-stone-100 pb-1.5">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-600">Earnings & Compensation</span>
                                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">Addition</span>
                            </div>
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-stone-100 text-[9px] uppercase font-bold text-stone-400">
                                        <th className="py-1 text-left">Item Description</th>
                                        <th className="py-1 text-center">Unit</th>
                                        <th className="py-1 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    <tr>
                                        <td className="py-1.5 font-medium text-stone-800">Basic Monthly Pay</td>
                                        <td className="py-1.5 text-center text-stone-500">{item.days_worked || 0}d worked</td>
                                        <td className="py-1.5 text-right font-bold text-stone-900">{money(item.base_salary)}</td>
                                    </tr>
                                    {Number(item.overtime_pay || 0) > 0 && (
                                        <tr>
                                            <td className="py-1.5 font-medium text-stone-800">Regular OT (1.25x)</td>
                                            <td className="py-1.5 text-center text-stone-500">{meta.overtime || item.overtime_hours || 0} hrs</td>
                                            <td className="py-1.5 text-right font-bold text-emerald-700">+{money(item.overtime_pay)}</td>
                                        </tr>
                                    )}
                                    {Number(item.rest_day_ot_pay || 0) > 0 && (
                                        <tr>
                                            <td className="py-1.5 font-medium text-stone-800">Rest Day OT (1.69x)</td>
                                            <td className="py-1.5 text-center text-stone-500">{meta.rest_day_ot || item.rest_day_ot_hours || 0} hrs</td>
                                            <td className="py-1.5 text-right font-bold text-emerald-700">+{money(item.rest_day_ot_pay)}</td>
                                        </tr>
                                    )}
                                    {Number(item.holiday_ot_pay || 0) > 0 && (
                                        <tr>
                                            <td className="py-1.5 font-medium text-stone-800">Holiday OT (2.60x)</td>
                                            <td className="py-1.5 text-center text-stone-500">{meta.holiday_ot || item.holiday_ot_hours || 0} hrs</td>
                                            <td className="py-1.5 text-right font-bold text-emerald-700">+{money(item.holiday_ot_pay)}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            <div className="flex justify-between items-center pt-1.5 border-t border-stone-100 text-xs font-extrabold text-stone-900">
                                <span>Gross Earnings</span>
                                <span className="text-emerald-700">{money(grossPay)}</span>
                            </div>
                        </div>

                        {/* Deductions Table */}
                        <div className="rounded-xl border border-stone-200 bg-white p-3 space-y-2">
                            <div className="flex justify-between items-center border-b border-stone-100 pb-1.5">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-600">Deductions & Adjustments</span>
                                <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">Deduction</span>
                            </div>
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-stone-100 text-[9px] uppercase font-bold text-stone-400">
                                        <th className="py-1 text-left">Item Description</th>
                                        <th className="py-1 text-center">Unit</th>
                                        <th className="py-1 text-right">Deduction</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {Number(item.absence_deduction || 0) > 0 ? (
                                        <tr>
                                            <td className="py-1.5 font-medium text-stone-800">Unpaid Absences</td>
                                            <td className="py-1.5 text-center text-stone-500">{item.absences_days || 0} days</td>
                                            <td className="py-1.5 text-right font-bold text-rose-700">-{money(item.absence_deduction)}</td>
                                        </tr>
                                    ) : (
                                        <tr>
                                            <td className="py-1.5 font-medium text-stone-800">Unpaid Absences</td>
                                            <td className="py-1.5 text-center text-stone-400">0 days</td>
                                            <td className="py-1.5 text-right font-semibold text-stone-400">{money(0)}</td>
                                        </tr>
                                    )}
                                    {Number(item.undertime_deduction || 0) > 0 ? (
                                        <tr>
                                            <td className="py-1.5 font-medium text-stone-800">Undertime / Tardiness</td>
                                            <td className="py-1.5 text-center text-stone-500">{item.undertime_hours || 0} hrs</td>
                                            <td className="py-1.5 text-right font-bold text-rose-700">-{money(item.undertime_deduction)}</td>
                                        </tr>
                                    ) : (
                                        <tr>
                                            <td className="py-1.5 font-medium text-stone-800">Undertime / Tardiness</td>
                                            <td className="py-1.5 text-center text-stone-400">0 hrs</td>
                                            <td className="py-1.5 text-right font-semibold text-stone-400">{money(0)}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            <div className="flex justify-between items-center pt-1.5 border-t border-stone-100 text-xs font-extrabold text-stone-900">
                                <span>Total Deductions</span>
                                <span className="text-rose-700">-{money(totalDeductions)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Net Take-Home Pay Callout Banner */}
                    <div className="rounded-xl bg-[#FAF6F0] border border-[#E7D8C9] p-4 text-center">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-stone-500 block">Net Take-Home Pay</span>
                        <span className="text-2xl font-black text-clay-800 block mt-0.5 tracking-tight">{money(netPay)}</span>
                    </div>

                    {/* Dual Signature Line */}
                    <div className="pt-3 border-t border-stone-100">
                        <div className="grid grid-cols-2 gap-6 text-center">
                            <div>
                                <div className="border-t border-stone-400 pt-1.5 mt-6">
                                    <p className="text-xs font-bold text-stone-800">{item.employee_name}</p>
                                    <p className="text-[9px] text-stone-400 font-medium uppercase tracking-wider">Employee Signature (Received in Full)</p>
                                </div>
                            </div>
                            <div>
                                <div className="border-t border-stone-400 pt-1.5 mt-6">
                                    <p className="text-xs font-bold text-stone-800">{sellerName || 'LikhangKamay Representative'}</p>
                                    <p className="text-[9px] text-stone-400 font-medium uppercase tracking-wider">Authorized Employer Representative</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Note */}
                    <div className="text-[9px] text-stone-400 text-center border-t border-stone-100 pt-2 font-medium">
                        Official compensation document generated by LikhangKamay ERP System pursuant to DOLE Labor Standards (Art. 103).
                    </div>
                </div>
            </div>
        </Modal>
    );
}
