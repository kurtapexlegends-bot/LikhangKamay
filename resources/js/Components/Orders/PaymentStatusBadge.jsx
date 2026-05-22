import React from "react";
import { CreditCard } from "lucide-react";

const PaymentStatusBadge = ({ status, method }) => {
    const config = {
        pending: {
            bg: "bg-yellow-100",
            text: "text-yellow-700",
            border: "border-yellow-200",
            label: "Unpaid",
        },
        paid: {
            bg: "bg-green-100",
            text: "text-green-700",
            border: "border-green-200",
            label: "Paid",
        },
        refunded: {
            bg: "bg-purple-100",
            text: "text-purple-700",
            border: "border-purple-200",
            label: "Refunded",
        },
    };

    const { bg, text, border, label } = config[status] || config["pending"];

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${bg} ${text} ${border}`}
        >
            <CreditCard size={10} />
            {label} - {method || "COD"}
        </span>
    );
};

export default PaymentStatusBadge;
