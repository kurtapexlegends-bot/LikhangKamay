import React, { useRef } from 'react';
import { Printer, X, FileText } from 'lucide-react';
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
                        @page { size: A4 portrait; margin: 15mm; }
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1c1917; background: #fff; margin: 0; padding: 24px; }
                        .payslip-box { max-width: 580px; margin: 0 auto; border: 1px solid #e7e5e4; border-radius: 12px; padding: 24px; }
                        .header { border-bottom: 1px solid #f5f5f4; pb-3; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
                        .shop-name { font-size: 18px; font-weight: 800; color: #1c1917; margin: 0; }
                        .month-tag { font-size: 11px; font-weight: 700; color: #78716c; text-transform: uppercase; }
                        .emp-info { background: #fafaf9; border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; font-size: 12px; display: flex; justify-content: space-between; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
                        th { text-align: left; font-size: 10px; text-transform: uppercase; color: #a8a29e; font-weight: 800; padding: 6px 0; border-bottom: 1px solid #f5f5f4; }
                        td { padding: 8px 0; border-bottom: 1px dashed #f5f5f4; color: #292524; }
                        td.num { text-align: right; font-weight: 700; }
                        .text-green { color: #15803d; }
                        .text-red { color: #be123c; }
                        .net-box { background: #faf6f0; border: 1px solid #e7d8c9; border-radius: 10px; padding: 14px; text-align: center; margin-top: 16px; }
                        .net-amount { font-size: 24px; font-weight: 900; color: #844d2d; }
                    </style>
                </head>
                <body>
                    <div class="payslip-box">
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
        <Modal show={isOpen} onClose={onClose} maxWidth="xl">
            <div className="p-5 sm:p-6 bg-white space-y-5 rounded-2xl">
                {/* Header Controls */}
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FCF7F2] text-clay-700 border border-[#E7D8C9]">
                            <FileText size={18} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-stone-900 leading-tight">Employee Payslip</h3>
                            <p className="text-xs text-stone-500 font-medium">{payroll.month}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-clay-700 hover:bg-clay-800 text-white text-xs font-bold transition shadow-2xs active:scale-[0.98]"
                        >
                            <Printer size={14} />
                            Print / PDF
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

                {/* Printable Content */}
                <div ref={printRef} className="space-y-4 text-xs text-stone-800">
                    {/* Header */}
                    <div className="flex justify-between items-baseline border-b border-stone-100 pb-3">
                        <div>
                            <h4 className="text-base font-extrabold text-stone-900">{sellerName || 'LikhangKamay Merchant'}</h4>
                            <p className="text-xs font-semibold text-stone-500">{item.employee_name} ({item.employee_role || 'Staff'})</p>
                        </div>
                        <div className="text-right text-[11px] text-stone-500 font-medium">
                            <div>Daily Rate: <span className="font-bold text-stone-800">{money(dailyRate)}</span></div>
                            <div>Hourly: <span className="font-bold text-stone-800">{money(hourlyRate)}</span></div>
                        </div>
                    </div>

                    {/* Minimal Breakdown Table */}
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-stone-100 text-[10px] uppercase font-bold text-stone-400">
                                <th className="py-1.5 text-left">Description</th>
                                <th className="py-1.5 text-center">Worked / Count</th>
                                <th className="py-1.5 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            <tr>
                                <td className="py-2 font-medium text-stone-800">Base Salary</td>
                                <td className="py-2 text-center text-stone-500">{item.days_worked || 0} days</td>
                                <td className="py-2 text-right font-bold text-stone-900">{money(item.base_salary)}</td>
                            </tr>
                            {Number(item.overtime_pay || 0) > 0 && (
                                <tr>
                                    <td className="py-2 font-medium text-stone-800">Regular Overtime</td>
                                    <td className="py-2 text-center text-stone-500">{meta.overtime || item.overtime_hours || 0} hrs</td>
                                    <td className="py-2 text-right font-bold text-emerald-700">+{money(item.overtime_pay)}</td>
                                </tr>
                            )}
                            {Number(item.rest_day_ot_pay || 0) > 0 && (
                                <tr>
                                    <td className="py-2 font-medium text-stone-800">Rest Day Overtime</td>
                                    <td className="py-2 text-center text-stone-500">{meta.rest_day_ot || item.rest_day_ot_hours || 0} hrs</td>
                                    <td className="py-2 text-right font-bold text-emerald-700">+{money(item.rest_day_ot_pay)}</td>
                                </tr>
                            )}
                            {Number(item.holiday_ot_pay || 0) > 0 && (
                                <tr>
                                    <td className="py-2 font-medium text-stone-800">Holiday Overtime</td>
                                    <td className="py-2 text-center text-stone-500">{meta.holiday_ot || item.holiday_ot_hours || 0} hrs</td>
                                    <td className="py-2 text-right font-bold text-emerald-700">+{money(item.holiday_ot_pay)}</td>
                                </tr>
                            )}
                            {Number(item.absence_deduction || 0) > 0 && (
                                <tr>
                                    <td className="py-2 font-medium text-stone-800">Unpaid Absences</td>
                                    <td className="py-2 text-center text-stone-500">{item.absences_days || 0} days</td>
                                    <td className="py-2 text-right font-bold text-rose-700">-{money(item.absence_deduction)}</td>
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

                    {/* Net Pay Callout */}
                    <div className="rounded-xl bg-[#FAF6F0] border border-[#E7D8C9] p-4 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 block">Net Take-Home Pay</span>
                        <span className="text-2xl font-black text-clay-800 block mt-0.5">{money(netPay)}</span>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
