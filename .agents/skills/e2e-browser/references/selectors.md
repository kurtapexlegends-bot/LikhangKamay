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
- **KYC Client-Side OCR Verification Badges (`FileUploadField.jsx`):** `span:has-text("Mayor's Permit Verified")`, `span:has-text("DTI Matched")`, `span:has-text("TIN Detected")`, `span:has-text("Gov ID Detected")`, `span:has-text("Reading document text")`
- **KYC Magnifier OCR Inspection Bar (`DocumentMagnifierModal.jsx`):** `button:has-text("OCR Signals")`, `button:has-text("Copy ")`
- **KYC Locked Approved Document Badge (`FileUploadField.jsx`):** `span:has-text("Approved")`
- **KYC Face Check Card Trigger:** `button:has-text("Start Quick Face Check")` / `button:has-text("Retake Face Check")`
- **KYC Face Check Locked Badge (`KycFaceAndIdCheckCard.jsx`):** `span:has-text("Approved")`
- **KYC Face Card Fallback:** `button:has-text("Camera unavailable — continue with manual review")`
- **KYC Submit Application Button:** `button:has-text("Submit Application")`
- **Shared Face Capture Modal Header (`FaceCaptureModal.jsx`):** `div[role="dialog"]:has-text("Quick Face Check")`, `div[role="dialog"]:has-text("One-Time Quick Face Check")`
- **Targeted Revision Inline Trigger / Custom Item (`InlineRevisionFooter.jsx`):** `button:has-text("Other issue")` -> `input[placeholder="Specify other item to revise..."]` + `button:has-text("Add")` (Checklist modal variant: `input[placeholder="Add other item..."]`)
- **Targeted Revision Summary Input (`InlineRevisionFooter.jsx` / Modal):** `input[placeholder*="summary guidance"]`, `textarea[placeholder*="clear guidance"]`, `textarea[placeholder*="Provide clear instructions"]`
- **Targeted Revision Field Jump Targets (`ArtisanSetup.jsx`):** `[data-revision-target="shop_details"]`, `[data-revision-target="shop_address"]`, `[data-revision-target="valid_id"]`, `[data-revision-target="face_verification"]`, `[data-revision-target="payout_info"]`
- **Super Admin Resubmission Banner:** `div:has-text("Resubmitted Listing Under Review")`, `div:has-text("Resubmitted Application Under Review")`, `span:has-text("Revision Addressed")`
- **Super Admin Updated Field Pill (`InlineRevisionCard.jsx`):** `span:has-text("Updated")`, `span:has-text("Changed in Resubmission")`
- **Revision Audit Memo Banner (`RevisionFeedbackBanner.jsx`):** `div:has-text("Revision Requested")`, `span:has-text("Items Flagged")`, `span:has-text("Item Flagged")`
- **Restock Requests Table Feedback Trigger:** `td button:has-text("View Feedback")`, mobile card `button:has-text("View Notes")`
- **Restock Requests Feedback Drawer:** `div[role="dialog"] h2:has-text("Restock Request")`
- **Sponsorships Sidebar Feedback Trigger:** `div:has-text("Campaign History") button:has-text("View Feedback")`
- **Sponsorships Feedback Drawer:** `div[role="dialog"] h2:has-text("Sponsorship Application Notes")`

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
- **Payment Method Maya Radio:** `input[value="Maya"]`
- **Shop Voucher Selector / Drawer Trigger:** `button:has-text("Select Vouchers")`, `button:has-text("Browse Vouchers")`
- **Shop Voucher Manual Code Input:** `input[placeholder*="promo code" i]`
- **Shop Voucher Apply Button:** `button:has-text("Apply")`
- **Place Order Button:** `button:has-text("Place Order")`
- **Order Confirmation Number:** `span.font-mono`, `[data-order-number]`

### Artisan Workspace & Catalog Operations
- **New Shop Voucher Button (`/seller/vouchers`):** `button:has-text("New Voucher")`
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

### Walk-In POS Terminal, Void PIN & Accounting Sales Breakdown
- **Seller Walk-In POS Link (`/seller/pos`):** `a[href*="/seller/pos"]`, `button:has-text("Charge")`
- **POS Customer & Payment Inputs:** `input[placeholder*="Walk-In Guest"]`, `button:has-text("Cash")`, `button:has-text("GCash")`, `button:has-text("Maya")`
- **POS Payment Confirmation Modal (`PosPaymentModal.jsx`):** `button:has-text("Complete Sale")`
- **POS Utility Buttons (`PosProductGrid.jsx`):** `button:has-text("History")`, `button:has-text("QR Setup")`
- **POS History Drawer Filters (`PosRecentSalesDrawer.jsx`):** `select[aria-label="Filter by payment method"]`, `select[aria-label="Filter by date range"]`, `select[aria-label="Filter by branch"]`, `input[aria-label="Select specific date"]`, `button:has-text("Reset")`
- **Supervisor Void Authorization Box (`PosVoidAuthorizationBox.jsx`):** `button:has-text("Void")`, `input[placeholder="••••••"]`, `input[placeholder*="Min 5 chars"]`, `a[href*="/profile"]` (`Set up Void PIN in Profile Settings`)
- **Profile 6-Digit Void PIN Setup (`UpdatePosVoidPinForm.jsx`):** Section `"Walk-In POS Void PIN"`, `put(route('profile.pos-void-pin.update'))`
- **Orders Walk-In Tab & 80mm Receipt (`OrderManager.jsx`, `OrderHeader.jsx`):** `button:has-text("Walk-In")`, `select` option `"Walk-In POS (Cash, GCash, Maya)"`, `a:has-text("80mm")`
- **Accounting Sales Channel Filter (`AccountingFilterPanel.jsx`):** `select` (`Online Store (All)`, `Walk-In POS (All)`, `POS Cash`, `POS GCash`, `POS Maya`)

### Employees & Payroll Document Vault (`/hr`, `/hr/employees/{employee}/time-card?tab=documents`)
- **Employee Form Vault (`EmployeeDocumentsVaultCard.jsx`):** `button:has-text("Add Document")`, `input[type="file"][accept=".jpg,.jpeg,.png,.webp,.pdf"]`, `button:has-text("Attach to Employee")` / `button:has-text("Upload Document")`
- **TimeCard Records Documents Tab (`EmployeeDocumentsTable.jsx`, `EmployeeDocumentUploadModal.jsx`):** `button:has-text("Employee Documents")`, `button:has-text("Upload Document")`, `button[title="Preview document"]`, `a[title="Download document"]`
- **Document Preview Modal (`EmployeeDocumentPreviewModal.jsx`):** `a:has-text("Open")`, `a:has-text("Download")`

### Team Approvals & Governance Desk (`/seller/approvals`)
- **Approvals Tab Selectors:** `button:has-text("Pending")`, `button:has-text("Approved")`, `button:has-text("Declined")`, `button:has-text("All Domains")`
- **Domain Filter Pills:** `button:has-text("Products")`, `button:has-text("Discounts")`, `button:has-text("Compensation")`, `button:has-text("Returns")`
- **Batch Action Triggers:** `button:has-text("Select All")`, `button:has-text("Approve Selected")`
- **Approval Card Actions:** `button:has-text("Quick Approve")`, `button:has-text("Decline")`, `button:has-text("Review Details")`
- **Decline Modal Inputs (`ApprovalDeclineModal.jsx`):** `textarea[placeholder*="reason" i]`, `button:has-text("Confirm Decline")`
- **Approval Details Drawer (`ApprovalDetailsDrawer.jsx`):** `div[role="dialog"]`, `button:has-text("Approve Request")`, `button:has-text("Decline Request")`

### Dispute, Return Criteria & Review Operations
- **Buyer Request Return Button:** `button:has-text("Return")`
- **Return Modal Claim Reason Radio (`ReturnCriteriaFields.jsx`):** `input[name="damage_reason_code"]`
- **Return Modal Issue Details Textarea:** `textarea[placeholder*="Describe the defect"]`
- **Return Modal Photo Angle Slots (`ReturnPhotoAngleSlots.jsx`):** `input[type="file"][accept="image/*"]`
- **Return Modal Eligibility Checklist Buttons (`ReturnCriteriaFields.jsx`):** `button:has-text("I am submitting this claim")`
- **Submit Return Request Button (`ReturnRequestModal.jsx`):** `button:has-text("Submit Return Request")`
- **Admin Policies & Terms Page (`/admin/settings/policies`):** `button:has-text("Return & Refund Criteria")`, `button:has-text("Publish v")`, `button:has-text("Activate")`
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
| **Dispute Damage Proof** | `tests\fixtures\defense_assets\Product\Broken Image.png` | `input[type="file"][accept="image/*"]` (Slot 1: Item Defect / Damage Close-up) |
| **Dispute Packaging Proof** | `tests\fixtures\defense_assets\Proof of Delivery (POD).jpg` | `input[type="file"][accept="image/*"]` (Slot 2: Shipping Packaging & Waybill) |
