import React from "react";
import { 
    Clock, 
    PackageCheck, 
    Play, 
    Truck, 
    MapPin, 
    CheckCircle2, 
    RotateCcw, 
    CreditCard, 
    XCircle 
} from "lucide-react";

const OrderStatusBadge = ({ status }) => {
    const config = {
        Pending: {
            bg: "bg-amber-100",
            text: "text-amber-700",
            border: "border-amber-200",
            icon: Clock,
        },
        Accepted: {
            bg: "bg-blue-100",
            text: "text-blue-700",
            border: "border-blue-200",
            icon: PackageCheck,
        },
        Processing: {
            bg: "bg-indigo-100",
            text: "text-indigo-700",
            border: "border-indigo-200",
            icon: Play,
        },
        Shipped: {
            bg: "bg-sky-100",
            text: "text-sky-700",
            border: "border-sky-200",
            icon: Truck,
        },
        "Ready for Pickup": {
            bg: "bg-sky-100",
            text: "text-sky-700",
            border: "border-sky-200",
            icon: PackageCheck,
        },
        Delivered: {
            bg: "bg-teal-100",
            text: "text-teal-700",
            border: "border-teal-200",
            icon: MapPin,
        },
        Completed: {
            bg: "bg-green-100",
            text: "text-green-700",
            border: "border-green-200",
            icon: CheckCircle2,
        },
        "Refund/Return": {
            bg: "bg-orange-100",
            text: "text-orange-700",
            border: "border-orange-200",
            icon: RotateCcw,
        },
        Refunded: {
            bg: "bg-purple-100",
            text: "text-purple-700",
            border: "border-purple-200",
            icon: CreditCard,
        },
        Replaced: {
            bg: "bg-teal-100",
            text: "text-teal-700",
            border: "border-teal-200",
            icon: PackageCheck,
        },
        Rejected: {
            bg: "bg-red-100",
            text: "text-red-700",
            border: "border-red-200",
            icon: XCircle,
        },
        Cancelled: {
            bg: "bg-gray-100",
            text: "text-gray-500",
            border: "border-gray-200",
            icon: XCircle,
        },
    };

    const {
        bg,
        text,
        border,
        icon: Icon,
    } = config[status] || config["Pending"];
    const isUrgent = ["Pending", "Refund/Return"].includes(status);

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${bg} ${text} ${border} ${isUrgent ? "animate-pulse shadow-sm shadow-current/20" : ""}`}
        >
            <Icon size={12} />
            {status}
        </span>
    );
};

export default OrderStatusBadge;
