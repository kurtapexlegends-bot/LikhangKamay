const fs = require('fs');

const flowcharts = [
    {
        title: "Likhang Kamay Home Landing Page",
        desc: "Figure {N} shows the flowchart of the Likhang Kamay Home Landing Page. It represents the standalone internet page that a user lands on, displaying the main banner and primary navigation, redirecting visitors to the shop catalog, login, or registration pages.",
        mermaid: `flowchart TD
    Start([Start]) --> Land[Access Home Landing Page]
    Land --> Option{Choose Option}
    Option -- Browse Shop --> NavigateShop[Redirect to Shop Catalog]
    Option -- Login --> NavigateLogin[Redirect to Login Page]
    Option -- Register --> NavigateRegister[Redirect to Registration]
    NavigateShop --> End([End])
    NavigateLogin --> End
    NavigateRegister --> End`
    },
    {
        title: "Likhang Kamay Login Page",
        desc: "Figure {N} shows the flowchart on the Login page. This section requires input of the user's email and password to access their respective workspaces, with role checking dictating the final dashboard.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Access Login Page]
    Access --> Input[/Input Email and Password/]
    Input --> Validate{Credentials Valid?}
    Validate -- NO --> Error[Display Login Error]
    Error --> Access
    Validate -- YES --> Role{Check User Role}
    Role -- Buyer --> BuyerDash[Redirect to Shop]
    Role -- Seller --> SellerDash[Redirect to Dashboard]
    Role -- Admin --> AdminDash[Redirect to Super Admin]
    BuyerDash --> End([End])
    SellerDash --> End
    AdminDash --> End`
    },
    {
        title: "Likhang Kamay Social Login",
        desc: "Figure {N} shows the flowchart for Social Login (Google or Facebook). The user authenticates through a third-party provider and is processed into the platform without traditional passwords.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Click Social Login Button]
    Access --> Provider[Redirect to Provider]
    Provider --> Success{Auth Success?}
    Success -- NO --> Error[Show Auth Error]
    Error --> Login[Return to Login]
    Success -- YES --> Existing{Existing User?}
    Existing -- YES --> Authenticate[Log User In]
    Existing -- NO --> CompleteProfile[Redirect to Complete Profile]
    Authenticate --> End([End])
    CompleteProfile --> End`
    },
    {
        title: "Likhang Kamay Complete Profile Page",
        desc: "Figure {N} shows the flowchart for the Complete Profile page, required after registering via a social provider to ensure standard system fields (e.g., contact info) are met.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Access Complete Profile Page]
    Access --> Input[/Input Missing Details/]
    Input --> Valid{Details Valid?}
    Valid -- NO --> Error[Show Validation Errors]
    Error --> Access
    Valid -- YES --> Save[Save Profile]
    Save --> Authenticate[Log User In]
    Authenticate --> End([End])`
    },
    {
        title: "Likhang Kamay Buyer Registration Page",
        desc: "Figure {N} shows the flowchart for standard Buyer Registration. It allows clients to create an account by inputting standard personal information to purchase artisanal goods.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Access Buyer Registration Page]
    Access --> Input[/Input Name, Email, Password, Terms/]
    Input --> Valid{Information Valid?}
    Valid -- NO --> Error[Show Form Errors]
    Error --> Access
    Valid -- YES --> Save[Create Buyer Account]
    Save --> Redirect[Redirect to Shop]
    Redirect --> End([End])`
    },
    {
        title: "Likhang Kamay Artisan Registration Page",
        desc: "Figure {N} shows the flowchart for Artisan Registration. It is used by creators to register their shop context and start selling items, prior to formal setup.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Access Artisan Registration Page]
    Access --> Input[/Input Name, Email, Password, Shop Terms/]
    Input --> Valid{Information Valid?}
    Valid -- NO --> Error[Show Form Errors]
    Error --> Access
    Valid -- YES --> Save[Create Artisan Account]
    Save --> Redirect[Redirect to Artisan Setup]
    Redirect --> End([End])`
    },
    {
        title: "Likhang Kamay Forgot Password Page",
        desc: "Figure {N} shows the flowchart for the Forgot Password process. It allows users who forgot their credentials to request a recovery link to their registered email.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Access Forgot Password Page]
    Access --> Input[/Input Email Address/]
    Input --> Exist{Email Exists?}
    Exist -- NO --> Error[Show Email Not Found]
    Error --> Access
    Exist -- YES --> Send[Send Reset Link]
    Send --> End([End])`
    },
    {
        title: "Likhang Kamay Change Password",
        desc: "Figure {N} shows the Change Password flowchart. This section involves clicking the reset link from the user's email and setting a new approved password.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Access Password Reset Link]
    Access --> Input[/Input New Password & Confirm/]
    Input --> Match{Passwords Match?}
    Match -- NO --> Error[Show Password Mismatch]
    Error --> Access
    Match -- YES --> Save[Update Database Password]
    Save --> Login[Redirect to Login]
    Login --> End([End])`
    },
    {
        title: "Likhang Kamay Artisan Setup Page",
        desc: "Figure {N} shows the flowchart for the Artisan Setup page. The newly registered artisan inputs business details and legal files (DTI/BIR) for approval.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Access Artisan Setup Page]
    Access --> Input[/Input Contact, Address, Legal Documents/]
    Input --> Valid{Details & Files Valid?}
    Valid -- NO --> Error[Show Submission Errors]
    Error --> Access
    Valid -- YES --> Save[Save Application Status as Pending]
    Save --> Redirect[Redirect to Pending Approval Viewer]
    Redirect --> End([End])`
    },
    {
        title: "Likhang Kamay Artisan Pending Approval Viewer",
        desc: "Figure {N} shows the flowchart for the Artisan Pending Viewer. Artisans are blocked from the workspace until their application is reviewed and approved by the Super Admin.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Access Pending Approval View]
    Access --> Process[Wait for Admin Action]
    Process --> Check{Status updated?}
    Check -- NO --> Process
    Check -- YES --> AccessSystem[Unlock Seller Workspace]
    AccessSystem --> End([End])`
    },
    {
        title: "Likhang Kamay Shop Catalog Page",
        desc: "Figure {N} shows the flowchart for the general Shop Catalog. Buyers and guests can browse, search, and filter available products listed across the platform.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Access Shop Catalog]
    Access --> Input[/Input Search Keyword or Filter/]
    Input --> View[View Product Results]
    View --> Action{Action Selected?}
    Action -- Select Product --> RedirectProduct[Go to Product Details]
    Action -- Select Seller --> RedirectSeller[Go to Seller Shop]
    RedirectProduct --> End([End])
    RedirectSeller --> End`
    },
    {
        title: "Likhang Kamay Seller Shop Page",
        desc: "Figure {N} shows the flowchart for navigating a specific Seller's Shop. It displays the artisan's profile, banner, and unique listed goods.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Access Seller Shop URL]
    Access --> Load[Load Seller Details and Products]
    Load --> View[View Products]
    View --> Action{Select Product?}
    Action -- YES --> RedirectProduct[Go to Product Page]
    Action -- NO --> View
    RedirectProduct --> End([End])`
    },
    {
        title: "Likhang Kamay Product Details Page",
        desc: "Figure {N} shows the flowchart for viewing a single product's details. It details the steps taken to assess pricing, description, stock, and available purchasing options.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Access Product Page]
    Access --> Load[Load Product Data & Images]
    Load --> Action{Choose Action?}
    Action -- Add to Cart --> AddCart[Trigger Add to Cart]
    Action -- Buy Now --> BuyNow[Trigger Direct Checkout]
    Action -- View 3D --> Open3D[Load 3D Viewer]
    AddCart --> End([End])
    BuyNow --> End
    Open3D --> Access`
    },
    {
        title: "Likhang Kamay Product 3D Viewer",
        desc: "Figure {N} shows the 3D Viewer flowchart. Buyers can securely interact with a 3-dimensional render of supported products before purchasing.",
        mermaid: `flowchart TD
    Start([Start]) --> Assess{Has 3D Model?}
    Assess -- NO --> End([End])
    Assess -- YES --> Render[Open 3D WebGL Viewer]
    Render --> Interact[/Rotate and Zoom Model/]
    Interact --> Close[Close Viewer]
    Close --> End`
    },
    {
        title: "Likhang Kamay User Profile Details Page",
        desc: "Figure {N} shows the User Profile updating flowchart. In this specific process, users edit their name, email, or contact numbers.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Access Profile Edit Page]
    Access --> Input[/Modify Profile Details/]
    Input --> Submit{Save Changes?}
    Submit -- NO --> Access
    Submit -- YES --> Validate{Valid Input?}
    Validate -- NO --> Error[Show Form Errors]
    Error --> Access
    Validate -- YES --> Update[Update Profile Record]
    Update --> End([End])`
    },
    {
        title: "Likhang Kamay Profile Delete Account Page",
        desc: "Figure {N} shows the Delete Account flowchart. If a user wishes to leave the platform, they must explicitly confirm their password to erase their profile.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Access Profile Settings]
    Access --> Action[Click Delete Account]
    Action --> Input[/Input Current Password/]
    Input --> Valid{Password Correct?}
    Valid -- NO --> Error[Show Error]
    Error --> Access
    Valid -- YES --> Erase[Delete User Records]
    Erase --> Redirect[Redirect to Welcome]
    Redirect --> End([End])`
    },
    {
        title: "Likhang Kamay User Addresses Management",
        desc: "Figure {N} shows the User Addresses flowchart. Uses can add, explicitly set defaults, or remove shipping and billing addresses for easier checkout.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Access Saved Addresses List]
    Access --> Action{Select Action}
    Action -- Add --> InputAdd[/Input New Address Details/]
    InputAdd --> SaveAdd[Save Address]
    Action -- Set Default --> MarkDefault[Update Default Flag]
    Action -- Delete --> Trash[Remove Address Record]
    SaveAdd --> Access
    MarkDefault --> Access
    Trash --> Access
    Action -- Exit --> End([End])`
    },
    {
        title: "Likhang Kamay Cart Manager",
        desc: "Figure {N} shows the Cart Management flowchart. Buyers can group desired products, seamlessly update item quantities within stock boundaries, or delete selection.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Open Cart Sidebar/Page]
    Access --> Load[Fetch Active Cart Items]
    Load --> Action{Choose Cart Action}
    Action -- Update Qty --> CheckStock{Stock Available?}
    CheckStock -- NO --> ErrStock[Show Limit Error]
    ErrStock --> Access
    CheckStock -- YES --> SaveQty[Update Database Quantity]
    SaveQty --> Access
    Action -- Remove --> DelItem[Remove Item from Cart]
    DelItem --> Access
    Action -- Checkout --> ValidateItems{Selected Items Exist?}
    ValidateItems -- YES --> ProceedCheckout[Proceed To Checkout]
    ValidateItems -- NO --> ErrEmpty[Show Empty Warning]
    ProceedCheckout --> End([End])
    ErrEmpty --> Access`
    },
    {
        title: "Likhang Kamay Checkout Page",
        desc: "Figure {N} shows the Checkout flowchart. The system resolves cart inputs, verifies stock in real-time, calculates shipping, selects payment method, and places the final order.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Access Checkout Page]
    Access --> Input[/Select Address & Shipping Method/]
    Input --> Cost[Calculate Shipping and Total Cost]
    Cost --> Pay[/Select Payment Method/]
    Pay --> Submit[Click Place Order]
    Submit --> Lock{Stock verified?}
    Lock -- NO --> StockError[Show Out of Stock Error]
    StockError --> Access
    Lock -- YES --> CreateOrder[Generate Order Records per Seller]
    CreateOrder --> ClearCart[Wipe Selected Cart Items]
    ClearCart --> HandOff[Redirect to Orders View]
    HandOff --> End([End])`
    },
    {
        title: "Likhang Kamay PayMongo Gateway",
        desc: "Figure {N} shows the online Payment flowchart. For non-COD orders, the buyer relies on an initialized PayMongo session and is securely redirected to pay.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Click Pay via PayMongo]
    Access --> Session[Initialize PayMongo Source]
    Session --> Redirect[Redirect to PayMongo Portal]
    Redirect --> Input[/Input Payment Details/]
    Input --> Valid{Transaction Successful?}
    Valid -- NO --> FailReturn[Return Cancelled/Failed status]
    Valid -- YES --> SuccessReturn[Return Success webhook]
    SuccessReturn --> MarkPaid[Update System Order to PAID]
    FailReturn --> End([End])
    MarkPaid --> End`
    },
    {
        title: "Likhang Kamay Buyer Active Orders",
        desc: "Figure {N} shows the Buyer Active Orders view flowchart. The buyer can track the real-time fulfillment status of purchases up until delivery and cancellation.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Access My Orders Page]
    Access --> Action{Order Status?}
    Action -- Pending --> CanCancel{Cancel Allowed?}
    CanCancel -- YES --> CancelReq[Trigger Order Cancellation]
    Action -- Shipped --> Wait[Wait for Courier]
    Action -- Delivered --> ReceiveReq[Confirm Item Received]
    CancelReq --> Access
    Wait --> Access
    ReceiveReq --> MarkComplete[Set Order Completed]
    MarkComplete --> End([End])
    CanCancel -- NO --> Access`
    },
    {
        title: "Likhang Kamay Buyer Order Return Request",
        desc: "Figure {N} shows the Buyer Returns process flowchart. Verification ensures buyers challenge completed orders strictly within the 1-day warranty timeframe.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Access Completed Order Details]
    Access --> Action[Click Request Return]
    Action --> Window{Within Warranty?}
    Window -- NO --> Reject[Show Warranty Expired]
    Reject --> End([End])
    Window -- YES --> Input[/Input Reason & Upload Proof/]
    Input --> Submit[Save Return Request]
    Submit --> Notify[Notify Seller]
    Notify --> End`
    },
    {
        title: "Likhang Kamay Buyer Reviews",
        desc: "Figure {N} shows the Product Review flowchart. Successful transactions grant buyers permissions to compose and rate the purchased item.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Access Completed Order Details]
    Access --> Action[Click Leave Review]
    Action --> Input[/Input Rating 1-5 and Comment/]
    Input --> Valid{Is Valid?}
    Valid -- NO --> Error[Show Error]
    Error --> Access
    Valid -- YES --> Save[Save Product Review]
    Save --> End([End])`
    },
    {
        title: "Likhang Kamay Chat System",
        desc: "Figure {N} shows the Real-time Chat messaging flowchart. It represents the active communication pipeline utilized between the Buyer and the Artisan.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Open Conversations Window]
    Access --> List[Load Chat Contacts]
    List --> Select[Select Counterpart]
    Select --> ViewMessages[Fetch Messages Context]
    ViewMessages --> Action{Action}
    Action -- Send Message --> Input[/Input Message Text/]
    Input --> Save[Store Message]
    Save --> Broadcast[Push Message Event]
    Broadcast --> ViewMessages
    Action -- Read --> MarkSeen[Broadcast Read Receipt]
    MarkSeen --> ViewMessages`
    },
    {
        title: "Likhang Kamay Seller Dashboard Page",
        desc: "Figure {N} shows the Seller Workspace Dashboard. Upon accessing their store backend, the artisan sees high-level sales statistics and navigation blocks.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Login to Dashboard]
    Access --> LoadStats[Load Overall Revenue & Highlights]
    LoadStats --> Render[Render Seller Dashboard]
    Render --> Action{Choose Module?}
    Action -- Operations --> GoOp[Open CRM/Content]
    Action -- ERP --> GoERP[Open HR/Procurement]
    GoOp --> End([End])
    GoERP --> End`
    },
    {
        title: "Likhang Kamay Seller Orders Manager",
        desc: "Figure {N} shows the Seller Orders Manager. The artisan utilizes this screen to systematically move orders from Pending to Accepted, Ready, and Shipped states.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Access Seller Orders Module]
    Access --> List[View Order Records grid]
    List --> Action{Order Update?}
    Action -- Accept --> StatusAccept[Change Status: Accepted]
    Action -- Ship --> StatusShip[Change Status: Shipped]
    Action -- Return --> AdminReturn[Process Refund Approval]
    StatusAccept --> Notify[Email Buyer Update]
    StatusShip --> Notify
    AdminReturn --> Notify
    Notify --> Access
    Action -- Exit --> End([End])`
    },
    {
        title: "Likhang Kamay Seller Products Manager",
        desc: "Figure {N} shows the Seller Products flowchart. It covers procedures for uploading, editing detailed item descriptions, stock pricing, and toggling visibility.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Access Seller Products Module]
    Access --> Action{Modify Action?}
    Action -- Add New --> Input[/Input Product Info, Pricing/]
    Action -- Edit --> EditInput[/Edit Existing Details/]
    Action -- Archive --> ToggleArchive[Set Product Inactive]
    Input --> Save[Store in DB]
    EditInput --> Update[Update DB]
    Save --> Access
    Update --> Access
    ToggleArchive --> Access
    Action -- Exit --> End([End])`
    },
    {
        title: "Likhang Kamay Seller 3D Manager",
        desc: "Figure {N} shows the 3D Asset Manager. Artisans have the option to bind and upload .glb files corresponding to their physical products for extended interaction.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Access 3D Models Module]
    Access --> Input[/Upload .glb File & Link Product/]
    Input --> Valid{File Valid?}
    Valid -- NO --> Error[Reject File Type]
    Error --> Access
    Valid -- YES --> SaveStorage[Store Model locally]
    SaveStorage --> SyncDB[Update Product Model Path]
    SyncDB --> End([End])`
    },
    {
        title: "Likhang Kamay Seller Analytics",
        desc: "Figure {N} shows the Seller Analytics flowchart. Subscribed sellers observe and generate comprehensive graphical reports and export CSV records via this interface.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Access Analytics Module]
    Access --> Select[/Filter Date Bounds/]
    Select --> Query[Generate Graphs and Charts]
    Query --> PlanGate{Subscribed properly?}
    PlanGate -- NO --> Deny[Display Export Locked]
    Deny --> End([End])
    PlanGate -- YES --> AllowExport[Enable CSV Output]
    AllowExport --> Export[Download Records]
    Export --> End`
    },
    {
        title: "Likhang Kamay Seller Subscriptions Page",
        desc: "Figure {N} shows the Subscriptions modification flowchart. Sellers move between Standard, Premium, and Elite limitation barriers by confirming billing plan adjustments.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Access Subscriptions Settings]
    Access --> Load[View Current Plan]
    Load --> Select[/Choose Upgrade or Downgrade/]
    Select --> ValidateLimits{Limits compliant?}
    ValidateLimits -- NO --> WarnLimits[Show product downsize warning]
    WarnLimits --> Access
    ValidateLimits -- YES --> Process[Trigger Sandbox Billing Update]
    Process --> UpdateDB[Store new package ID]
    UpdateDB --> End([End])`
    },
    {
        title: "Likhang Kamay Shop Settings Page",
        desc: "Figure {N} shows the Shop Settings modification flowchart. Artisans freely configure and upload custom shop banners, logos, and business narratives here.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Access Shop Appearance Settings]
    Access --> Input[/Upload Logo/Banner & Describe Shop/]
    Input --> Save[Validate and Process Files]
    Save --> Update[Update User Shop Data]
    Update --> Publish[Render Updated Public Storefront]
    Publish --> End([End])`
    },
    {
        title: "Likhang Kamay Seller Module/Private Settings",
        desc: "Figure {N} shows the Module customization page. It handles whether specific sub-ERP blocks (e.g., HR, Procurement) are shown or hidden based on artisan preference.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Access Module Features List]
    Access --> Toggle[/Turn On/Off Features/]
    Toggle --> Save[Save Preferences Array]
    Save --> ReloadNav[Hard Refresh Workspace Navigation]
    ReloadNav --> End([End])`
    },
    {
        title: "Likhang Kamay Seller HR Employee List",
        desc: "Figure {N} shows the Human Resources employee table flowchart. The artisan registers physical workers here to calculate their eventual daily wages.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Access HR Employees view]
    Access --> Action{Choose HR Action}
    Action -- Add Worker --> Form[/Input Employee details and rate/]
    Form --> Store[Create HR Employee]
    Action -- Terminate Worker --> Delete[Terminate Employee Record]
    Store --> Access
    Delete --> Access
    Action -- Exit --> End([End])`
    },
    {
        title: "Likhang Kamay Seller HR Payroll Generator",
        desc: "Figure {N} shows the HR Payroll flowchart. The system utilizes accumulated daily rates and selected payment dates to output cleanly formulated monetary amounts.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Access HR Payroll Panel]
    Access --> Input[/Select Employee and Date Range/]
    Input --> Logic[Compute Wages based on Daily Rate]
    Logic --> Deduct{Cash Advances Present?}
    Deduct -- YES --> Subtract[Subtract Deduction from Wage]
    Deduct -- NO --> Emit[Generate Final Payout]
    Subtract --> Emit
    Emit --> Store[Log Payroll Transaction Context]
    Store --> End([End])`
    },
    {
        title: "Likhang Kamay Procurement Supplies Manager",
        desc: "Figure {N} shows the Procurement Supplies mapping. Raw materials are catalogued comprehensively to track specific business restock cycles and limits.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Access Procurement Module]
    Access --> Logic{Material action?}
    Logic -- Add Material --> Form[/Input Item Name and Unit format/]
    Logic -- Trigger Delete --> Erase[Archive Material Data]
    Form --> Save[Save Material Record]
    Save --> Access
    Erase --> Access
    Logic -- Exit --> End([End])`
    },
    {
        title: "Likhang Kamay Stock Request Tracker",
        desc: "Figure {N} shows the Stock Request flowchart. Backoffice staffs push request metrics to accounting to solicit funding distributions for replenishing items.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Access Stock Requests Window]
    Access --> Form[/Create Request (Cost & Item)/]
    Form --> SubmitReq[State sets to PENDING_FUNDS]
    SubmitReq --> Check[Wait for Accounting Action]
    Check --> Action{Decision Released?}
    Action -- Granted --> Finalize[Status Updates to FUNDED]
    Action -- Denied --> Cancel[Status Updates to CANCELLED]
    Finalize --> End([End])
    Cancel --> End`
    },
    {
        title: "Likhang Kamay Seller Accounting Module",
        desc: "Figure {N} shows the internal Accounting flowchart. Financial aggregates and income transfers are approved or cleared by store accountants for payroll or restocks.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Access Accounting Panel]
    Access --> Logic{Finance Task?}
    Logic -- Settle Payroll --> Fund[Settle Processed Payroll Array]
    Logic -- Fund Procurement --> GrantReq[Release Funds to Inventory]
    Fund --> Ledger[Subtract Global Operating Balance]
    GrantReq --> Ledger
    Ledger --> End([End])
    Logic -- Exit --> End`
    },
    {
        title: "Likhang Kamay Staff Roles Management",
        desc: "Figure {N} shows the Staff Roles mapping mechanism. It governs how an artisan assigns modular view permissions to extra clerk users via invites.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Access Staff Management View]
    Access --> Logic{Staff Logic?}
    Logic -- Invite Staff --> Form[/Input Sub-User Email/]
    Logic -- Adjust Role --> Adjust[Modify Subsystem Privileges]
    Form --> SendInvite[Generate Backend Invite Sequence]
    Adjust --> VerifyRole[Apply ACL Permissions]
    SendInvite --> Access
    VerifyRole --> Access
    Logic -- Exit --> End([End])`
    },
    {
        title: "Likhang Kamay Super Admin Dashboard",
        desc: "Figure {N} shows the global administrative Dashboard perspective. This acts as the secure command hub for compiling platform revenue aggregates and activity metrics.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Access Admin Backend]
    Access --> Action{Admin Task?}
    Action -- View Sales --> Stats[Display Aggregated System Revenue]
    Action -- View Subs --> Subs[Display Member Activations list]
    Stats --> End([End])
    Subs --> End
    Action -- Exit --> End`
    },
    {
        title: "Likhang Kamay Super Admin Artisan Approvals",
        desc: "Figure {N} shows the Super Admin logic applied to verifying nascent shops. They systematically review legal files to deploy the verified seller status.",
        mermaid: `flowchart TD
    Start([Start]) --> Access[Access Pending Artisans Request List]
    Access --> Select[Select Target Application]
    Select --> View[/Examine uploaded BIR/DTI/ID Data/]
    View --> Valid{Legitimate Documents?}
    Valid -- NO --> Reject[Mark user as Rejected Mode]
    Reject --> ReturnHome[Revert app visibility status]
    ReturnHome --> End([End])
    Valid -- YES --> Approve[Set Platform Status to Approved]
    Approve --> Notify[Dispatch System Success Notification]
    Notify --> End`
    },
    {
        title: "Likhang Kamay Log Out Action",
        desc: "Figure {N} shows the universal Log Out command structure. When concluding platform activity, participants invalidate their web session parameters entirely.",
        mermaid: `flowchart TD
    Start([Start]) --> Action[Click Log Out Mechanism]
    Action --> Clear[Purge Local Storage and Auth Session]
    Clear --> Redirect[Redirect user to Initial Landing Format]
    Redirect --> End([End])`
    }
];

let markdown = `# Chapter 3 - System Flowcharts of Likhang Kamay\n\nThis section presents the completely granular system flowcharts of Likhang Kamay. Each figure traces isolated, distinct user paths mirroring the actual system architecture, web components, and routes, following standard Top-Down vertical documentation logic mapped similarly to a Legal Case Management framework format in granularity.\n\n---\n\n`;

flowcharts.forEach((item, index) => {
    const figNum = index + 1;
    markdown += `## Figure 3.${figNum}. ${item.title}\n\n`;
    markdown += `\`\`\`mermaid\n${item.mermaid}\n\`\`\`\n\n`;
    markdown += `${item.desc.replace('{N}', "3." + figNum)}\n\n---\n\n`;
});

fs.writeFileSync('CAPSTONE DOCX/system_flowcharts.md', markdown);
console.log('Flowcharts written successfully!');
