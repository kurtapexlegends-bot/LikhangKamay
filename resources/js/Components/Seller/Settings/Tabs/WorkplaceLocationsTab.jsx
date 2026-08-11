import React from 'react';
import WorkplaceLocationsManager from '@/Components/Seller/Settings/WorkplaceLocationsManager';

export default function WorkplaceLocationsTab({ locations, permissions }) {
    return (
        <div className="space-y-6">
            <WorkplaceLocationsManager
                locations={locations}
                canEdit={permissions?.can_edit_shop_settings}
            />
        </div>
    );
}
