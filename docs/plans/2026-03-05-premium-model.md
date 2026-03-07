# Premium Model and Sustainability Implementation Plan

> **For Antigravity:** REQUIRED SUB-SKILL: Load executing-plans to implement this plan task-by-task.

**Goal:** Implement a tiered subscription system for sellers with product limits, downgrade capabilities, and a sponsorship credit system for super premium users.

**Architecture:** We will extend the `users` and `products` tables to track subscription tiers, credits, and sponsorship status. We will enforce product limits via backend validation and provide a frontend UI to track usage and intercept creation attempts. Downgrades will introduce a new flow to select which products remain active. Sponsorships will use a new `sponsorship_requests` table to manage the workflow between sellers and admins.

**Tech Stack:** Laravel (Backend), React/Inertia (Frontend), Tailwind CSS.

---

### Task 1: Database Schema Updates for Subscriptions

**Files:**
- Create: `database/migrations/xxxx_xx_xx_xxxxxx_add_premium_fields_to_users_table.php`
- Modify: `app/Models/User.php`
- Test: `tests/Feature/PremiumSubscriptionSchemaTest.php`

**Step 1: Write the failing test**

```php
<?php
namespace Tests\Feature;
use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PremiumSubscriptionSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_has_subscription_fields()
    {
        $user = User::factory()->create([
            'subscription_tier' => 'super_premium',
            'sponsorship_credits' => 5,
        ]);
        
        $this->assertEquals('super_premium', $user->subscription_tier);
        $this->assertEquals(5, $user->sponsorship_credits);
    }
}
```

**Step 2: Run test to verify it fails**

Run: `php artisan test tests/Feature/PremiumSubscriptionSchemaTest.php`
Expected: FAIL indicating columns do not exist.

**Step 3: Write minimal implementation**

Create migration to add `subscription_tier` (string, default 'standard') and `sponsorship_credits` (integer, default 0) to `users` table. Update `User.php` `$fillable` array. Note: Ensure `php artisan make:migration` uses the correct timestamp naming convention.

**Step 4: Run test to verify it passes**

Run: `php artisan test tests/Feature/PremiumSubscriptionSchemaTest.php`
Expected: PASS

**Step 5: Commit**

```bash
git add database/migrations/ app/Models/ tests/Feature/
git commit -m "feat: add subscription tier and credits to users table"
```

---

### Task 2: Implement Backend Product Limits

**Files:**
- Modify: `app/Http/Controllers/ProductController.php` (or specifically the controller handling seller product creation)
- Modify: `app/Models/User.php` (to add tier helper methods)
- Test: `tests/Feature/ProductLimitTest.php`

**Step 1: Write the failing test**

```php
<?php
namespace Tests\Feature;
use Tests\TestCase;
use App\Models\User;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ProductLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_standard_user_cannot_exceed_product_limit()
    {
        $user = User::factory()->create(['subscription_tier' => 'standard']);
        Product::factory()->count(3)->create(['user_id' => $user->id, 'status' => 'active']);
        
        $response = $this->actingAs($user)->post('/seller/products', ['name' => '4th product', 'status' => 'active']);
        $response->assertSessionHasErrors('limit');
    }
}
```

**Step 2: Run test to verify it fails**

Run: `php artisan test tests/Feature/ProductLimitTest.php`
Expected: FAIL (it creates the product without errors).

**Step 3: Write minimal implementation**

In `ProductController@store` validation or early logic, count `$request->user()->products()->where('status', 'active')->count()`. Define limit constants (Standard: 3, Premium: 10, Super: 50). If user limit reached, `return back()->withErrors(['limit' => 'You have reached your active product limit']);`.

**Step 4: Run test to verify it passes**

Run: `php artisan test tests/Feature/ProductLimitTest.php`
Expected: PASS

**Step 5: Commit**

```bash
git add app/Http/Controllers/ app/Models/ tests/Feature/
git commit -m "feat: enforce active product limits on product creation"
```

---

### Task 3: Dashboard Tracker & "Add Product" Intercept

**Files:**
- Modify: `app/Http/Controllers/SellerDashboardController.php` (to pass counts)
- Modify: `resources/js/Pages/Seller/Dashboard.jsx` (or similarly named view)
- Modify: `resources/js/Pages/Seller/Products/Index.jsx`
- Test: Manually verify tracker and modal behavior

**Step 1: Write expected behavior / minimal implementation**

Pass `active_products_count` and `product_limit` to Inertia views. 
In frontend, show tracker UI e.g., `<p>3/3 Products Active</p>`. 
On your "Add Product" link, wrap it in a condition: `if (activeCount >= limit)` show modal, else navigate to `/seller/products/create`. 
The modal should prompt "You've reached your X product limit on the Standard Plan. Upgrade to list more!" with an "Upgrade Plan" button linking to `/seller/subscription`.

**Step 2: Run application to verify visually**

Login as a standard seller with 3 products. Verify tracker shows "3/3". Click "Add Product". Verify modal appears instead of navigation.

**Step 3: Commit**

```bash
git add app/Http/Controllers/ resources/js/Pages/Seller/
git commit -m "feat: add product limit dashboard tracker and upgrade intercept modal"
```

---

### Task 4: Dedicated Subscription Page

**Files:**
- Create: `app/Http/Controllers/SubscriptionController.php`
- Modify: `routes/web.php`
- Create: `resources/js/Pages/Seller/Subscription.jsx`
- Test: `tests/Feature/SubscriptionRouteTest.php`

**Step 1: Write the failing test**

```php
<?php
namespace Tests\Feature;
use Tests\TestCase;
use App\Models\User;

class SubscriptionRouteTest extends TestCase
{
    public function test_seller_can_view_subscription_page()
    {
        $user = User::factory()->create();
        $response = $this->actingAs($user)->get('/seller/subscription');
        $response->assertStatus(200);
    }
}
```

**Step 2: Run test to verify it fails**

Run: `php artisan test tests/Feature/SubscriptionRouteTest.php`
Expected: FAIL (404 Not Found).

**Step 3: Write minimal implementation**

Add `Route::get('/seller/subscription', [SubscriptionController::class, 'index'])->name('seller.subscription');` to web.php. 
Create `SubscriptionController` returning Inertia view. 
Create `Subscription.jsx` outlining the pricing table (Standard, Premium, Super Premium), identifying the user's current plan, and presenting "Upgrade" buttons. 

**Step 4: Run test to verify it passes**

Run: `php artisan test tests/Feature/SubscriptionRouteTest.php`
Expected: PASS

**Step 5: Commit**

```bash
git add app/Http/Controllers/ routes/web.php resources/js/Pages/Seller/ tests/Feature/
git commit -m "feat: create dedicated seller subscription page"
```

---

### Task 5: Downgrade Logic (Active Products Selection)

**Files:**
- Create: `resources/js/Pages/Seller/Subscription/DowngradeSelect.jsx`
- Modify: `app/Http/Controllers/SubscriptionController.php` (new downgrade routes)
- Modify: `routes/web.php`
- Test: `tests/Feature/SubscriptionDowngradeTest.php`

**Step 1: Write the failing test**

```php
<?php
namespace Tests\Feature;
use Tests\TestCase;
// ... Setup user with 10 active products on Premium tier ...
class SubscriptionDowngradeTest extends TestCase
{
    public function test_seller_must_select_products_when_downgrading()
    {
        $user = User::factory()->create(['subscription_tier' => 'premium']);
        // Create 10 active products for user
        
        $response = $this->actingAs($user)->post('/seller/subscription/downgrade', [
            'tier' => 'standard',
            'keep_active_ids' => [1, 2, 3] // The 3 they want to keep
        ]);
        
        $user->refresh();
        $this->assertEquals('standard', $user->subscription_tier);
        $this->assertEquals(3, $user->products()->where('status', 'active')->count());
        $this->assertEquals(7, $user->products()->where('status', 'draft')->count());
    }
}
```

**Step 2: Run test to verify it fails**

Run: `php artisan test tests/Feature/SubscriptionDowngradeTest.php`
Expected: FAIL (Route or Controller logic missing).

**Step 3: Write minimal implementation**

If upgrading, just change the state immediately. 
If downgrading, direct the user to the `DowngradeSelect.jsx` view passing their active products. The UI forces them to select the permitted $limit. Submitting sends `keep_active_ids`. 
Controller authenticates the list, sets selected as 'active', all others to 'draft', and changes user `subscription_tier`.

**Step 4: Run test to verify it passes**

Run: `php artisan test tests/Feature/SubscriptionDowngradeTest.php`
Expected: PASS

**Step 5: Commit**

```bash
git add app/Http/Controllers/ routes/web.php resources/js/Pages/Seller/Subscription/ tests/Feature/
git commit -m "feat: handle subscription downgrades and inactive product states"
```

---

### Task 6: Sponsorship Requests Database Schema

**Files:**
- Create: `database/migrations/xxxx_xx_xx_xxxxxx_create_sponsorship_requests_table.php`
- Create: `app/Models/SponsorshipRequest.php`
- Modify: `app/Models/Product.php`
- Test: `tests/Feature/SponsorshipSchemaTest.php`

**Step 1: Write the failing test**

```php
<?php
// ...
class SponsorshipSchemaTest extends TestCase
{
    public function test_can_create_sponsorship_request()
    {
        $product = Product::factory()->create();
        $request = \App\Models\SponsorshipRequest::create([
            'seller_id' => $product->user_id,
            'product_id' => $product->id,
            'status' => 'pending',
            'requested_duration_days' => 7,
        ]);
        
        $this->assertEquals('pending', $request->status);
    }
}
```

**Step 2: Run test to verify it fails**

Run: `php artisan test tests/Feature/SponsorshipSchemaTest.php`
Expected: FAIL (table not found).

**Step 3: Write minimal implementation**

Run `php artisan make:model SponsorshipRequest -m`. 
Add `seller_id`, `product_id`, `status` (pending, approved, rejected), and `requested_duration_days` to migration. Update models.

**Step 4: Run test to verify it passes**

Run: `php artisan test tests/Feature/SponsorshipSchemaTest.php`
Expected: PASS

**Step 5: Commit**

```bash
git add database/migrations/ app/Models/ tests/Feature/
git commit -m "feat: add sponsorship requests table and model"
```

---

### Task 7: Seller Sponsorship Request Workflow

**Files:**
- Modify: `routes/web.php`
- Create: `app/Http/Controllers/SponsorshipController.php`
- Create: `resources/js/Pages/Seller/Sponsorships/Index.jsx`
- Test: `tests/Feature/SponsorshipRequestWorkflowTest.php`

**Step 1: Write the failing test**

```php
// ... test user with 5 credits can post request, credit reduces to 4 ...
```

**Step 2: Run test to verify it fails**

**Step 3: Write minimal implementation**

Create controller that deducts 1 from `sponsorship_credits` on user, and creates a `SponsorshipRequest` record pointing to the `product_id`. Provide frontend listing of standard active products via a dropdown to pick from.

**Step 4: Run test to verify it passes**

**Step 5: Commit**

```bash
git add app/Http/Controllers/ routes/web.php resources/js/Pages/Seller/Sponsorships/ tests/Feature/
git commit -m "feat: complete seller sponsorship request workflow"
```

---

### Task 8: Admin Approval Workflow for Sponsorships

**Files:**
- Modify: `routes/web.php` (Admin routes)
- Create: `app/Http/Controllers/Admin/SponsorshipApprovalController.php`
- Create: `resources/js/Pages/Admin/Sponsorships/Index.jsx`
- Test: `tests/Feature/AdminSponsorshipTest.php`

**Step 1: Write the failing test**

Admin approving changes Request status to 'approved' and updates Product `is_sponsored` to true and `sponsored_until` to `now()->addDays(7)`.

**Step 2: Run test to verify it fails**

**Step 3: Write minimal implementation**

UI for Admin to see pending requests. Controller action on `approve` updates the related Product model timestamp and boolean.

**Step 4: Run test to verify it passes**

**Step 5: Commit**

```bash
git add app/Http/Controllers/Admin/ routes/web.php resources/js/Pages/Admin/ tests/Feature/
git commit -m "feat: add admin approval workflow for sponsorships"
```

---

### Task 9: Display Prominent Sponsorships on Frontend

**Files:**
- Modify: `app/Http/Controllers/WelcomeController.php` (or ShopController)
- Modify: `resources/js/Pages/Welcome.jsx`
- Modify: `resources/js/Pages/Shop/Index.jsx`
- Modify: `resources/js/Pages/Shop/ProductShow.jsx` (Add crown icon)
- Test: Check visually.

**Step 1: Write minimal implementation**

Query products where `is_sponsored == true` AND `sponsored_until > now()`. Pass to Welcome view as `$sponsoredProducts`. Map into a Carousel component in React. 
Add check for `product.seller.subscription_tier == 'premium'` or `super_premium` to insert a small Crown icon beside the seller's name in ProductShow. 
Add a small "Sponsored" tag `div` to product cards in `Shop/Index.jsx` if `is_sponsored` is true.

**Step 2: Run application to verify visually**

**Step 3: Commit**

```bash
git add app/Http/Controllers/ resources/js/Pages/
git commit -m "feat: display sponsored items carousel and premium badges"
```
