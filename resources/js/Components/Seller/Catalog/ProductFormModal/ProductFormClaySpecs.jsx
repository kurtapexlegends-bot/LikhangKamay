import React from "react";
import TextInput from "@/Components/TextInput";
import InputLabel from "@/Components/InputLabel";
import Checkbox from "@/Components/Checkbox";

const modalFieldClass =
    "w-full mt-1 rounded-xl border-gray-300 bg-white text-sm text-gray-900 shadow-none focus:border-clay-500 focus:ring-clay-500";

export default function ProductFormClaySpecs({
    data,
    setData,
    errors,
}) {
    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                    <InputLabel value="Clay Type" />
                    <select
                        className={`${modalFieldClass} min-h-[44px] sm:min-h-0`}
                        value={data.clay_type}
                        onChange={(e) => setData("clay_type", e.target.value)}
                    >
                        {["Stoneware", "Porcelain", "Terracotta", "Earthenware"].map((t) => (
                            <option key={t} value={t}>
                                {t}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <InputLabel value="Glaze Type" />
                    <select
                        className={`${modalFieldClass} min-h-[44px] sm:min-h-0`}
                        value={data.glaze_type}
                        onChange={(e) => setData("glaze_type", e.target.value)}
                    >
                        {["Matte", "Glossy", "Satin", "Crystalline", "Unglazed"].map((t) => (
                            <option key={t} value={t}>
                                {t}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <InputLabel value="Firing Method" />
                    <select
                        className={`${modalFieldClass} min-h-[44px] sm:min-h-0`}
                        value={data.firing_method}
                        onChange={(e) => setData("firing_method", e.target.value)}
                    >
                        {["Electric Kiln", "Gas Kiln", "Wood Fired", "Raku"].map((t) => (
                            <option key={t} value={t}>
                                {t}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center">
                    <label className="group flex cursor-pointer items-center gap-3">
                        <Checkbox
                            name="food_safe"
                            checked={data.food_safe}
                            onChange={(e) => setData("food_safe", e.target.checked)}
                        />
                        <div>
                            <span className="text-sm font-bold text-gray-700 transition group-hover:text-clay-600">
                                Food Safe
                            </span>
                            <p className="text-xs text-gray-500">
                                Safe for eating / Lead-free
                            </p>
                        </div>
                    </label>
                </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                    Dimensions
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                        <InputLabel value="Height (cm)" />
                        <TextInput
                            type="number"
                            min="0"
                            step="any"
                            className="w-full mt-1 min-h-[44px] sm:min-h-0"
                            value={data.height}
                            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                            onChange={(e) => setData("height", e.target.value.replace(/-/g, ""))}
                        />
                    </div>
                    <div>
                        <InputLabel value="Width (cm)" />
                        <TextInput
                            type="number"
                            min="0"
                            step="any"
                            className="w-full mt-1 min-h-[44px] sm:min-h-0"
                            value={data.width}
                            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                            onChange={(e) => setData("width", e.target.value.replace(/-/g, ""))}
                        />
                    </div>
                    <div>
                        <InputLabel value="Weight (g)" />
                        <TextInput
                            type="number"
                            min="0"
                            step="any"
                            className="w-full mt-1 min-h-[44px] sm:min-h-0"
                            value={data.weight}
                            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                            onChange={(e) => setData("weight", e.target.value.replace(/-/g, ""))}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
