export const DEFAULT_AVAILABLE_MODULES = [
    {
        id: 'viewer_3d',
        category: 'Shop Catalog & Listings',
        default_name: '3D Interactive Model Viewer',
        description: 'Interactive 3D model viewport on product pages letting shoppers inspect ceramics and crafts.',
        defaults: { free: true, premium: true, super_premium: true }
    },
    {
        id: 'courier_booking',
        category: 'Orders & Deliveries',
        default_name: 'Courier Booking (Lalamove)',
        description: 'On-demand courier parcel dispatch and pickup with automated tracking.',
        defaults: { free: true, premium: true, super_premium: true }
    },
    {
        id: 'customer_reviews',
        category: 'Sales & Support',
        default_name: 'Customer Reviews & Dispute Resolution',
        description: 'Collect buyer reviews, provide seller replies, and submit review dispute resolutions.',
        defaults: { free: true, premium: true, super_premium: true }
    },
    {
        id: 'printable_documents',
        category: 'Orders & Deliveries',
        default_name: 'Printable Invoices & Thermal Receipts',
        description: 'Print PDF tax invoices, packaging slips, and 58mm thermal receipts.',
        defaults: { free: true, premium: true, super_premium: true }
    },
    {
        id: 'in_house_dispatch',
        category: 'Orders & Deliveries',
        default_name: 'In-House Driver Fleet Dispatch',
        description: 'Dispatch internal studio drivers with live assignment and mobile proof-of-delivery.',
        defaults: { free: false, premium: true, super_premium: true }
    },
    {
        id: 'material_recipes',
        category: 'Materials & Inventory',
        default_name: 'Materials & Craft Recipes',
        description: 'Track crafting raw materials, recipes, and automatic inventory deduction upon production.',
        defaults: { free: false, premium: true, super_premium: true }
    },
    {
        id: 'staff_management',
        category: 'Team & Business Operations',
        default_name: 'Staff Attendance & Payroll Tools',
        description: 'Employee workspace accounts, facial photo clock-ins, shift tracking, and payroll generation.',
        defaults: { free: false, premium: true, super_premium: true }
    },
    {
        id: 'analytics_export',
        category: 'Team & Business Operations',
        default_name: 'Analytics Report Export',
        description: 'Download shop sales logs, visitor stats, and product reports in CSV/spreadsheet format.',
        defaults: { free: false, premium: true, super_premium: true }
    },
    {
        id: 'custom_modules',
        category: 'Team & Business Operations',
        default_name: 'Workspace Module Customization',
        description: 'Allows artisan to selectively enable or disable operational modules (HR, Accounting).',
        defaults: { free: false, premium: true, super_premium: true }
    },
    {
        id: 'chat_auto_reply',
        category: 'Sales & Support',
        default_name: 'Automated Thank-You Messages',
        description: 'Automatically dispatch personalized thank-you messages when orders are marked completed.',
        defaults: { free: false, premium: true, super_premium: true }
    },
    {
        id: 'b2b_supply_hub',
        category: 'Wholesale & B2B',
        default_name: 'B2B Supply Hub & Wholesale Ordering',
        description: 'Source raw crafting supplies from peer artisans and list wholesale product tiers with MOQ.',
        defaults: { free: false, premium: false, super_premium: true }
    },
    {
        id: 'discounts',
        category: 'Marketing & Pricing',
        default_name: 'Discounts & Promo Coupons',
        description: 'Create promotional coupon codes, flash sales, and cart discounts.',
        defaults: { free: false, premium: false, super_premium: true }
    },
    {
        id: 'sponsorships',
        category: 'Marketing & Pricing',
        default_name: 'Sponsored Catalog Spotlight',
        description: 'Featured artisan spotlight placements on the marketplace homepage and priority category placement.',
        defaults: { free: false, premium: false, super_premium: true }
    },
];
