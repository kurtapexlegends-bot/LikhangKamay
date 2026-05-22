const fs = require('fs');
const path = require('path');

const backupPath = path.join(__dirname, '..', 'resources', 'js', 'Pages', 'Seller', 'OrderManager.backup.jsx');
const targetPath = path.join(__dirname, '..', 'resources', 'js', 'Components', 'Seller', 'OrderManager', 'OrderDetailsCard.jsx');

const lines = fs.readFileSync(backupPath, 'utf8').split('\n');

// 1553 is index 1552. 2795 is index 2794.
const jsxLines = lines.slice(1552, 2795);

const componentTemplate = `import React from "react";
import { motion } from "framer-motion";
import {
    MapPin,
    PackageCheck,
    Truck,
    User,
    MessageCircle,
    PackageOpen,
    Hash,
    CameraIcon,
    AlertTriangle,
    Activity,
    ExternalLink,
    CheckCircle2,
    XCircle,
    Clock,
    CreditCard,
    RotateCcw,
    Store,
    Printer,
    FileText,
    Check
} from "lucide-react";
import OrderStatusBadge from "@/Components/Orders/OrderStatusBadge";
import PaymentStatusBadge from "@/Components/Orders/PaymentStatusBadge";
import OrderTimeline from "@/Components/Orders/OrderTimeline";
import {
    sellerDeliverySummary,
    sellerIssueSummary,
    sellerCourierTrackingState,
    formatTimelineStamp,
    timelineSourceTone,
    isLalamoveManagedOrder,
    humanizeAddressType
} from "@/utils/orderUtils";

export default function OrderDetailsCard({
    order,
    idx,
    selectedOrderIds,
    toggleOrderSelection,
    canAccessMessages,
    openChat,
    canEditOrders,
    updateOrderStatus,
    initiateShipping,
    openReplacementApproval
}) {
    const issueSummary = sellerIssueSummary(order);

    return (
${jsxLines.map(l => '        ' + l.replace(/^ {36}/, '')).join('\n')}
    );
}
`;

fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.writeFileSync(targetPath, componentTemplate);
console.log("OrderDetailsCard.jsx created successfully!");
