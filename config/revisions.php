<?php

return [
    'schemas' => [
        'artisan_kyc' => [
            'title' => 'Artisan Onboarding Revision Items',
            'fields' => [
                ['key' => 'shop_details', 'label' => 'Shop Name & Contact Info', 'group' => 'Workshop Profile'],
                ['key' => 'shop_address', 'label' => 'Workshop Address & Cavite Map Pin', 'group' => 'Workshop Profile'],
                ['key' => 'business_permit', 'label' => "Business / Mayor's Permit", 'group' => 'Verification Documents'],
                ['key' => 'dti_registration', 'label' => 'DTI Registration Certificate', 'group' => 'Verification Documents'],
                ['key' => 'valid_id', 'label' => 'Valid Government ID (Front)', 'group' => 'Verification Documents'],
                ['key' => 'tin_id', 'label' => 'TIN / BIR Registration (Form 2303 / Card)', 'group' => 'Verification Documents'],
                ['key' => 'face_verification', 'label' => 'Quick Face Check / Identity Photo Match', 'group' => 'Verification Documents'],
                ['key' => 'payout_info', 'label' => 'GCash / Maya Payout Account Details', 'group' => 'Payments'],
            ],
        ],

        'product' => [
            'title' => 'Product Listing Revision Items',
            'fields' => [
                ['key' => 'basic_info', 'label' => 'Product Title & Category', 'group' => 'Details'],
                ['key' => 'description', 'label' => 'Description & Craft Story', 'group' => 'Details'],
                ['key' => 'pricing_stock', 'label' => 'Pricing, Weight & Stock Units', 'group' => 'Pricing & Inventory'],
                ['key' => 'cover_media', 'label' => 'Cover Photo & Product Gallery', 'group' => 'Media'],
                ['key' => 'model_3d', 'label' => '3D Preview Model (.glb / .gltf)', 'group' => 'Media'],
                ['key' => 'materials_bom', 'label' => 'Materials Needed / Product Recipe', 'group' => 'Recipe'],
            ],
        ],

        'sponsorship' => [
            'title' => 'Sponsorship Request Revision Items',
            'fields' => [
                ['key' => 'product_media', 'label' => 'Product Cover Photo Quality & Presentation', 'group' => 'Listing Readiness'],
                ['key' => 'stock_eligibility', 'label' => 'Available Stock & Active Status', 'group' => 'Listing Readiness'],
                ['key' => 'product_claims', 'label' => 'Listing Title, Pricing or Description Claims', 'group' => 'Compliance'],
                ['key' => 'campaign_schedule', 'label' => 'Campaign Schedule / Featured Slot Policy', 'group' => 'Schedule'],
            ],
        ],

        'stock_request' => [
            'title' => 'Supply Restock Request Revision Items',
            'fields' => [
                ['key' => 'quantity_requested', 'label' => 'Requested Quantity / Units', 'group' => 'Quantities'],
                ['key' => 'unit_cost_budget', 'label' => 'Unit Cost & Total Budget Allocation', 'group' => 'Financials'],
                ['key' => 'supplier_selection', 'label' => 'Vendor / Supply Selection', 'group' => 'Procurement'],
                ['key' => 'justification_notes', 'label' => 'Purpose & Requisition Remarks', 'group' => 'Notes'],
            ],
        ],

        'payroll' => [
            'title' => 'Payroll Run Revision Items',
            'fields' => [
                ['key' => 'employee_roster', 'label' => 'Included Staff Members & Salaries', 'group' => 'Roster'],
                ['key' => 'attendance_hours', 'label' => 'Rendered Hours, Lates & Overtime', 'group' => 'Attendance'],
                ['key' => 'statutory_deductions', 'label' => 'SSS, PhilHealth, Pag-IBIG & Tax Breakdown', 'group' => 'Deductions'],
                ['key' => 'pay_period_totals', 'label' => 'Pay Period Dates & Total Disbursement', 'group' => 'Financials'],
            ],
        ],

        'owner_approval' => [
            'title' => 'Approval Request Revision Items',
            'fields' => [
                ['key' => 'proposed_values', 'label' => 'Proposed Figures / Edited Values', 'group' => 'Changes'],
                ['key' => 'supporting_details', 'label' => 'Supporting Evidence or Justification', 'group' => 'Notes'],
                ['key' => 'policy_alignment', 'label' => 'Workshop Pricing or Operations Guideline', 'group' => 'Compliance'],
            ],
        ],
    ],
];
