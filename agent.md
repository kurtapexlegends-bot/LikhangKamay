# LikhangKamay - AI Assistant Context & Rules

You are an expert full-stack developer working on the **LikhangKamay** project. Adhere STRICTLY to these guidelines to ensure code quality, UI consistency, and application security.

## 1. Tech Stack Overview
- **Backend:** Laravel 11.x, MySQL
- **Frontend:** React 18.x with Inertia.js
- **Styling:** TailwindCSS 3.x
- **Icons:** `lucide-react`
- **Key Integration:** PayMongo API

## 2. Design System & UI
- **Theme:** "Earthy & Premium Artisan"
- **Colors:** Primary is Clay/Terracotta (`#C2783F`, `text-clay-700`, `bg-clay-600`). Backgrounds use off-white (`bg-[#FDFBF9]`) or soft gray (`bg-gray-50`).
- **Typography:** Serif for headings (`font-serif`), Sans-serif for body (`font-sans`). Use smaller text globally (e.g., `text-xs` for dense table bodies/headers).
- **Density:** Keep the UI compact ("zoomed-out"). Avoid excessive padding (prefer `p-4` to `p-6` for containers).
- **Shapes:** Soft, rounded corners (`rounded-xl` for cards/inputs, `rounded-2xl` containers, `rounded-full` buttons). Soft shadows (`shadow-sm`, `shadow-lg` on hover).
- **Icons:** Use `size={14}` to `size={20}` for standard icons using `lucide-react`.

## 3. Component Standards
- **Buttons:**
  - Primary: `bg-clay-600 text-white rounded-xl font-bold hover:bg-clay-700`
  - Secondary: `bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50`
  - Inline Actions: Tight padding `p-1.5` or `p-2` with `rounded-md`/`rounded-lg`.
- **Modals:** Use standard `Components/Modal.jsx` or `ConfirmationModal.jsx`.
- **Feedback:** 
  - Full-page redirects: Use Flash Messages (`usePage().props.flash`).
  - Asynchronous / Inline Actions: Use Floating Toast Notifications (`useState` to manage `toastMessage` and `toastType` locally on form `onSuccess`/`onError`).
- **Forms:** Prefer Inline Editing over isolated forms/modals for settings grids.

## 4. Frontend Code Standards (React / Inertia)
- **Path Structure:** `Pages/{Role}/{Component}.jsx` (e.g., `Pages/Seller/ProductManager.jsx`).
- **State:** Use `useState` for local UI state; use `usePage().props` for global data.
- **Partial Reloads:** Use Inertia's `only` option when filtering/paginating to avoid full-page re-renders:
  ```js
  router.get(url, params, { preserveState: true, preserveScroll: true, replace: true, only: ['dataToRefresh'] });
  ```
- **Debouncing:** Always debounce text inputs that trigger server requests (300-400ms).

## 5. Backend Code Standards (Laravel)
- **Controllers:** Keep thin. Use specific action methods (`activate`, `restock`) instead of overloading `update`.
- **Models:** Always define `$fillable` to prevent mass assignment. Cast `datetime` fields to ensure frontend JSON consistency.
- **Images:** Always check if a path begins with `http` (for social login avatars) before assuming it's a local `storage/app/public/...` path.
- **Routing:** Group by role (`Public`, `Auth`, `Seller`, `Admin`) with proper Route Model Binding and Request Validation `$request->validate()`.

## 6. Critical Rules For Code Generation
1. **Flag Breaking Changes:** Before applying any code change, you MUST proactively inform the developer of any potential breaking changes, side effects, data loss risks, or compatibility issues. NEVER apply a change silently if it could cause problems.
2. **Order Cancellations:** When cancelling an order, always remember to **INCREMENT `stock`** and **DECREMENT `sold`**.
3. **PayMongo:** Payments require a ~₱100.00 minimum. Always wrap payment flows in `try-catch` blocks. Do not rely solely on `payment_status`; verify records in our DB.
4. **Dates:** Use standardized date formats, parsing with Carbon on the backend.
