import React from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import DiagnosticsLogsTable from '@/Components/Admin/Layout/PlatformOperations/DiagnosticsLogsTable';

export default function PlatformOperations({ 
    auth, 
    activities, 
    filters = {}, 
    availableActions = [],
    admins = []
}) {
    return (
        <>
            <Head title="Activity History"/>

            <div className="space-y-6">
                <DiagnosticsLogsTable 
                    activities={activities} 
                    filters={filters} 
                    availableActions={availableActions}
                    admins={admins}
                    exportUrl={route('admin.activity.export', {
                        search: filters.search || '',
                        action_type: filters.action_type || '',
                        admin_id: filters.admin_id || '',
                        start_date: filters.start_date || '',
                        end_date: filters.end_date || '',
                    })}
                />
            </div>
        </>
    );
}

PlatformOperations.layout = page => <AdminLayout title="Activity History">{page}</AdminLayout>;

