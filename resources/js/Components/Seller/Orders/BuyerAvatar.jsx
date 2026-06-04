import React from "react";

export default function BuyerAvatar({ customerName, avatarUrl }) {
    const [hasError, setHasError] = React.useState(false);
    
    if (avatarUrl && !hasError) {
        return (
            <img
                src={avatarUrl}
                alt={customerName || "Customer"}
                className="h-8 w-8 shrink-0 rounded-full object-cover border border-stone-200 shadow-sm"
                onError={() => setHasError(true)}
            />
        );
    }
    
    return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-clay-50 border border-clay-100 text-clay-700 font-bold text-xs uppercase shadow-sm">
            {customerName ? customerName.slice(0, 2) : "??"}
        </div>
    );
}
