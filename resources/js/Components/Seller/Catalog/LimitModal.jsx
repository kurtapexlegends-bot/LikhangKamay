import React from "react";
import Modal from "@/Components/Modal";
import { Link } from "@inertiajs/react";
import { Crown } from "lucide-react";

export default function LimitModal({
    isOpen,
    onClose,
    subscription,
    onSaveAsDraft,
}) {
    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="sm">
            <div className="p-5 sm:p-6 text-center select-none">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-amber-50 shadow-sm relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-amber-200 to-transparent opacity-50"></div>
                    <Crown size={28} className="text-amber-500 relative z-10" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Upgrade to Add More
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                    You have reached your{" "}
                    {subscription?.plan === "free" ? "Standard" : "Premium"}{" "}
                    plan limit of{" "}
                    <span className="font-bold text-gray-900">
                        {subscription?.limit} active products
                    </span>
                    . Upgrade your plan to activate more products and boost your sales!
                </p>
                <div className="flex flex-col gap-3">
                    <Link
                        href={route("seller.subscription")}
                        className="w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-stone-900 to-clay-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-stone-900/20 active:scale-[0.98] transition min-h-[44px]"
                    >
                        View Subscription Plans
                    </Link>
                    <button
                        type="button"
                        onClick={onSaveAsDraft}
                        className="w-full px-4 py-3 text-gray-500 font-bold hover:bg-stone-50 rounded-xl transition min-h-[44px]"
                    >
                        Save as Draft for Now
                    </button>
                </div>
            </div>
        </Modal>
    );
}
