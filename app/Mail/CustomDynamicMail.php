<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CustomDynamicMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $subjectText,
        public ?string $headlineText,
        public string $bodyText,
        public ?string $buttonLabel = null,
        public ?string $buttonUrl = null,
        public array $replacements = []
    ) {
    }

    public function envelope(): Envelope
    {
        $subject = $this->hydratePlaceholders($this->subjectText, $this->replacements);
        return new Envelope(
            subject: $subject,
        );
    }

    public function content(): Content
    {
        $headline = $this->headlineText ? $this->hydratePlaceholders($this->headlineText, $this->replacements) : null;
        $body = $this->hydratePlaceholders($this->bodyText, $this->replacements);
        $buttonLabel = $this->buttonLabel ? $this->hydratePlaceholders($this->buttonLabel, $this->replacements) : null;
        $buttonUrl = $this->buttonUrl ? $this->hydratePlaceholders($this->buttonUrl, $this->replacements) : null;

        return new Content(
            view: 'emails.custom-dynamic',
            with: [
                'headline' => $headline,
                'body' => $body,
                'buttonLabel' => $buttonLabel,
                'buttonUrl' => $buttonUrl,
            ]
        );
    }

    protected function hydratePlaceholders(string $text, array $replacements): string
    {
        $defaults = [
            '{user_name}' => 'Valued Member',
            '{shop_name}' => 'LikhangKamay Shop',
            '{order_number}' => 'ORD-SAMPLE-1001',
            '{site_name}' => 'LikhangKamay',
            '{verification_code}' => '849204',
            '{action_url}' => url('/'),
            '{product_name}' => 'Handcrafted Item',
        ];

        $merged = array_merge($defaults, $replacements);

        return strtr($text, $merged);
    }
}
