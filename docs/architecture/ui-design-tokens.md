# UI/UX Design System & Tokens

This document details the styling tokens, typography, layouts, and anti-AI-slop visual guidelines governing the LikhangKamay frontend.

---

## 1. Visual Theme: "Earthy & Premium Artisan"

LikhangKamay utilizes a highly customized, warm, organic palette. Default Tailwind colors (e.g. blue, purple, pink) are forbidden in core UI layouts.

### Color Tokens
*   **Primary Accent (Clay/Terracotta)**: `#C2783F`
    *   CSS classes: `text-clay-700`, `bg-clay-600`, `hover:bg-clay-700`
*   **Backgrounds**:
    *   Primary Canvas (Warm Off-White): `bg-[#FDFBF9]`
    *   Secondary Canvas (Soft Gray): `bg-gray-50`
*   **Borders**: Soft gray lines (`border-gray-200` or `border-gray-100`).

---

## 2. Typography & Element Proportions

### Typography
*   **Headings**: Serif font (`font-serif`) to evoke handcrafted, premium heritage.
*   **Body Copy**: Clean sans-serif font (`font-sans`).

### Layout Density
*   **Container Padding**: Kept tight and dense (prefer `p-4` to `p-6` maximum for card bodies).
*   **Table Content**: Small, dense layout sizes (`text-xs` or `text-sm` with minimal padding).
*   **Layout Style**: Prefer side-by-side or split layouts over massive single-column layouts that force long vertical scrolling.
*   **Modals**: Custom components (never use browser `confirm()`). Modals must fit standard 13-inch laptop screens without clipping.

### Shapes & Shadows
*   **Cards/Inputs**: Soft, rounded corners (`rounded-xl`).
*   **Outer Containers**: Soft, rounded corners (`rounded-2xl`).
*   **Buttons/Badges**: Rounded pill shapes (`rounded-full`).
*   **Shadows**: Subtle elevations (`shadow-sm`, transitioning to `shadow-lg` on hover actions).

---

## 3. Anti- "AI Slop" Design Constraints

To maintain a bespoke, developer-crafted aesthetic:
1.  **Emoji Restrictions**:
    > [!IMPORTANT]
    > Do not use decorative or inline emojis in UI headers, sidebars, buttons, or notifications unless explicitly requested. Use clean SVG icons or `lucide-react` icons (sizes constrained between `size={14}` and `size={20}`).
2.  **No Gradient Slop**:
    > [!WARNING]
    > Never use multi-color gradient border accents or gradient top stripes on card interfaces (e.g. horizontal lines transitioning through yellow, green, and brown). These are characteristic of automated AI templates and compromise design system integrity.

---

## 4. Interaction & Feedback

*   **Toasts**: Slide-up floating notifications (bottom-right, auto-dismiss).
*   **Flash Messages**: Handled via Inertia redirect payload (`usePage().props.flash`). Never double-toast on redirect.
*   **Debouncing**: All text searches that send AJAX queries to the server must be debounced (300-400ms delay) to prevent rate limit exhaustion.
