<?php

namespace App\Mail;

use App\Models\Product;
use App\Services\EmailTemplateService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class LowStockAlert extends Mailable
{
    use Queueable, SerializesModels;

    public string $productName;
    public int $stock;

    public function __construct(Product $product)
    {
        $this->productName = $product->name;
        $this->stock = $product->stock;
    }

    public function build()
    {
        return EmailTemplateService::apply(
            mailable: $this,
            slug: 'low_stock',
            replacements: [
                '{product_name}' => $this->productName,
                '{action_url}' => route('products.index'),
            ],
            fallbackSubject: 'Low Stock Alert: Action Required',
            fallbackView: 'emails.artisan.low-stock',
            fallbackData: [
                'productName' => $this->productName,
                'stock' => $this->stock,
            ]
        );
    }
}
