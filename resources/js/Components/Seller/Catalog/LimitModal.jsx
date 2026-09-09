/* global route */
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
    const planName = subscription?.planLabel 
        || (subscription?.plan === "super_premium" ? "Elite" : subscription?.plan === "premium" ? "Premium" : "Standard");

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="sm">
            <div className="p-5 sm:p-6 text-center select-none bg-white rounded-2xl">
                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200/80 shadow-2xs">
                    <Crown size={26} className="text-amber-700" />
                </div>
                <h2 className="text-lg font-bold text-stone-900 mb-1.5">
                    Product Limit Reached
                </h2>
                <p className="text-xs text-stone-500 mb-6 leading-relaxed">
                    You have reached your {planName} plan limit of{" "}
                    <span className="font-bold text-stone-800">
                        {subscription?.limit} active products
                    </span>
                    . Upgrade your plan to display more items in your shop.
                </p>
                <div className="flex flex-col gap-2.5">
                    <Link
                        href={route("seller.subscription")}
                        className="w-full inline-flex items-center justify-center px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-sm active:scale-[0.98] transition min-h-[42px]"
                    >
                        View Available Plans
                    </Link>
                    <button
                        type="button"
                        onClick={onSaveAsDraft}
                        className="w-full px-4 py-2 text-stone-600 text-xs font-semibold hover:bg-stone-50 rounded-xl transition min-h-[38px]"
                    >
                        Save as Draft for Now
                    </button>
                </div>
            </div>
        </Modal>
    );
}
