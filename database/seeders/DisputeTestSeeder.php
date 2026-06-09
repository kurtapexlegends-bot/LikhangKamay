<?php

namespace Database\Seeders;

use App\Models\Order;
use App\Models\Dispute;
use Illuminate\Database\Seeder;

class DisputeTestSeeder extends Seeder
{
    /**
     * Seed some test escalated disputes.
     */
    public function run(): void
    {
        // Find completed orders
        $completedOrders = Order::where('status', 'Completed')->limit(2)->get();

        if ($completedOrders->isEmpty()) {
            $this->command?->error('No completed orders found in the database to file disputes against.');
            return;
        }

        $reasons = [
            'The ceramic vase arrived with a large hairline crack running down the side, causing it to leak water immediately.',
            'The woven basket was missing one of its leather carry handles, making it unbalanced and defective.'
        ];

        $sellerExplanations = [
            'The hairline line is just part of the glaze reaction and does not affect the structural integrity of the piece.',
            'We checked our inventory and all items were shipped in perfect condition. It must have happened in transit.'
        ];

        $escalationReasons = [
            'The seller refuses to refund or send a replacement, claiming the crack is aesthetic, but it leaks water when filled.',
            'The seller claims they shipped it in perfect condition and refuses to cooperate, even though the missing handle was not in the packaging box.'
        ];

        foreach ($completedOrders as $index => $order) {
            // Update order status to Refund/Return
            $order->update([
                'status' => 'Refund/Return',
            ]);

            // Delete any existing dispute just in case
            Dispute::where('order_id', $order->id)->delete();

            // Create escalated dispute
            Dispute::create([
                'order_id' => $order->id,
                'status' => 'escalated',
                'reason' => $reasons[$index % count($reasons)],
                'proof_photos' => ['disputes/sample_proof_1.jpg', 'disputes/sample_proof_2.jpg'],
                'seller_response_type' => 'reject',
                'seller_explanation' => $sellerExplanations[$index % count($sellerExplanations)],
                'escalation_reason' => $escalationReasons[$index % count($escalationReasons)],
            ]);

            $this->command?->info("Seeded escalated dispute for Order #{$order->order_number}");
        }
    }
}
