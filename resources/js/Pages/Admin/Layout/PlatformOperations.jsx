import React from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import DiagnosticsLogsTable from '@/Components/Admin/Layout/PlatformOperations/DiagnosticsLogsTable';

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
        </>
    );
}

PlatformOperations.layout = page => <AdminLayout title="Audit Logs">{page}</AdminLayout>;

