import React from 'react';
import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react';
import { RefreshCw } from 'lucide-react';

export default function QuickRestock({ item, canEdit, onRestock, unit = 'units', type = 'product' }) {
    const [amount, setAmount] = React.useState("");
    const stockValue = type === 'product' ? item.stock : item.quantity;

    const handleSubmit = (e, close) => {
        e.preventDefault();
        const numAmount = parseInt(amount);
        if (!numAmount || numAmount <= 0) return;
        
        onRestock(item, numAmount);
        setAmount("");
        close();
    };

    return (
        <Popover className="relative">
            {({ open, close }) => (
                <>
                    <PopoverButton
                        disabled={!canEdit}
                        title={canEdit ? "Click to quick restock" : "Read only"}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all hover:ring-2 hover:ring-offset-1 focus:outline-none ${
                            stockValue < (item.min_stock || 10) 
                                ? "bg-rose-50 text-rose-600 border-rose-100 hover:ring-rose-200" 
                                : "bg-emerald-50 text-emerald-600 border-emerald-100 hover:ring-emerald-200"
                        }`}
                    >
                        {stockValue} {unit}
                    </PopoverButton>

                    <Transition
                        as={React.Fragment}
                        enter="transition ease-out duration-200"
                        enterFrom="opacity-0 translate-y-1"
                        enterTo="opacity-100 translate-y-0"
                        leave="transition ease-in duration-150"
                        leaveFrom="opacity-100 translate-y-0"
                        leaveTo="opacity-0 translate-y-1"
                    >
                        <PopoverPanel className="absolute z-[100] mt-2 w-48 -translate-x-1/2 left-1/2 transform rounded-2xl bg-white p-4 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-stone-100 focus:outline-none">
                            <form onSubmit={(e) => handleSubmit(e, close)} className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-1.5">
                                        Quick Restock
                                    </label>
                                    <input
                                        autoFocus
                                        type="number"
                                        min="1"
                                        placeholder="Add amount..."
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full rounded-xl border-stone-200 bg-stone-50 py-2 px-3 text-sm focus:border-clay-500 focus:ring-clay-500"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={close}
                                        className="flex-1 rounded-lg px-2 py-1.5 text-[11px] font-bold text-stone-500 hover:bg-stone-50 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!amount || amount <= 0}
                                        className="flex-1 rounded-lg bg-clay-600 px-2 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-clay-700 transition disabled:opacity-50"
                                    >
                                        Restock
                                    </button>
                                </div>
                            </form>
                        </PopoverPanel>
                    </Transition>
                </>
            )}
        </Popover>
    );
}
