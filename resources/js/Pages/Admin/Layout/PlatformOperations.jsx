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
    availableActions = []
}) {
    return (
        <>
            <Head title="Audit Logs" />

            <div className="space-y-6">
                <DiagnosticsLogsTable 
                    activities={activities} 
                    filters={filters} 
                    availableActions={availableActions} 
                />
            </div>

            <FloatingModuleActions
                actions={
                    <ExportButton
                        href={route('admin.activity.export', {
                            search: filters.search || '',
                            action_type: filters.action_type || '',
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

