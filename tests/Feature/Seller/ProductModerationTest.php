<?php

namespace Tests\Feature\Seller;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Notifications\ProductModerationNotification;
use App\Services\CatalogService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class ProductModerationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Product::$bypassReview = false;
        Category::create(['name' => 'Vases', 'slug' => 'vases']);
    }

    public function test_seller_creating_product_forces_pending_review_status(): void
    {
        \Illuminate\Support\Facades\Storage::fake('public');
        $seller = User::factory()->artisanApproved()->create();

        $response = $this->actingAs($seller)->post(route('products.store'), [
            'sku' => 'MOD-TEST-1',
            'name' => 'Review Intercept Test Product',
            'description' => 'Should be intercepted and marked as pending review.',
            'category' => 'Vases',
            'price' => 150,
            'cost_price' => 80,
            'stock' => 5,
            'status' => 'Active',
            'cover_photo' => \Illuminate\Http\UploadedFile::fake()->image('cover.jpg'),
            'gallery' => [
                \Illuminate\Http\UploadedFile::fake()->image('gallery1.jpg'),
                \Illuminate\Http\UploadedFile::fake()->image('gallery2.jpg'),
                \Illuminate\Http\UploadedFile::fake()->image('gallery3.jpg'),
            ],
            'model_3d' => \Illuminate\Http\UploadedFile::fake()->create('model.glb', 100, 'application/octet-stream'),
        ]);

        $response->assertRedirect();
        $response->assertSessionDoesntHaveErrors();

        $product = Product::where('sku', 'MOD-TEST-1')->firstOrFail();
        $this->assertSame('pending_review', $product->status);
        $this->assertNull($product->rejection_reason);
    }

    public function test_seller_updating_product_forces_pending_review_status(): void
    {
        \Illuminate\Support\Facades\Storage::fake('public');
        $seller = User::factory()->artisanApproved()->create();

        // Setup product bypasses hook since no user is authenticated during creation
        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'MOD-TEST-2',
            'name' => 'Active Product before edit',
            'description' => 'Will be edited by seller.',
            'category' => 'Vases',
            'price' => 150,
            'cost_price' => 80,
            'stock' => 5,
            'status' => 'Active',
            'cover_photo_path' => 'products/covers/test.jpg',
            'gallery_paths' => ['products/gallery/1.jpg', 'products/gallery/2.jpg', 'products/gallery/3.jpg'],
            'model_3d_path' => 'products/models/test.glb',
        ]);

        $response = $this->actingAs($seller)->post(route('products.update', $product->id), [
            'name' => 'Edited Product name',
            'description' => 'Will be edited by seller.',
            'category' => 'Vases',
            'price' => 180,
            'cost_price' => 80,
            'stock' => 5,
            'status' => 'Active',
            'retained_gallery' => ['products/gallery/1.jpg', 'products/gallery/2.jpg', 'products/gallery/3.jpg'],
        ]);

        $response->assertRedirect();
        $response->assertSessionDoesntHaveErrors();

        $product->refresh();
        $this->assertSame('pending_review', $product->status);
        $this->assertSame('Edited Product name', $product->name);
    }

    public function test_admin_can_bulk_approve_products(): void
    {
        Notification::fake();

        $admin = User::factory()->superAdmin()->create();
        $seller = User::factory()->artisanApproved()->create();

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'MOD-TEST-3',
            'name' => 'Product pending approval',
            'category' => 'Vases',
            'price' => 100,
            'stock' => 5,
            'status' => 'pending_review',
        ]);

        $response = $this->actingAs($admin)->post(route('admin.catalog.moderate'), [
            'ids' => [$product->id],
            'action' => 'approve',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $product->refresh();
        $this->assertSame('Active', $product->status);
        $this->assertNull($product->rejection_reason);

        Notification::assertSentTo(
            $seller,
            ProductModerationNotification::class,
            function ($notification) use ($product) {
                $data = $notification->toArray($product->user);
                return $data['status'] === 'approved' && $data['product_id'] === $product->id;
            }
        );
    }

    public function test_admin_can_bulk_reject_products_with_feedback(): void
    {
        Notification::fake();

        $admin = User::factory()->superAdmin()->create();
        $seller = User::factory()->artisanApproved()->create();

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'MOD-TEST-4',
            'name' => 'Product pending reject',
            'category' => 'Vases',
            'price' => 100,
            'stock' => 5,
            'status' => 'pending_review',
        ]);

        $response = $this->actingAs($admin)->post(route('admin.catalog.moderate'), [
            'ids' => [$product->id],
            'action' => 'reject',
            'feedback' => 'Missing clear description and dimensions.',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $product->refresh();
        $this->assertSame('rejected', $product->status);
        $this->assertSame('Missing clear description and dimensions.', $product->rejection_reason);

        Notification::assertSentTo(
            $seller,
            ProductModerationNotification::class,
            function ($notification) use ($product) {
                $data = $notification->toArray($product->user);
                return $data['status'] === 'reject' && $data['rejection_reason'] === 'Missing clear description and dimensions.';
            }
        );
    }

    public function test_admin_can_bulk_flag_products_with_feedback(): void
    {
        Notification::fake();

        $admin = User::factory()->superAdmin()->create();
        $seller = User::factory()->artisanApproved()->create();

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'MOD-TEST-5',
            'name' => 'Product pending flag',
            'category' => 'Vases',
            'price' => 100,
            'stock' => 5,
            'status' => 'pending_review',
        ]);

        $response = $this->actingAs($admin)->post(route('admin.catalog.moderate'), [
            'ids' => [$product->id],
            'action' => 'flag',
            'feedback' => 'Possible duplicate listing.',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $product->refresh();
        $this->assertSame('flagged', $product->status);
        $this->assertSame('Possible duplicate listing.', $product->rejection_reason);

        Notification::assertSentTo(
            $seller,
            ProductModerationNotification::class,
            function ($notification) use ($product) {
                $data = $notification->toArray($product->user);
                return $data['status'] === 'flag' && $data['rejection_reason'] === 'Possible duplicate listing.';
            }
        );
    }

    public function test_admin_moderation_requires_feedback_when_rejecting_or_flagging(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $seller = User::factory()->artisanApproved()->create();

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'MOD-TEST-6',
            'name' => 'Product for validation check',
            'category' => 'Vases',
            'price' => 100,
            'stock' => 5,
            'status' => 'pending_review',
        ]);

        $response = $this->actingAs($admin)->post(route('admin.catalog.moderate'), [
            'ids' => [$product->id],
            'action' => 'reject',
            'feedback' => '', // Empty feedback
        ]);

        $response->assertSessionHasErrors(['feedback']);

        $product->refresh();
        $this->assertSame('pending_review', $product->status); // unchanged
    }

    public function test_catalog_service_excludes_non_approved_products(): void
    {
        $seller = User::factory()->artisanApproved()->create();

        // 1. Approved product
        $approved = Product::create([
            'user_id' => $seller->id,
            'sku' => 'MOD-CAT-1',
            'name' => 'Approved Flower Vase',
            'category' => 'Vases',
            'price' => 200,
            'stock' => 5,
            'status' => 'Active',
        ]);

        // 2. Pending review product
        $pending = Product::create([
            'user_id' => $seller->id,
            'sku' => 'MOD-CAT-2',
            'name' => 'Pending Flower Vase',
            'category' => 'Vases',
            'price' => 200,
            'stock' => 5,
            'status' => 'pending_review',
        ]);

        // 3. Rejected product
        $rejected = Product::create([
            'user_id' => $seller->id,
            'sku' => 'MOD-CAT-3',
            'name' => 'Rejected Flower Vase',
            'category' => 'Vases',
            'price' => 200,
            'stock' => 5,
            'status' => 'rejected',
        ]);

        // 4. Flagged product
        $flagged = Product::create([
            'user_id' => $seller->id,
            'sku' => 'MOD-CAT-4',
            'name' => 'Flagged Flower Vase',
            'category' => 'Vases',
            'price' => 200,
            'stock' => 5,
            'status' => 'flagged',
        ]);

        $service = new CatalogService();
        $query = $service->buildCatalogQuery(['category' => 'Vases']);
        $results = $query->get();

        $this->assertTrue($results->contains('id', $approved->id));
        $this->assertFalse($results->contains('id', $pending->id));
        $this->assertFalse($results->contains('id', $rejected->id));
        $this->assertFalse($results->contains('id', $flagged->id));
    }

    public function test_direct_access_to_unapproved_product_is_blocked_for_buyers(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        /** @var \App\Models\User $buyer */
        $buyer = User::factory()->create();
        assert($buyer instanceof User);

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'MOD-ACCESS-1',
            'name' => 'Unapproved Vase',
            'category' => 'Vases',
            'price' => 100,
            'stock' => 5,
            'status' => 'pending_review',
        ]);

        // Guest access is blocked
        $this->get(route('product.show', $product->slug))
            ->assertStatus(404);

        // Buyer access is blocked
        $this->actingAs($buyer)
            ->get(route('product.show', $product->slug))
            ->assertStatus(404);
    }

    public function test_direct_access_to_unapproved_product_is_allowed_for_seller_and_admin(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $admin = User::factory()->superAdmin()->create();

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'MOD-ACCESS-2',
            'name' => 'Unapproved Vase 2',
            'category' => 'Vases',
            'price' => 100,
            'stock' => 5,
            'status' => 'pending_review',
        ]);

        // Owner access is allowed
        $this->actingAs($seller)
            ->get(route('product.show', $product->slug))
            ->assertStatus(200);

        // Admin access is allowed
        $this->actingAs($admin)
            ->get(route('product.show', $product->slug))
            ->assertStatus(200);
    }

    public function test_seller_can_view_rejection_reason_in_products_index(): void
    {
        $seller = User::factory()->artisanApproved()->create();

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'MOD-INDEX-1',
            'name' => 'Rejected Vase',
            'category' => 'Vases',
            'price' => 100,
            'stock' => 5,
            'status' => 'rejected',
            'rejection_reason' => 'Missing clear specifications.',
        ]);

        $response = $this->actingAs($seller)->get(route('products.index'));

        $response->assertOk();
        $response->assertInertia(fn (\Inertia\Testing\AssertableInertia $page) => $page
            ->component('Seller/Catalog/ProductManager')
            ->has('products.data', 1)
            ->where('products.data.0.rejection_reason', 'Missing clear specifications.')
        );
    }

    public function test_seller_submitting_listing_notifies_super_admins(): void
    {
        \Illuminate\Support\Facades\Storage::fake('public');
        \Illuminate\Support\Facades\Notification::fake();

        $seller = User::factory()->artisanApproved()->create();
        $admin1 = User::factory()->superAdmin()->create();
        $admin2 = User::factory()->superAdmin()->create();

        $response = $this->actingAs($seller)->post(route('products.store'), [
            'sku' => 'MOD-PENDING-NOTIF-1',
            'name' => 'Vase for admin alert',
            'category' => 'Vases',
            'price' => 120,
            'cost_price' => 60,
            'stock' => 10,
            'status' => 'Active',
            'cover_photo' => \Illuminate\Http\UploadedFile::fake()->image('cover.jpg'),
            'gallery' => [
                \Illuminate\Http\UploadedFile::fake()->image('gallery1.jpg'),
                \Illuminate\Http\UploadedFile::fake()->image('gallery2.jpg'),
                \Illuminate\Http\UploadedFile::fake()->image('gallery3.jpg'),
            ],
            'model_3d' => \Illuminate\Http\UploadedFile::fake()->create('model.glb', 100, 'application/octet-stream'),
        ]);

        $response->assertRedirect();
        
        $product = Product::where('sku', 'MOD-PENDING-NOTIF-1')->firstOrFail();

        \Illuminate\Support\Facades\Notification::assertSentTo(
            [$admin1, $admin2],
            \App\Notifications\ProductPendingReviewNotification::class,
            function ($notification) use ($product) {
                $data = $notification->toArray($product);
                return $data['product_id'] === $product->id && str_contains($data['message'], 'Vase for admin alert');
            }
        );
    }
}
