# Pre-Compiled Selector Map & Defense Asset Directory

This reference eliminates blind accessibility tree dumps by providing pre-verified, stable DOM selectors for fast-path execution across all test flows.

---

## 1. Stable DOM Selector Dictionary

### Authentication, Face Check & Onboarding
- **Login Email Input:** `input#email` or `input[type="email"]`
- **Login Password Input:** `input#password` or `input[type="password"]`
- **Login Submit Button:** `button[type="submit"]`
- **Buyer Register Face Check Start Button:** `button:has-text("Start Quick Face Check")`
- **Buyer Register Camera Fallback Skip Button:** `button:has-text("Skip until first order")` / `button:has-text("No camera? Skip for now")`
- **Email Verification Code Inputs:** `input[data-index="0"]`, `input[data-index="1"]`, `input[data-index="2"]`, `input[data-index="3"]`, `input[data-index="4"]`, `input[data-index="5"]`
- **KYC Business Permit Input:** `input#business_permit`
- **KYC DTI Certificate Input:** `input#dti_registration`
- **KYC Government ID Input:** `input#valid_id`
- **KYC TIN Registration Input:** `input#tin_id`
- **KYC Cancel Upload Trigger (`FileUploadField.jsx`):** `button:has-text("Cancel Upload")`
- **KYC Face Check Card Trigger:** `button:has-text("Start Quick Face Check")` / `button:has-text("Retake Face Check")`
- **KYC Face Card Fallback:** `button:has-text("Camera unavailable — continue with manual review")`
- **KYC Submit Application Button:** `button:has-text("Submit Application")`
- **Checkout One-Time Face Check Modal Header:** `div[role="dialog"]:has-text("One-Time Quick Face Check")`
- **Targeted Revision Inline Trigger / Custom Item (`InlineRevisionFooter.jsx`):** `button:has-text("Other issue")` -> `input[placeholder="Specify other item to revise..."]` + `button:has-text("Add")` (Checklist modal variant: `input[placeholder="Add other item..."]`)
- **Targeted Revision Summary Input (`InlineRevisionFooter.jsx` / Modal):** `input[placeholder*="summary guidance"]`, `textarea[placeholder*="clear guidance"]`, `textarea[placeholder*="Provide clear instructions"]`
- **Targeted Revision Field Jump Targets (`ArtisanSetup.jsx`):** `[data-revision-target="shop_details"]`, `[data-revision-target="shop_address"]`, `[data-revision-target="valid_id"]`, `[data-revision-target="face_verification"]`, `[data-revision-target="payout_info"]`

### Storefront & Consumer Catalog
- **Storefront Search Bar:** `input[placeholder*="Search"]`
- **Storefront "View All Products" Button:** `a:has-text("View All Products")` (Styled: `bg-stone-900 hover:bg-stone-800`)
- **Product Card Title:** `h3 a`, `div[data-testid="product-card"]`
- **Add to Cart Button:** `button:has-text("Add to Cart")`
- **Buy Now Button:** `button:has-text("Buy Now")`
- **Follow Shop Toggle Button:** `button:has-text("Follow Shop")`, `button:has-text("Following")`
- **Wishlist Toggle Button:** `button[title="Save for Later"]`

### Checkout & Payments
- **Shipping Method Delivery Radio:** `input[value="Delivery"]`
- **Shipping Method Store Pickup Radio:** `input[value="Pickup"]`
- **Payment Method COD Radio:** `input[value="COD"]`
- **Payment Method GCash Radio:** `input[value="GCash"]`
- **Place Order Button:** `button:has-text("Place Order")`
- **Order Confirmation Number:** `span.font-mono`, `[data-order-number]`

### Artisan Workspace & Catalog Operations
- **Add Product Button:** `button:has-text("Add Product")`
- **Product Title Input:** `input#title`
- **Product Category Select:** `select#category`
- **Product Base Price Input:** `input#price`
- **Product Stock Input:** `input#stock`
- **Product Cover Image Dropzone:** `input#cover_image`, `input[type="file"][accept*="image"]`
- **Product 3D GLB Model Input:** `input[accept=".glb,.gltf"]`, `input#model_file`
- **Publish Product Button:** `button:has-text("Publish Product")`
- **Quick Restock Button:** `button[title="Restock"]`
- **Quick Deduct Button:** `button[title="Deduct"]`
- **Confirmation Modal Confirm Button:** `div[role="dialog"] button:has-text("Confirm")`

### Orders Fulfillment & Logistics Dispatch
- **Orders Tab "Pending":** `button:has-text("Pending")`
- **Orders Tab "Processing":** `button:has-text("Processing")`
- **Order Action Accept Button:** `button:has-text("Accept")`
- **Order Action Start Crafting Button:** `button:has-text("Start Crafting")`
- **Order Action Dispatch Button:** `button:has-text("Confirm Studio Dispatch")`
- **In-House Driver Selection Card:** `div[data-driver-id="CAV-9876"]`, `button:has-text("CAV-9876")`
- **Driver Deliveries Complete Button:** `button:has-text("Confirm Delivery")`
- **Driver Proof of Delivery (POD) Input:** `input[name="pod_photo"]`, `input[type="file"][accept*="image"]`

### Dispute & Review Operations
- **Buyer Report Issue / Dispute Button:** `button:has-text("Report Issue / Return")`
- **Dispute Damage Proof Input:** `input#dispute_photo`, `input[type="file"]`
- **Submit Dispute Button:** `button:has-text("Submit Dispute")`
- **Artisan Dispute Defense Button:** `button:has-text("Submit Counter-Evidence")`
- **Admin Arbitrate 50% Refund Button:** `button:has-text("50% Partial Refund")`
- **Admin Arbitrate Full Refund Button:** `button:has-text("Approve Full Refund")`
- **Admin Decline Claim Button:** `button:has-text("Decline Claim (Pay Shop)")`

---

## 2. Local Defense Assets & Two-Tier Upload Protocol

### A. Asset Locations
- **Primary In-Workspace Path:**
  `tests/fixtures/defense_assets/` (e.g. `c:\laragon\www\LikhangKamay\tests\fixtures\defense_assets\`)
- **External Fallback Path:**
  `C:\Users\acost\OneDrive\Pictures\DEFENSE IMAGES\`

### B. Mandatory Two-Tier Upload Execution
1. **Tier 1 (Native Playwright / Puppeteer `uploadFile`):**
   Directly bind the workspace file path onto the input element:
   ```javascript
   await inputElement.uploadFile('tests/fixtures/defense_assets/Proof of Delivery (POD).jpg');
   ```
2. **Tier 2 (In-Browser DataTransfer Injection Bypass):**
   If OS sandbox blocks external filesystem access, construct the `File` object in memory:
   ```javascript
   const dataTransfer = new DataTransfer();
   const response = await fetch(assetBase64OrUrl);
   const blob = await response.blob();
   const file = new File([blob], fileName, { type: mimeType });
   dataTransfer.items.add(file);
   inputElement.files = dataTransfer.files;
   inputElement.dispatchEvent(new Event('change', { bubbles: true }));
   ```

### C. Asset-to-Selector Mapping Table

| Flow / Feature | Workspace Asset Path | Target Input Selector / Dropzone |
| :--- | :--- | :--- |
| **KYC Business Permit** | `tests\fixtures\defense_assets\Artisan Docx\Business Permit.png` | `input#business_permit` |
| **KYC DTI Registration** | `tests\fixtures\defense_assets\Artisan Docx\DTI.png` | `input#dti_registration` |
| **KYC TIN Registration** | `tests\fixtures\defense_assets\Artisan Docx\Tin ID.png` | `input#tin_id` |
| **KYC Government Valid ID** | `tests\fixtures\defense_assets\Artisan Docx\Valid ID.png` | `input#valid_id` |
| **Storefront Cover Banner** | `tests\fixtures\defense_assets\Shop Cover Banner (Wide).jpg` | `input[name="cover_photo"]` |
| **Product 3D Model** | `tests\fixtures\defense_assets\Product\Blue Feather Vase\Blue Feather Vase.glb` | `input[accept=".glb,.gltf"]`, `input#model_file` |
| **Product Studio Cover** | `tests\fixtures\defense_assets\Product\Blue Feather Vase\Main Cover.png` | `input#cover_image`, `input[name="cover"]` |
| **Bulk Inventory Import** | `tests\fixtures\defense_assets\products_sample.csv` | `input[type="file"][accept*=".csv"]` |
| **Chat Commission Attachment** | `tests\fixtures\defense_assets\Custom Commission Sketch (Chat Attachment).jpg` | `input[type="file"]` in chat |
| **Staff Attendance Face Scan** | `tests\fixtures\defense_assets\ArtisanStaff\HR.png` | Camera upload trigger / face verification |
| **Driver Proof of Delivery** | `tests\fixtures\defense_assets\Proof of Delivery (POD).jpg` | `input[name="pod_photo"]`, POD Modal File Input |
| **Dispute Damage Proof** | `tests\fixtures\defense_assets\ArtisanStaff\Dispute Damage Photo.jpg` | `input#dispute_photo` |
| **Dispute Packaging Proof** | `tests\fixtures\defense_assets\ArtisanStaff\Packaging Proof.jpg` | `input#packaging_proof` |
