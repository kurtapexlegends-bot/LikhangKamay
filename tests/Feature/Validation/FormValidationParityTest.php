<?php

namespace Tests\Feature\Validation;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FormValidationParityTest extends TestCase
{
    use RefreshDatabase;

    private User $buyer;
    private User $artisan;
    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'shop_name' => 'Validation Clay Crafts',
            'email_verified_at' => now(),
            'setup_completed_at' => now(),
        ]);

        $this->product = Product::factory()->create([
            'user_id' => $this->artisan->id,
            'sku' => 'VAL-001',
            'category' => 'Pottery',
            'name' => 'Validation Test Item',
            'price' => 250,
            'stock' => 20,
        ]);

        $this->buyer = User::factory()->create([
            'role' => 'buyer',
            'name' => 'Test Validator',
            'email' => 'validator@likhangkamay.com',
            'email_verified_at' => now(),
        ]);
    }

    public function test_checkout_rejects_invalid_payment_method(): void
    {
        $response = $this->actingAs($this->buyer)->post(route('checkout.store'), [
            'items' => [
                ['id' => $this->product->id, 'qty' => 1]
            ],
            'shipping_method' => 'Delivery',
            'shipping_address' => '123 Calle Real, Dasmarinas, Cavite',
            'payment_method' => 'BITCOIN', // Invalid method
            'total' => 250.00,
        ]);

        $response->assertSessionHasErrors('payment_method');
    }

    public function test_seller_payout_rejects_alphabetic_mobile_numbers(): void
    {
        $response = $this->actingAs($this->artisan)->post(route('seller.settings.payout'), [
            'disbursement_method' => 'maya',
            'account_name' => 'Artisan Juan',
            'account_number' => 'NOT_A_PHONE_NUMBER',
        ]);

        $response->assertSessionHasErrors('account_number');
    }

    public function test_seller_payout_accepts_valid_philippine_maya_number(): void
    {
        $response = $this->actingAs($this->artisan)->post(route('seller.settings.payout'), [
            'disbursement_method' => 'maya',
            'account_name' => 'Artisan Juan',
            'account_number' => '+63 918-987-6543',
        ]);

        $response->assertSessionHasNoErrors();
        $this->artisan->refresh();
        $this->assertEquals('Maya', $this->artisan->payout_method);
        $this->assertEquals('09189876543', $this->artisan->payout_account_number);
    }

    public function test_product_creation_rejects_extreme_dimensions_and_weight(): void
    {
        $response = $this->actingAs($this->artisan)->post(route('products.store'), [
            'sku' => 'VAL-DIM-ERR-1',
            'name' => 'Giant Non-Conforming Vase',
            'category' => 'Pottery',
            'price' => 500,
            'cost_price' => 200,
            'stock' => 5,
            'status' => 'Draft',
            'height' => 250, // exceeds max 200 cm
            'width' => 99999, // extreme typo
            'weight' => 150000, // exceeds max 100,000 g (100 kg)
        ]);

        $response->assertSessionHasErrors(['height', 'width', 'weight']);
        $this->assertStringContainsString('cannot exceed 200 cm', session('errors')->first('height'));
        $this->assertStringContainsString('cannot exceed 200 cm', session('errors')->first('width'));
        $this->assertStringContainsString('cannot exceed 100,000 grams', session('errors')->first('weight'));
    }

    public function test_product_creation_rejects_sub_minimum_dimensions_and_weight(): void
    {
        $response = $this->actingAs($this->artisan)->post(route('products.store'), [
            'sku' => 'VAL-DIM-ERR-2',
            'name' => 'Sub-Minimum Negative Dimensions Vase',
            'category' => 'Pottery',
            'price' => 500,
            'cost_price' => 200,
            'stock' => 5,
            'status' => 'Draft',
            'height' => 0, // below min 0.1 cm
            'width' => -5, // negative
            'weight' => 0, // below min 1 g
        ]);

        $response->assertSessionHasErrors(['height', 'width', 'weight']);
        $this->assertStringContainsString('at least 0.1 cm', session('errors')->first('height'));
        $this->assertStringContainsString('at least 0.1 cm', session('errors')->first('width'));
        $this->assertStringContainsString('at least 1 gram', session('errors')->first('weight'));
    }

    public function test_product_creation_accepts_valid_realistic_dimensions_and_weight(): void
    {
        $response = $this->actingAs($this->artisan)->post(route('products.store'), [
            'sku' => 'VAL-DIM-OK-1',
            'name' => 'Valid Real-Scale Heavy Vase',
            'category' => 'Pottery',
            'price' => 1500,
            'cost_price' => 600,
            'stock' => 2,
            'status' => 'Draft',
            'height' => 200,
            'width' => 180,
            'weight' => 100000,
        ]);

        $response->assertSessionDoesntHaveErrors(['height', 'width', 'weight']);
    }
}
