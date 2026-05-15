<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ValidationController extends Controller
{
    /**
     * Generic endpoint for real-time constraint validation.
     */
    public function validateConstraint(Request $request)
    {
        $type = $request->input('type');
        $value = $request->input('value');
        $context = $request->input('context', []);

        switch ($type) {
            case 'email_availability':
                return $this->checkEmailAvailability($value);
            
            case 'sku_uniqueness':
                return $this->checkSkuUniqueness($value, $context['product_id'] ?? null);

            case 'shop_name_availability':
                return $this->checkShopNameAvailability($value);

            default:
                return response()->json(['valid' => false, 'message' => 'Invalid validation type.'], 400);
        }
    }

    private function checkEmailAvailability($email)
    {
        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return response()->json(['valid' => false, 'message' => 'Please enter a valid email address.']);
        }

        $exists = User::where('email', $email)->exists();

        return response()->json([
            'valid' => !$exists,
            'message' => $exists ? 'This email is already registered.' : 'Email is available.'
        ]);
    }

    private function checkSkuUniqueness($sku, $productId = null)
    {
        if (empty($sku)) {
            return response()->json(['valid' => false, 'message' => 'SKU cannot be empty.']);
        }

        $query = Product::where('sku', $sku);
        if ($productId) {
            $query->where('id', '!=', $productId);
        }

        $exists = $query->exists();

        return response()->json([
            'valid' => !$exists,
            'message' => $exists ? 'This SKU is already in use.' : 'SKU is unique.'
        ]);
    }

    private function checkShopNameAvailability($name)
    {
        if (empty($name) || strlen($name) < 3) {
            return response()->json(['valid' => false, 'message' => 'Shop name must be at least 3 characters.']);
        }

        $exists = User::where('role', 'artisan')
            ->where('shop_name', 'ILIKE', $name)
            ->exists();

        return response()->json([
            'valid' => !$exists,
            'message' => $exists ? 'This shop name is already taken.' : 'Shop name is available.'
        ]);
    }
}
