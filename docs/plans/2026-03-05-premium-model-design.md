# Premium Model and Sustainability Design
Date: 2026-03-05

## Overview
This document outlines the design for the Premium Model and Sustainability (Monetization) features for LikhangKamay, providing a structured tier system for sellers with product limits and sponsorship capabilities.

## 1. Tiers & Limits
*   **Standard (Free):** Limit 3 active products.
*   **Premium:** Limit 10 active products.
*   **Super Premium:** Increased limit (50 products) + 5 "Sponsorship Credits" per 30-day billing cycle.
*   **Visual Badge:** A subtle, elegant crown icon next to the seller's name on their store page and individual product pages to signify their premium status.

## 2. Upgrade UI Placement
*   **Dashboard Tracker:** A clear usage tracker on the main Seller Dashboard (e.g., "3/3 Products Active"). If they hit the limit, a prominent "Upgrade Plan" button appears.
*   **Dedicated Subscription Page:** A new `Seller/Subscription` page accessible from the seller sidebar. This will host a clean pricing table comparing the three tiers, showing their current plan, and allowing upgrades/downgrades.
*   **"Add Product" Intercept:** If a free user tries to click "Add Product" when they are already at their limit, a friendly modal pops up explaining the limit and offering a direct link to upgrade, rather than blocking them or throwing a generic error.

## 3. Downgrade Logic
*   When downgrading (e.g., Premium to Free), the user is taken to a "Manage Active Products" screen.
*   They must explicitly check off which products they want to keep "Active" (up to their new limit).
*   The remaining products are automatically downgraded to an "Inactive" status, preserving their data but hiding them from the public store until they upgrade again or delete an active product.

## 4. Sponsorship System (Super Premium)
*   **Seller Workflow:** A new `Seller/Sponsorships` module where Super Premium users can see their available credits (5 per month). They pick an active product from their list and click "Request Sponsorship".
*   **Admin Fulfillment:** The Super Admin manages these in a new `Admin/SponsorshipRequests` view, approving requests to activate them. Standard sponsorship duration is 7 days.
*   **Platform Visibility:** Sponsored products will instantly appear in a dedicated, high-visibility "Sponsored Items" carousel on the main App Landing Page. They will also receive a small "Sponsored" tag when appearing in regular search results.
