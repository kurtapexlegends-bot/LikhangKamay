import React from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import DiagnosticsLogsTable from '@/Components/Admin/Layout/PlatformOperations/DiagnosticsLogsTable';
import FloatingModuleActions from '@/Components/FloatingModuleActions';
import ExportButton from '@/Components/ExportButton';
import { Download } from 'lucide-react';

export default function PlatformOperations({ 
    auth, 
    activities, 
    filters = {}, 
    availableActions = [],
    admins = []
}) {
    return (
        <>
            <Head title="Audit Logs" />

            <div className="space-y-6">
                <DiagnosticsLogsTable 
                    activities={activities} 
                    filters={filters} 
                    availableActions={availableActions}
                    admins={admins}
                />
            </div>

            <FloatingModuleActions
                actions={
                    <ExportButton
                        href={route('admin.activity.export', {
                            search: filters.search || '',
                            action_type: filters.action_type || '',
                            admin_id: filters.admin_id || '',
                            start_date: filters.start_date || '',
                            end_date: filters.end_date || '',
                        })}
                        icon={Download}
                        variant="primary"
                    >
                        Export
                    </ExportButton>
                }
            />
        </>
    );
}

PlatformOperations.layout = page => <AdminLayout title="Audit Logs">{page}</AdminLayout>;

