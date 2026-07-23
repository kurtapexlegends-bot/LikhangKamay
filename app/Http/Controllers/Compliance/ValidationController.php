<?php

namespace App\Http\Controllers\Compliance;

use App\Http\Controllers\Controller;

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
                return $this->checkEmailAvailability($value, $context['user_id'] ?? null);
            
            case 'sku_uniqueness':
                return $this->checkSkuUniqueness($value, $context['product_id'] ?? null);

            case 'shop_name_availability':
                return $this->checkShopNameAvailability($value, $context['user_id'] ?? null);

            case 'employee_id_uniqueness':
                return $this->checkEmployeeIdUniqueness($value, $context['employee_id'] ?? null);

            case 'supply_sku_uniqueness':
                return $this->checkSupplySkuUniqueness($value, $context['supply_id'] ?? null);

            case 'category_name_availability':
                return $this->checkCategoryNameAvailability($value, $context['category_id'] ?? null);

            default:
                return response()->json(['valid' => false, 'message' => 'Invalid validation type.'], 400);
        }
    }

    private function checkEmailAvailability($email, $userId = null)
    {
        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return response()->json(['valid' => false, 'message' => 'Please enter a valid email address.']);
        }

        $query = User::where('email', $email);
        if ($userId) {
            $query->where('id', '!=', $userId);
        }
        $exists = $query->exists();

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

    private function checkShopNameAvailability($name, $userId = null)
    {
        if (empty($name) || strlen($name) < 3) {
            return response()->json(['valid' => false, 'message' => 'Shop name must be at least 3 characters.']);
        }

        if (strlen($name) > 30) {
            return response()->json(['valid' => false, 'message' => 'Shop name cannot exceed 30 characters.']);
        }

        $like = \Illuminate\Support\Facades\DB::connection()->getDriverName() === 'pgsql' ? 'ILIKE' : 'like';
        $query = User::where('role', 'artisan')
            ->where('shop_name', $like, $name);

        if ($userId) {
            $query->where('id', '!=', $userId);
        }

        $exists = $query->exists();

        return response()->json([
            'valid' => !$exists,
            'message' => $exists ? 'This shop name is already taken.' : 'Shop name is available.'
        ]);
    }

    private function checkEmployeeIdUniqueness($idNumber, $employeeId = null)
    {
        if (empty($idNumber)) {
            return response()->json(['valid' => false, 'message' => 'Employee ID cannot be empty.']);
        }

        $query = \App\Models\Employee::where('employee_id', $idNumber);
        if ($employeeId) {
            $query->where('id', '!=', $employeeId);
        }

        $exists = $query->exists();

        return response()->json([
            'valid' => !$exists,
            'message' => $exists ? 'This Employee ID is already assigned.' : 'Employee ID is unique.'
        ]);
    }

    private function checkSupplySkuUniqueness($sku, $supplyId = null)
    {
        if (empty($sku)) {
            return response()->json(['valid' => false, 'message' => 'Supply SKU cannot be empty.']);
        }

        $query = \App\Models\Supply::where('sku', $sku);
        if ($supplyId) {
            $query->where('id', '!=', $supplyId);
        }

        $exists = $query->exists();

        return response()->json([
            'valid' => !$exists,
            'message' => $exists ? 'This Supply SKU is already in use.' : 'Supply SKU is unique.'
        ]);
    }

    private function checkCategoryNameAvailability($name, $categoryId = null)
    {
        if (empty($name) || strlen($name) < 2) {
            return response()->json(['valid' => false, 'message' => 'Category name is too short.']);
        }

        $like = \Illuminate\Support\Facades\DB::connection()->getDriverName() === 'pgsql' ? 'ILIKE' : 'like';
        $query = \App\Models\Category::where('name', $like, $name);
        if ($categoryId) {
            $query->where('id', '!=', $categoryId);
        }

        $exists = $query->exists();

        return response()->json([
            'valid' => !$exists,
            'message' => $exists ? 'A category with this name already exists.' : 'Category name is available.'
        ]);
    }
}
