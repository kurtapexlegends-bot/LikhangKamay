<?php

namespace App\Support;

use DOMDocument;
use DOMNode;

class RichTextSanitizer
{
    private const ALLOWED_TAGS = [
        'b',
        'strong',
        'i',
        'em',
        'br',
        'p',
        'ul',
        'ol',
        'li',
    ];

    public static function sanitize(?string $html): ?string
    {
        if ($html === null) {
            return null;
        }

        $html = trim($html);

        if ($html === '') {
            return null;
        }

        if (!class_exists(DOMDocument::class)) {
            return e(strip_tags($html));
        }

        $document = new DOMDocument('1.0', 'UTF-8');
        $previous = libxml_use_internal_errors(true);

        $loaded = $document->loadHTML(
            '<?xml encoding="utf-8" ?><div>' . $html . '</div>',
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
        );

        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        if (!$loaded || !$document->documentElement) {
            return e(strip_tags($html));
        }

        $wrapper = $document->documentElement;
        $sanitizedDocument = new DOMDocument('1.0', 'UTF-8');
        $sanitizedWrapper = $sanitizedDocument->createElement('div');
        $sanitizedDocument->appendChild($sanitizedWrapper);

        foreach ($wrapper->childNodes as $child) {
            self::appendSanitizedNode($sanitizedDocument, $sanitizedWrapper, $child);
        }

        $output = '';
        foreach ($sanitizedWrapper->childNodes as $child) {
            $output .= $sanitizedDocument->saveHTML($child);
        }

        $output = trim($output);

        return $output !== '' ? $output : null;
    }

    private static function appendSanitizedNode(DOMDocument $document, DOMNode $parent, DOMNode $node): void
    {
        if ($node->nodeType === XML_TEXT_NODE) {
            $parent->appendChild($document->createTextNode($node->nodeValue));
            return;
        }

        if ($node->nodeType !== XML_ELEMENT_NODE) {
            return;
        }

        $tagName = strtolower($node->nodeName);

        if (!in_array($tagName, self::ALLOWED_TAGS, true)) {
            foreach ($node->childNodes as $child) {
                self::appendSanitizedNode($document, $parent, $child);
            }
            return;
        }

        $cleanElement = $document->createElement($tagName);
        $parent->appendChild($cleanElement);

        foreach ($node->childNodes as $child) {
            self::appendSanitizedNode($document, $cleanElement, $child);
        }
    }
}
