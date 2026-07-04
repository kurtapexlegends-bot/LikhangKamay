<?php

namespace App\Mail;

use App\Models\Product;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
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

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Low Stock Alert - {$this->productName}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.artisan.low-stock',
        );
    }
}
