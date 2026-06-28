<?php

namespace App\Http\Resources\Seller;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SellerProductResource extends JsonResource
{
    /**
     * Disable wrapping for this resource.
     *
     * @var string|null
     */
    public static $wrap = null;

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sku' => $this->sku,
            'name' => $this->name,
            'description' => $this->description,
            'category' => $this->category,
            'status' => $this->status,
            'clay_type' => $this->clay_type,
            'glaze_type' => $this->glaze_type,
            'firing_method' => $this->firing_method,
            'food_safe' => (bool) $this->food_safe,
            'colors' => $this->colors ?? [],
            'height' => $this->height,
            'width' => $this->width,
            'weight' => $this->weight,
            'price' => $this->price,
            'cost_price' => $this->cost_price,
            'stock' => $this->stock,
            'lead_time' => $this->lead_time,
            'sold' => $this->sold,
            'cover_photo_path' => $this->cover_photo_path,
            'gallery_paths' => $this->gallery_paths ?? [],
            'model_3d_path' => $this->model_3d_path,
            'track_as_supply' => (bool) $this->track_as_supply,
            'production_method' => $this->production_method ?? 'resell',
            'rejection_reason' => $this->rejection_reason,
            'monthly_resubmission_count' => (int) $this->monthly_resubmission_count,
            'recipes' => $this->recipes->map(fn($r) => [
                'id' => $r->id,
                'supply_id' => $r->supply_id,
                'supply_name' => $r->supply->name ?? 'Unknown Supply',
                'quantity_required' => $r->quantity_required,
                'unit' => $r->supply->unit ?? '',
            ])->toArray(),
            'img' => $this->cover_photo_path
                ? '/storage/' . $this->cover_photo_path
                : '/images/placeholder.svg',
            'has3D' => filled($this->model_3d_path),
        ];
    }
}
