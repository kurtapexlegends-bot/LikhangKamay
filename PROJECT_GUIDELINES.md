# LikhangKamay - Project Guidelines & Handover

## 1. Technology Stack
- **Framework:** Laravel 11.x
- **Frontend:** React 18.x (via Inertia.js)
- **Styling:** TailwindCSS 3.x
- **Database:** MySQL
- **Icons:** `lucide-react`
- **Payments:** PayMongo API

## 2. Design System & UI/UX Principles
**Theme:** "Earthy & Premium Artisan"
- **Primary Color:** Clay/Terracotta (`text-clay-700`, `bg-clay-600`) - *Approx code: #C2783F*
- **Backgrounds:** Off-white (`bg-[#FDFBF9]`) or soft grays (`bg-gray-50`) for contrast.
- **Typography:** Serif for headings (`font-serif`), Sans-serif for body (`font-sans`).
- **Shapes:** Soft, rounded corners. Use `rounded-xl` for cards/inputs, `rounded-2xl` for containers, `rounded-full` for buttons/badges.
- **Shadows:** Soft shadows (`shadow-sm`, `shadow-lg` for hovers) to create depth.

**Component Standards:**
- **Compact UI & Density:** Keep the UI dense ("zoomed-out" look) to maximize information visibility on a single screen without vertical scrolling, especially for tables and dashboards.
  - **Padding:** Use `p-4`, `p-5`, or `p-6` for containers/cards. Avoid excessive padding like `p-8` unless necessary for hero sections.
  - **Typography:** Use smaller text sizes globally. Tables should typically use `text-xs` for body and `text-xs` to `text-sm` for headers. Standard headers should be `text-lg` or `text-base`.
  - **Icons:** Keep UI icons compact (`size={14}` to `size={20}` max for standard inline actions/badges).
- **Buttons:**
  - Primary: `bg-clay-600 text-white rounded-xl font-bold hover:bg-clay-700`
  - Secondary: `bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50`
  - Action/Icon: Use tight padding `p-1.5` or `p-2` with `rounded-md` or `rounded-lg` for inline table actions.
- **Modals:** Use `Components/Modal.jsx` or `ConfirmationModal.jsx`. 
- **Feedback:** Use Flash Messages (`usePage().props.flash`) for success/error alerts.

## 3. Code Standards

### Backend (Laravel)
- **Controllers:** Keep thin. Use specific methods for actions (e.g., `activate`, `archive`, `restock`) rather than overloading `update`.
- **Models:**
  - Always define `$fillable` to prevent mass assignment vulnerabilities.
  - Use `$casts` for `datetime` fields to ensure consistent formatting on the frontend.
  - **Images:** Handle both full URLs (social login) and local paths (`/storage/...`) in accessors or at runtime.
- **Routes (`web.php`):**
  - Group by User Role: `Public`, `Auth` (Common), `Seller` (Artisan), `Admin`.
  - Use Request Validation (`$request->validate([...])`) in Controllers.

### Frontend (React/Inertia)
- **Structure:** `Pages/{Role}/{Component}.jsx` (e.g., `Pages/Seller/ProductManager.jsx`).
- **State Management:** Use `useState` for local UI state. Use Inertia props (`usePage().props`) for global data (User, Flash Messages).
- **Icons:** Use `lucide-react` for all icons. Consistency with stroke width and size is key.
- **Feedback & Notifications:**
  - For page-level flashes (like after a full redirect), use Inertia's flash messages container.
  - For inline, asynchronous, or "Save Changes" actions (like editing settings), use a **Floating Toast Notification**.
    - Implement using local state: `const [toastMessage, setToastMessage] = useState('');` and `const [toastType, setToastType] = useState('success');`
    - Trigger on `onSuccess` or `onError` callbacks in Inertia forms.
- **Inline Editing:** Prefer inline editing over isolated forms or modals when dealing with profile/settings data. Convert static headers or paragraphs directly into borderless inputs on click or persistently to improve UX.
- **Partial Reloads (Performance):** When filtering, paginating, or updating a section of a page *without* needing to refresh all data, use Inertia's `only` option:
  ```js
  router.get(url, params, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
      only: ['recentOrders', 'filters'], // Only re-fetch these props
  });
  ```
  This avoids full-page data re-computation on the server and a full component re-render on the client.
- **Debounce Search Inputs:** For text inputs that trigger server requests, always debounce (e.g., 300-400ms) to avoid excessive requests.

## 4. Key Workflows

### Order Flow
1. **Pending:** Created by Buyer.
2. **Accepted:** Seller confirms stock/order.
3. **Shipped / Ready for Pickup:** Seller fulfills order. (*Store Pickups enforce Cash on Delivery*).
4. **Delivered:** Logistics partner confirms delivery or Buyer picks up.
5. **Completed:** Buyer confirms receipt OR 1 day passes (Auto-receive).
6. **Return/Refund:** Buyer requests a return within 1 day of delivery with proof. Seller approves or rejects.
   - **Refund:** Money returned to buyer, no stock deducted (financial write-off).
   - **Replace:** Stock is deducted and a new item is sent out.

### Procurement & Supply Buffer
1. **Request Stock:** Inventory Manager requests stock. Status becomes `pending`.
2. **Accounting Approval:** Accounting reviews the Fund Release dashboard.
3. **Validation:** Funds can only be released if `Available Money = Total Revenue - Total Expenses` > `Request Amount`.
4. **Receiving:** Stock requests can be partially received. Unfulfilled stock sits in a "Buffer" (`STATUS_PARTIALLY_RECEIVED`) until the rest arrives.

### HR & Payroll Flow
1. **Generation:** HR generates payroll using a wizard, selecting active employees.
2. **Calculations:** HR enters absences (deducts daily rate), undertime (deducts hourly rate), and overtime (adds fixed OT rate from settings). Holidays are implicitly "no pay" if unworked.
3. **Approval:** Payroll request is sent to Accounting for Fund Release. Employee records can be soft-deleted without breaking historical payrolls.

### Payment Flow (PayMongo)
1.  **Initiate:** `PaymentController@pay` creates a Checkout Session.
2.  **Redirect:** User goes to PayMongo URL.
3.  **Success:** User returns to `PaymentController@success`.
4.  **Verification:**
    - Controller retrieves Session from PayMongo.
    - Checks `payments` array, `payment_intent`, and status.
    - **CRITICAL:** Do not rely solely on `payment_status` as it may lag. Check for existence of payment records.

## 5. Maintenance & Automation
- **Artisan Commands:**
  - `orders:cancel-unpaid`: Auto-cancels unpaid orders > 24h. **Note:** Decrements `sold` count to keep stats accurate.
  - `orders:auto-receive`: Marks delivered orders as received after 3 days.
- **Schedule:** Defined in `routes/console.php`.

## 6. Common Pitfalls / "Gotchas"
- **PayMongo Minimum:** Live payments require roughly ₱100.00 minimum. Always wrap payment logic in a `try-catch` block.
- **Image Paths:** Social login avatars are full URLs. Uploaded images are paths relative to `storage/app/public`. Always check `str_starts_with($path, 'http')`.
- **Stock vs. Sold:** When cancelling an order, remember to INCREMENT `stock` and DECREMENT `sold`.

## 7. Test Accounts
All accounts use the password: `password`

| Role | Email |
|------|-------|
| Seller/Artisan | `kurtapexlegends@gmail.com` |
| Buyer | `kurtstanleytalastas@gmail.com` |
| SuperAdmin | `likhangkamaybusiness@gmail.com` |

## 9. UX Animation & Interaction Patterns
- **Smooth Scroll on Action:** When a user triggers an action that reveals a new UI element (e.g., opening a reply editor), use `scrollIntoView({ behavior: 'smooth', block: 'center' })` with a short `setTimeout` (50ms) to smoothly center the new element on screen.
- **Floating Pill Buttons for Quick Actions:** For contextual quick-action menus (e.g., Quick Reply on reviews), render options as separate, floating, rounded-corner pill buttons (`rounded-xl` or `rounded-full`) **without a shared background container**. Each pill should have its own border, subtle shadow, and hover effect. Stack them vertically with `flex flex-col gap-2`.
- **Dropdown Transitions (HeadlessUI):** All dropdowns should use HeadlessUI `Transition` for enter/leave animations (`opacity-0 scale-95` → `opacity-100 scale-100`). For upward-opening dropdowns, use a `top-left` or `top-right` alignment with `origin-bottom`.
- **Modal Confirmations for Destructive Actions:** Never use browser `confirm()` dialogs. Use `Components/Modal.jsx` or `ConfirmationModal.jsx` with a branded icon (e.g., `AlertCircle` in a red circle), clear title, description, and dual-button layout (Cancel / Confirm).
- **Character Limits on Text Inputs:** Show a live counter below text fields (e.g., `{length} / 500`). Counter text should turn red (`text-red-500`) when the limit is exceeded, and the submit button should be disabled (`disabled:opacity-50 disabled:cursor-not-allowed`).
- **Toast Notifications:** Use a floating toast at `fixed bottom-6 right-6` with slide-up animation (`translate-y-0 opacity-100` / `translate-y-12 opacity-0`). Include an icon, title, message, and close button. Auto-dismiss after 3-5 seconds.
- **Hover-Reveal Actions:** For inline edit/delete actions on cards or list items, keep them hidden by default and reveal on hover using `opacity-0 group-hover:opacity-100 transition-opacity` with the parent set to `group`.
- **Compact Density:** Maintain a dense, professional interface. Use small text sizes (`text-xs`, `text-sm`), tight padding (`px-3 py-1.5`), and compact icons (`size={14}` to `size={16}`).

## 10. AI Assistant Rules
- **Always flag potential issues.** Before applying any code change, the AI assistant **MUST** proactively inform the developer of any potential breaking changes, side effects, data loss risks, or compatibility issues that could result from the proposed modification. Never apply a change silently if it could cause problems.

---
*Generated by Antigravity - February 2026*
