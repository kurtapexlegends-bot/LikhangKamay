const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'resources', 'js', 'Pages', 'Seller', 'OrderManager.backup.jsx');
const dst = path.join(__dirname, '..', 'resources', 'js', 'Pages', 'Seller', 'OrderManager.jsx');

const lines = fs.readFileSync(src, 'utf8').split('\n');

const newLines = [];

for(let i=0; i<lines.length; i++) {
   // 1. Add imports at the start of useSellerModuleAccess import
   if (lines[i].includes('import { useSellerModuleAccess } from "@/hooks/useSellerModuleAccess";')) {
        newLines.push(lines[i]);
        newLines.push('import OrderTabs from "@/Components/Seller/OrderManager/OrderTabs";');
        newLines.push('import OrderDetailsCard from "@/Components/Seller/OrderManager/OrderDetailsCard";');
        newLines.push('import ShippingModal from "@/Components/Seller/OrderManager/ShippingModal";');
        newLines.push('import ReplacementModal from "@/Components/Seller/OrderManager/ReplacementModal";');
        continue;
   }

   // 2. Tabs Block
   if (i === 1333) { // line 1334
      newLines.push('                        <OrderTabs activeTab={activeTab} getCount={getCount} handleTabChange={handleTabChange} />');
      i = 1395; // skip to 1395 so next iteration is 1396 (which is index for line 1397)
      continue;
   }

   // 3. Map Block
   if (i === 1549) {
      newLines.push('                            paginatedOrders.map((order, idx) => (');
      newLines.push('                                <OrderDetailsCard');
      newLines.push('                                    key={order.id}');
      newLines.push('                                    order={order}');
      newLines.push('                                    idx={idx}');
      newLines.push('                                    selectedOrderIds={selectedOrderIds}');
      newLines.push('                                    toggleOrderSelection={toggleOrderSelection}');
      newLines.push('                                    canAccessMessages={canAccessMessages}');
      newLines.push('                                    openChat={openChat}');
      newLines.push('                                    canEditOrders={canEditOrders}');
      newLines.push('                                    updateOrderStatus={initiateStatusUpdate}');
      newLines.push('                                    initiateShipping={openShippingModal}');
      newLines.push('                                    openReplacementApproval={openReplacementModal}');
      newLines.push('                                />');
      newLines.push('                            ))');
      i = 2795; // skip to 2795 so next iteration is 2796 (`) : (`)
      continue;
   }

   // 4. Modals Block
   if (i === 2873) {
      newLines.push('            {/* --- FULFILLMENT COMPOSER MODAL --- */}');
      newLines.push('            <ShippingModal');
      newLines.push('                shippingModal={shippingModal}');
      newLines.push('                setShippingModal={setShippingModal}');
      newLines.push('                orderToShip={paginatedOrders.find(o => o.id === shippingModal.orderId)}');
      newLines.push('                closeShippingModal={closeShippingModal}');
      newLines.push('                submitShipping={submitShipping}');
      newLines.push('                revokeShippingPreview={revokeShippingPreview}');
      newLines.push('                canEditOrders={canEditOrders}');
      newLines.push('            />');
      newLines.push('');
      newLines.push('            {/* --- REPLACEMENT MODAL --- */}');
      newLines.push('            <ReplacementModal');
      newLines.push('                isOpen={replacementModal.isOpen}');
      newLines.push('                onClose={closeReplacementModal}');
      newLines.push('                processing={replacementModal.processing}');
      newLines.push('                resolutionDescription={replacementModal.resolutionDescription}');
      newLines.push('                error={replacementModal.error}');
      newLines.push('                canEditOrders={canEditOrders}');
      newLines.push('                setReplacementModal={setReplacementModal}');
      newLines.push('                submitReplacementApproval={submitReplacementApproval}');
      newLines.push('            />');
      
      i = 3399; // skip to 3399 so next iteration is 3400
      continue;
   }

   newLines.push(lines[i]);
}

fs.writeFileSync(dst, newLines.join('\n'));
console.log("OrderManager.jsx built successfully!");
