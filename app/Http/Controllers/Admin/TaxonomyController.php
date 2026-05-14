<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class TaxonomyController extends Controller
{
    /**
     * Global Taxonomy Engine - Index
     */
    public function index()
    {
        return Inertia::render('Admin/Taxonomy', [
            'categories' => Inertia::defer(fn() => Category::withCount('products')->orderBy('name')->get())
        ]);
    }

    /**
     * Store a new category
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:categories,name'
        ]);

        Category::create([
            'name' => $validated['name'],
            'slug' => Str::slug($validated['name'])
        ]);

        return back()->with('success', 'Category created successfully.');
    }

    /**
     * Update an existing category
     */
    public function update(Request $request, Category $category)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:categories,name,' . $category->id
        ]);

        $oldName = $category->name;
        $newName = $validated['name'];

        $category->update([
            'name' => $newName,
            'slug' => Str::slug($newName)
        ]);

        // Mass update existing products
        Product::where('category', $oldName)->update(['category' => $newName]);

        return back()->with('success', 'Category renamed and all associated products updated.');
    }

    /**
     * Remove a category
     */
    public function destroy(Category $category)
    {
        if ($category->products()->count() > 0) {
            return back()->with('error', 'Cannot delete a category that contains products. Please reassign the products first.');
        }

        $category->delete();

        return back()->with('success', 'Category deleted successfully.');
    }

    /**
     * Check if category name exists (Ajax)
     */
    public function checkCategoryName(Request $request)
    {
        $exists = Category::where('name', $request->name)
            ->when($request->exclude_id, fn($q) => $q->where('id', '!=', $request->exclude_id))
            ->exists();

        return response()->json(['exists' => $exists]);
    }
}
