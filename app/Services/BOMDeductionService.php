<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use App\Models\SellerActivityLog;
use App\Models\StockRequest;
use App\Models\Supply;

class BOMDeductionService
{
    /**
     * Deduct raw material supplies for an order with manufactured items.
     * Idempotent: safe to run multiple times without double-deducting.
     *
     * @param Order $order
     * @throws \Exception When insufficient materials are available
     * @return void
     */
    public function deductForOrder(Order $order): void
    {
        // Guard idempotency: check if BOM was already deducted for this order
        $alreadyDeducted = SellerActivityLog::where('seller_owner_id', $order->artisan_id)
            ->where('module', 'procurement')
            ->where('event_type', 'bom_materials_deducted')
            ->where('subject_id', $order->id)
            ->exists();

        if ($alreadyDeducted) {
            return;
        }

        $order->loadMissing(['items.product.recipes.supply.product']);

        $deductions = [];

        foreach ($order->items as $item) {
            $product = $item->product ?: Product::with('recipes.supply.product')->find($item->product_id);
            if (!$product || $product->production_method !== 'manufactured') {
                continue;
            }

            foreach ($product->recipes as $recipe) {
                if (!$recipe->supply_id) {
                    continue;
                }

                $totalRequired = (float) $recipe->quantity_required * (int) $item->quantity;
                if ($totalRequired <= 0) {
                    continue;
                }

                $supplyId = (int) $recipe->supply_id;
                if (!isset($deductions[$supplyId])) {
                    $deductions[$supplyId] = [
                        'supply_id' => $supplyId,
                        'required' => 0.0,
                        'product_names' => [],
                    ];
                }

                $deductions[$supplyId]['required'] += $totalRequired;
                $deductions[$supplyId]['product_names'][] = $product->name;
            }
        }

        if (empty($deductions)) {
            return;
        }

        // Lock supplies in deterministic order by ID to eliminate deadlocks under concurrent orders
        $supplyIds = array_keys($deductions);
        sort($supplyIds);

        $lockedSupplies = Supply::query()
            ->with('product')
            ->whereIn('id', $supplyIds)
            ->lockForUpdate()
            ->get()
            ->keyBy('id');

        // Verify sufficient stock across all locked supplies
        foreach ($deductions as $supplyId => $data) {
            /** @var Supply|null $supply */
            $supply = $lockedSupplies->get($supplyId);
            if (!$supply) {
                throw new \Exception("Required supply (ID: {$supplyId}) not found for BOM deduction.");
            }

            if ($supply->quantity < $data['required']) {
                throw new \Exception("Insufficient supply: {$supply->name}. Needed {$data['required']} {$supply->unit}, but only {$supply->quantity} available.");
            }
        }

        // Perform deductions
        foreach ($deductions as $supplyId => $data) {
            /** @var Supply $supply */
            $supply = $lockedSupplies->get($supplyId);
            $required = $data['required'];

            // Eloquent assignment and save() ensures model events (booted low stock / depletion alerts) fire
            $supply->quantity = max(0, $supply->quantity - (int) ceil($required));
            $supply->save();

            // Synchronize linked supply product stock if applicable
            if ($supply->product) {
                $supply->product->update(['stock' => $supply->quantity]);
            }

            // Low-Stock Threshold Alert: Auto-generate draft StockRequest if at or below min_stock
            if ($supply->quantity <= $supply->min_stock) {
                $hasActiveRequest = StockRequest::where('supply_id', $supply->id)
                    ->whereIn('status', [
                        StockRequest::STATUS_PENDING,
                        StockRequest::STATUS_ACCOUNTING_APPROVED,
                        StockRequest::STATUS_ORDERED,
                    ])
                    ->exists();

                if (!$hasActiveRequest) {
                    $suggestedQty = max(1, ($supply->max_stock ?? ($supply->min_stock * 2)) - $supply->quantity);
                    StockRequest::create([
                        'user_id' => $supply->user_id,
                        'requested_by_user_id' => $order->artisan_id,
                        'supply_id' => $supply->id,
                        'quantity' => $suggestedQty,
                        'total_cost' => round($suggestedQty * (float) ($supply->unit_cost ?? 0), 2),
                        'status' => StockRequest::STATUS_PENDING,
                    ]);
                }
            }

            $productNamesLabel = implode(', ', array_unique($data['product_names']));

            // Log individual supply deduction audit
            SellerActivityLog::recordEvent([
                'seller_owner_id' => $order->artisan_id,
                'actor_user_id' => $order->artisan_id,
                'actor_type' => 'system',
                'category' => 'inventory',
                'module' => 'procurement',
                'event_type' => 'supply_deducted',
                'severity' => 'info',
                'status' => 'deducted',
                'title' => 'Supply Deducted',
                'summary' => "Deducted {$required} {$supply->unit} of {$supply->name} for order #{$order->order_number}",
                'subject_type' => Order::class,
                'subject_id' => $order->id,
                'subject_label' => $order->order_number,
                'details' => [
                    'order_id' => $order->id,
                    'supply_id' => $supply->id,
                    'quantity' => $required,
                    'product_name' => $productNamesLabel,
                ],
            ]);
        }

        // Record master idempotency event
        SellerActivityLog::recordEvent([
            'seller_owner_id' => $order->artisan_id,
            'actor_user_id' => $order->artisan_id,
            'actor_type' => 'system',
            'category' => 'inventory',
            'module' => 'procurement',
            'event_type' => 'bom_materials_deducted',
            'severity' => 'info',
            'status' => 'deducted',
            'title' => 'BOM Materials Deducted',
            'summary' => "Raw materials successfully deducted for order #{$order->order_number}",
            'subject_type' => Order::class,
            'subject_id' => $order->id,
            'subject_label' => $order->order_number,
            'details' => [
                'order_id' => $order->id,
                'total_materials_deducted' => count($deductions),
            ],
        ]);
    }

    /**
     * Restore deducted raw material supplies when an order is cancelled or rejected.
     * Idempotent: checks that materials were actually deducted and not yet restored.
     *
     * @param Order $order
     * @return void
     */
    public function restoreForOrder(Order $order): void
    {
        // Orders in processing/shipped/pickup stages or with deduction logs are eligible for restoration
        $hasDeductionLog = SellerActivityLog::where('seller_owner_id', $order->artisan_id)
            ->where('module', 'procurement')
            ->where('event_type', 'bom_materials_deducted')
            ->where('subject_id', $order->id)
            ->exists();

        $isEligibleStatus = in_array($order->status, ['Processing', 'Shipped', 'Ready for Pickup', 'Cancelled', 'Rejected']);

        if (!$hasDeductionLog && !$isEligibleStatus) {
            return;
        }

        $alreadyRestored = SellerActivityLog::where('seller_owner_id', $order->artisan_id)
            ->where('module', 'procurement')
            ->where('event_type', 'bom_materials_restored')
            ->where('subject_id', $order->id)
            ->exists();

        if ($alreadyRestored) {
            return;
        }

        $order->loadMissing(['items.product.recipes.supply.product']);

        $toRestore = [];

        foreach ($order->items as $item) {
            $product = $item->product ?: Product::with('recipes.supply.product')->find($item->product_id);
            if (!$product || $product->production_method !== 'manufactured') {
                continue;
            }

            foreach ($product->recipes as $recipe) {
                if (!$recipe->supply_id) {
                    continue;
                }

                $restoreQty = (float) $recipe->quantity_required * (int) $item->quantity;
                if ($restoreQty <= 0) {
                    continue;
                }

                $supplyId = (int) $recipe->supply_id;
                if (!isset($toRestore[$supplyId])) {
                    $toRestore[$supplyId] = 0.0;
                }

                $toRestore[$supplyId] += $restoreQty;
            }
        }

        if (empty($toRestore)) {
            return;
        }

        // Lock supplies in deterministic order by ID to prevent deadlocks
        $supplyIds = array_keys($toRestore);
        sort($supplyIds);

        $lockedSupplies = Supply::query()
            ->with('product')
            ->whereIn('id', $supplyIds)
            ->lockForUpdate()
            ->get()
            ->keyBy('id');

        $restoredCount = 0;

        foreach ($toRestore as $supplyId => $restoreQty) {
            /** @var Supply|null $supply */
            $supply = $lockedSupplies->get($supplyId);
            if (!$supply) {
                continue;
            }

            $supply->quantity += (int) ceil($restoreQty);
            $supply->save();

            if ($supply->product) {
                $supply->product->update(['stock' => $supply->quantity]);
            }

            $restoredCount++;
        }

        SellerActivityLog::recordEvent([
            'seller_owner_id' => $order->artisan_id,
            'actor_user_id' => $order->artisan_id,
            'actor_type' => 'system',
            'category' => 'inventory',
            'module' => 'procurement',
            'event_type' => 'bom_materials_restored',
            'severity' => 'warning',
            'status' => 'restored',
            'title' => 'BOM Materials Restored',
            'summary' => "Raw materials restored following order #{$order->order_number} cancellation/rejection",
            'subject_type' => Order::class,
            'subject_id' => $order->id,
            'subject_label' => $order->order_number,
            'details' => [
                'order_id' => $order->id,
                'restored_materials_count' => $restoredCount,
            ],
        ]);
    }
}
