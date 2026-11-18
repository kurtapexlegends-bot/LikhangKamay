<?php

declare(strict_types=1);

namespace App\Support;

class HelpCenterDirectory
{
    /**
     * Retrieve categorized FAQs for buyers.
     *
     * @param array<string, mixed> $dynamicParams
     * @return array<int, array<string, mixed>>
     */
    public static function getBuyerFaqs(array $dynamicParams = []): array
    {
        $returnWindowHours = $dynamicParams['return_window_hours'] ?? 24;

        return [
            [
                'id' => 'cavite-shipping-logistics',
                'category' => 'Ordering & Cavite Delivery',
                'question' => 'How does delivery work for handcrafted Cavite pottery?',
                'answer' => 'All pottery on LikhangKamay is crafted within Cavite artisan workshops. Depending on the workshop\'s setup, orders are dispatched either via integrated on-demand couriers (such as Lalamove) or through the artisan\'s dedicated in-house delivery staff. You will receive live GPS telemetry or step-by-step dispatch updates with electronic proof of delivery.',
                'tags' => ['shipping', 'delivery', 'lalamove', 'cavite', 'tracking'],
                'deep_link' => [
                    'label' => 'Track Your Orders',
                    'route' => 'my-orders.index',
                ],
            ],
            [
                'id' => 'fragile-pottery-packaging',
                'category' => 'Pottery Care & Breakage',
                'question' => 'How are delicate clay and ceramic products protected during transit?',
                'answer' => 'Cavite artisans follow strict pottery-grade packaging protocols. Items are individually cushioned in honeycomb or bubble wrap, braced inside reinforced corrugated boxes, and marked with fragile indicators. Liquid-holding pieces (such as mugs and plant pots) undergo structural soundness checks before dispatch.',
                'tags' => ['fragile', 'packaging', 'breakage', 'damage', 'safety'],
            ],
            [
                'id' => 'return-window-broken-items',
                'category' => 'Returns & Disputes',
                'question' => "What should I do if my pottery arrives broken or defective?",
                'answer' => "Under LikhangKamay's dynamic return policy, you have a {$returnWindowHours}-hour inspection window upon delivery. If an item arrives cracked, chipped, or damaged in transit, click 'Request Return / Dispute' on your orders page, select the defect reason, and upload clear photos showing the damaged areas. The artisan can accept a replacement or refund, and our platform admin arbitrates if unresolved.",
                'tags' => ['returns', 'refund', 'broken', 'dispute', 'warranty', 'damage'],
                'deep_link' => [
                    'label' => 'View Order Purchases',
                    'route' => 'my-orders.index',
                ],
            ],
            [
                'id' => 'payment-methods-and-fees',
                'category' => 'Payments & Invoices',
                'question' => 'What payment methods are supported, and are there service fees?',
                'answer' => 'We support Cash on Delivery (COD) for eligible deliveries, as well as digital e-wallet payments (GCash and Maya) and credit/debit cards powered securely by PayMongo. A transparent gateway service fee applies at checkout to cover transaction processing. All prices include applicable Philippine taxes.',
                'tags' => ['payment', 'gcash', 'maya', 'cod', 'fees', 'paymongo'],
            ],
            [
                'id' => 'vat-sales-invoices',
                'category' => 'Payments & Invoices',
                'question' => 'Can I download an official BIR Sales Invoice for my purchase?',
                'answer' => 'Yes. Once an order is confirmed and completed, you can generate and download a compliant BIR Sales Invoice directly from your order details page. For VAT-registered artisan sellers, the invoice transparently displays the 12% inclusive VAT breakdown, tax identification number (TIN), and registered business name.',
                'tags' => ['invoice', 'vat', 'bir', 'receipt', 'tax'],
                'deep_link' => [
                    'label' => 'My Purchases & Invoices',
                    'route' => 'my-orders.index',
                ],
            ],
            [
                'id' => 'quick-face-check-verification',
                'category' => 'Account & Biometrics',
                'question' => 'Why does the platform ask for a quick face check during registration or checkout?',
                'answer' => 'To safeguard Cavite artisans against fraudulent orders and bot accounts, first-time buyers undergo a one-time quick face check. The verification processes a 128-dimensional facial embedding client-side without storing raw biometric video. Once verified, you will not be prompted again during checkout.',
                'tags' => ['face check', 'verification', 'biometrics', 'security', 'privacy'],
                'deep_link' => [
                    'label' => 'Check Profile Status',
                    'route' => 'profile.edit',
                ],
            ],
            [
                'id' => 'shop-vouchers-discounts',
                'category' => 'Ordering & Cavite Delivery',
                'question' => 'How do shop discount vouchers and platform promotions work?',
                'answer' => 'Artisans can create store-specific promo vouchers (percentage off or fixed amount discounts with minimum spend rules). You can apply valid voucher codes inside your shopping cart or checkout drawer. Vouchers adjust item sub-totals while maintaining accurate BIR tax and delivery fee balances.',
                'tags' => ['vouchers', 'discounts', 'coupons', 'promo', 'checkout'],
                'deep_link' => [
                    'label' => 'Browse Ceramics Catalog',
                    'route' => 'shop.index',
                ],
            ],
            [
                'id' => 'handmade-pottery-variations',
                'category' => 'Pottery Care & Breakage',
                'question' => 'Why do handmade ceramic items look slightly different from catalog photos?',
                'answer' => 'Every piece on LikhangKamay is hand-thrown, sculpted, or kiln-fired by Cavite potters. Subtle variations in clay texture, glaze pooling, and coloration are natural signatures of the ceramic firing process and distinguish authentic handmade artisan goods from mass-produced factory ceramics.',
                'tags' => ['handmade', 'glaze', 'kiln', 'pottery', 'craftsmanship'],
            ],
        ];
    }

    /**
     * Retrieve categorized FAQs for artisan sellers.
     *
     * @param array<string, mixed> $dynamicParams
     * @return array<int, array<string, mixed>>
     */
    public static function getArtisanFaqs(array $dynamicParams = []): array
    {
        return [
            [
                'id' => 'artisan-registration-cavite',
                'category' => 'Studio Onboarding & Legal',
                'question' => 'What are the qualifications to sell on LikhangKamay as an artisan?',
                'answer' => 'Sellers must operate a legitimate pottery, ceramics, or craft workshop located within Cavite province. During onboarding, our automated system inspects your workshop location and permits (Cavite LGU Mayor\'s Permit, DTI Business Name Registration, or BIR Form 2303) using client-side OCR for swift approval.',
                'tags' => ['artisan', 'seller', 'cavite', 'dti', 'mayor permit', 'registration'],
                'deep_link' => [
                    'label' => 'Become an Artisan',
                    'route' => 'artisan.register',
                ],
            ],
            [
                'id' => 'document-ocr-and-revisions',
                'category' => 'Studio Onboarding & Legal',
                'question' => 'How does automated permit verification work and what happens during revisions?',
                'answer' => 'Our system reads legal documents directly in your browser using optical character recognition (OCR) to detect TINs, business names, and permit numbers. If an administrator requests a document update, the Targeted Revision system locks approved items and highlights only the specific permits needing correction.',
                'tags' => ['ocr', 'verification', 'revisions', 'permits', 'audit'],
            ],
            [
                'id' => 'walkin-pos-and-receipts',
                'category' => 'POS & In-Store Sales',
                'question' => 'How does the in-studio Walk-In POS feature work?',
                'answer' => 'Artisans can record in-person workshop sales via the built-in POS terminal. It supports cash tendering with automatic change calculations, custom Maya/GCash QR display, 80mm PDF thermal receipt generation, and supervisor-authorized void PIN protection.',
                'tags' => ['pos', 'walkin', 'cash', 'receipt', 'offline'],
            ],
            [
                'id' => 'payout-withdrawal-schedules',
                'category' => 'Payouts & Finance',
                'question' => 'When and how do artisans receive payouts for completed orders?',
                'answer' => 'Earnings from completed orders (where the customer has confirmed receipt or the warranty inspection window has lapsed without dispute) accumulate in your Withdrawable Payout Balance. You can request fund disbursements to your nominated GCash, Maya, or bank account directly from the Accounting Ledger.',
                'tags' => ['payouts', 'disbursement', 'earnings', 'accounting', 'ledger'],
            ],
            [
                'id' => 'b2b-supply-hub-sourcing',
                'category' => 'Inventory & Supplies',
                'question' => 'What is the B2B Supply Hub and how can my workshop source raw materials?',
                'answer' => 'The B2B Supply Hub connects Cavite pottery studios with certified suppliers of stoneware clay, terracotta, glazes, stains, and kiln accessories. Workshops can order wholesale quantities, manage restock requests, and deduct raw materials automatically via Bill of Materials (BOM) recipes.',
                'tags' => ['b2b', 'supplies', 'clay', 'wholesale', 'procurement', 'bom'],
            ],
            [
                'id' => 'managing-staff-and-payroll',
                'category' => 'Studio Onboarding & Legal',
                'question' => 'Can workshop owners manage studio helpers and staff attendance?',
                'answer' => 'Yes. Premium and Elite artisan workshops have access to the HR & Attendance module. You can register workshop assistants, drivers, and cashiers, track shift attendance with biometric or PIN clock-ins, upload employee contracts to a secure document vault, and generate Philippine statutory payrolls (SSS, PhilHealth, Pag-IBIG).',
                'tags' => ['staff', 'employees', 'attendance', 'payroll', 'hr'],
            ],
            [
                'id' => 'dispute-resolution-for-sellers',
                'category' => 'Returns & Disputes',
                'question' => 'How can an artisan respond to customer return or defect claims?',
                'answer' => 'When a buyer files a dispute, you receive an immediate alert in your Order Manager. You can review the buyer\'s photographic proof, accept a return, offer a replacement delivery, or provide an explanation. If an agreement cannot be reached, the case escalates to platform administrators for binding arbitration.',
                'tags' => ['dispute', 'seller', 'return', 'arbitration', 'replacement'],
            ],
        ];
    }

    /**
     * Retrieve categorized FAQs for B2B wholesale suppliers.
     *
     * @param array<string, mixed> $dynamicParams
     * @return array<int, array<string, mixed>>
     */
    public static function getSupplierFaqs(array $dynamicParams = []): array
    {
        return [
            [
                'id' => 'supplier-registration-qualifications',
                'category' => 'Warehouse Onboarding & Legal',
                'question' => 'What are the qualifications to supply raw crafting materials on LikhangKamay?',
                'answer' => 'Wholesale suppliers must operate a verified warehouse, depot, or supply facility in ' . implode(', ', SupplierAddress::SUPPORTED_PROVINCES) . '. During onboarding, applicants upload a business permit from the local government where the warehouse is located, DTI/SEC registration, BIR Form 2303, and proof of the warehouse address, then complete a face check.',
                'tags' => ['supplier', 'onboarding', 'warehouse', 'cavite', 'permits', 'b2b'],
                'deep_link' => [
                    'label' => 'Warehouse Profile',
                    'route' => 'profile.edit',
                ],
            ],
            [
                'id' => 'supplier-legal-documents',
                'category' => 'Warehouse Onboarding & Legal',
                'question' => 'What documents and verifications are required for wholesale suppliers?',
                'answer' => 'Suppliers provide four documents: a business permit from the local government where the warehouse is located, DTI business name registration or an SEC certificate, BIR Form 2303 with the tax identification number, and proof of the warehouse location. Account holders also complete a one-time face check.',
                'tags' => ['permits', 'bir', 'dti', 'face check', 'verification', 'compliance'],
            ],
            [
                'id' => 'supplier-material-listing-units',
                'category' => 'Wholesale Materials & Catalog',
                'question' => 'How do I list bulk raw crafting materials and industrial units?',
                'answer' => 'Through your Wholesale Catalog, you can add bulk crafting supplies such as stoneware clay, terracotta, pottery glazes, slip, plaster, stains, and kiln accessories. You can specify standard industrial units (25kg bags, 50kg sacks, metric tons, liters, drums, or piece bundles) and assign SKU codes for inventory tracking.',
                'tags' => ['materials', 'catalog', 'industrial units', 'clay', 'glaze', 'sku'],
                'deep_link' => [
                    'label' => 'Manage Wholesale Catalog',
                    'route' => 'supplier.materials.index',
                ],
            ],
            [
                'id' => 'supplier-pricing-and-moq',
                'category' => 'Wholesale Materials & Catalog',
                'question' => 'How do Minimum Order Quantities (MOQ) and wholesale pricing work?',
                'answer' => 'Each material listing allows you to define a Minimum Order Quantity (MOQ) to prevent broken packaging and ensure commercial-scale viability. Artisan workshops purchasing through the B2B Supply Hub must meet or exceed your specified MOQ threshold before checkout.',
                'tags' => ['moq', 'pricing', 'wholesale', 'bulk', 'orders'],
                'deep_link' => [
                    'label' => 'List New Material',
                    'route' => 'supplier.materials.index',
                ],
            ],
            [
                'id' => 'supplier-order-fulfillment-dispatch',
                'category' => 'Workshop Orders & Logistics',
                'question' => 'How do I fulfill and dispatch procurement orders from Cavite artisan studios?',
                'answer' => 'When a verified artisan studio orders wholesale materials, an alert appears in your Workshop Orders portal. Once prepared in your warehouse, you can transition order status from Pending to Confirmed, In Transit, and Delivered, logging courier dispatch details and tracking information.',
                'tags' => ['orders', 'fulfillment', 'dispatch', 'logistics', 'workshop'],
                'deep_link' => [
                    'label' => 'View Workshop Orders',
                    'route' => 'supplier.orders.index',
                ],
            ],
            [
                'id' => 'supplier-order-cancellations',
                'category' => 'Workshop Orders & Logistics',
                'question' => 'What happens if an artisan workshop requests an order cancellation?',
                'answer' => 'If an artisan workshop needs to cancel an unfulfilled order, suppliers can process the cancellation with an audit reason. The system automatically rolls back reserved stock quantities, restoring wholesale inventory levels in your catalog instantly.',
                'tags' => ['cancellation', 'stock restore', 'refund', 'inventory'],
            ],
            [
                'id' => 'supplier-payout-disbursements',
                'category' => 'B2B Payouts & Invoices',
                'question' => 'When and how are wholesale earnings disbursed to suppliers?',
                'answer' => 'Revenue from completed wholesale deliveries settles into your supplier account ledger. You can request direct fund disbursements to your verified Philippine bank account or digital merchant wallet (GCash / Maya) with complete transaction audit logs.',
                'tags' => ['payouts', 'disbursements', 'earnings', 'bank transfer', 'revenue'],
            ],
            [
                'id' => 'supplier-vat-sales-invoices',
                'category' => 'B2B Payouts & Invoices',
                'question' => 'Can I generate and issue official BIR Sales Invoices for wholesale orders?',
                'answer' => 'Yes. Completed wholesale orders support compliant commercial sales invoices showing itemized industrial units, unit costs, 12% value-added tax (VAT) breakdown, and buyer/seller TINs to satisfy Philippine tax reporting and artisan studio expense accounting.',
                'tags' => ['invoices', 'vat', 'bir', 'tax', 'sales invoice', 'receipt'],
                'deep_link' => [
                    'label' => 'View Completed Orders',
                    'route' => 'supplier.orders.index',
                ],
            ],
        ];
    }
}
