import React, { useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import SellerHeader from '@/Layouts/SellerHeader';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import PayrollHeroHeader from '@/Components/Seller/HR/PayrollHeroHeader';
import PayrollMetricStrip from '@/Components/Seller/HR/PayrollMetricStrip';
import PayrollItemsTable from '@/Components/Seller/HR/PayrollItemsTable';
import EmployeePayslipModal from '@/Components/Seller/HR/EmployeePayslipModal';

export default function PayrollRunShow({ payroll }) {
    const { auth } = usePage().props;
    const { openSidebar } = useSellerWorkspaceShell();
    const [payslipModalItem, setPayslipModalItem] = useState(null);

    return (
        <div className="min-h-screen bg-[#FDFBF9]">
            <Head title={`Payroll — ${payroll?.month || ''}`} />

            <SellerHeader
                title="Payroll Details"
                subtitle="Review staff compensation breakdown and formula audits."
                auth={auth}
                onMenuClick={openSidebar}
                badge={{ label: 'Enterprise', iconColor: 'text-emerald-400' }}
            />

            <main className="mx-auto max-w-7xl w-full min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 space-y-5">
                <PayrollHeroHeader payroll={payroll} />
                <PayrollMetricStrip summary={payroll?.summary} totalAmount={payroll?.total_amount} />
                <PayrollItemsTable
                    items={payroll?.line_items || []}
                    onViewPayslip={setPayslipModalItem}
                />
            </main>

            <EmployeePayslipModal
                item={payslipModalItem}
                payroll={payroll}
                sellerName={auth?.user?.store_name || auth?.user?.name}
                isOpen={!!payslipModalItem}
                onClose={() => setPayslipModalItem(null)}
            />
        </div>
    );
}

PayrollRunShow.layout = (page) => <SellerWorkspaceLayout active="hr">{page}</SellerWorkspaceLayout>;
