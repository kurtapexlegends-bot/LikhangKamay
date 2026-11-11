import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const PRODUCT_FIELD_TAB_MAP = {
    basic_info: "Essentials",
    description: "Essentials",
    pricing_stock: "Essentials",
    materials_bom: "Production",
    cover_media: "Media",
    model_3d: "Media",
};

const normStr = (val) => String(val ?? "").trim();

const normNumStr = (val) => {
    if (val === null || val === undefined || val === "") return "";
    const n = Number(val);
    return Number.isNaN(n) ? String(val).trim() : String(n);
};

const normalizeRecipeList = (recipes) =>
    (Array.isArray(recipes) ? recipes : []).map((r) => ({
        supply_id: String(r?.supply_id ?? ""),
        qty: normNumStr(r?.quantity_required),
    }));

export default function useProductRevisionProgress({
    isOpen,
    selectedProduct,
    activeRevision,
    data,
    previews,
    categories = [],
    activeFormTab,
    setActiveFormTab,
}) {
    const [highlightedKey, setHighlightedKey] = useState(null);
    const [scrollRequest, setScrollRequest] = useState(null);
    const highlightTimerRef = useRef(null);

    const revisionItems = useMemo(
        () => (Array.isArray(activeRevision?.items) ? activeRevision.items : []),
        [activeRevision]
    );

    const isRevisionActive = Boolean(
        isOpen
        && selectedProduct
        && (selectedProduct.status === "rejected" || selectedProduct.status === "flagged")
        && revisionItems.length > 0
    );

    const activeTabKeys = useMemo(() => {
        const keys = new Set();
        Object.entries(PRODUCT_FIELD_TAB_MAP).forEach(([key, tab]) => {
            if (tab === activeFormTab) keys.add(key);
        });
        return keys;
    }, [activeFormTab]);

    const addressedKeys = useMemo(() => {
        const next = new Set();
        if (!isRevisionActive || !selectedProduct) return next;

        const categoryList = categories.map((c) => (typeof c === "object" ? c.name : c));
        const initialCategory = categoryList.includes(selectedProduct.category)
            ? selectedProduct.category
            : categoryList[0] || "";

        if (
            normStr(data.name) !== normStr(selectedProduct.name)
            || normStr(data.category) !== normStr(initialCategory)
        ) {
            next.add("basic_info");
        }

        if (normStr(data.description) !== normStr(selectedProduct.description)) {
            next.add("description");
        }

        if (
            normNumStr(data.price) !== normNumStr(selectedProduct.price)
            || normNumStr(data.cost_price) !== normNumStr(selectedProduct.cost_price)
            || normNumStr(data.stock) !== normNumStr(selectedProduct.stock)
            || normNumStr(data.weight) !== normNumStr(selectedProduct.weight)
        ) {
            next.add("pricing_stock");
        }

        const initialRecipes = JSON.stringify(normalizeRecipeList(selectedProduct.recipes));
        const currentRecipes = JSON.stringify(normalizeRecipeList(data.recipes));
        if (
            (data.production_method || "resell") !== (selectedProduct.production_method || "resell")
            || Boolean(data.track_as_supply) !== Boolean(selectedProduct.track_as_supply)
            || currentRecipes !== initialRecipes
        ) {
            next.add("materials_bom");
        }

        const initialGalleryCount = Array.isArray(selectedProduct.gallery_paths)
            ? selectedProduct.gallery_paths.length
            : 0;
        const galleryChanged = (data.gallery || []).length > 0
            || (data.retained_gallery || []).length !== initialGalleryCount;

        if (Boolean(previews?.cover) && (Boolean(data.cover_photo) || galleryChanged)) {
            next.add("cover_media");
        }

        if (
            Boolean(data.model_3d)
            || (Array.isArray(data.model_3d_assets) && data.model_3d_assets.length > 0)
            || (data.model_3d_path || null) !== (selectedProduct.model_3d_path || null)
        ) {
            next.add("model_3d");
        }

        return next;
    }, [isRevisionActive, selectedProduct, categories, data, previews]);

    const tabRevisionStatus = useMemo(() => {
        const totals = {};
        const remaining = {};

        revisionItems.forEach((item) => {
            const tabName = PRODUCT_FIELD_TAB_MAP[item.key];
            if (!tabName) return;
            totals[tabName] = (totals[tabName] || 0) + 1;
            if (!addressedKeys.has(item.key)) {
                remaining[tabName] = (remaining[tabName] || 0) + 1;
            } else if (!(tabName in remaining)) {
                remaining[tabName] = 0;
            }
        });

        return { totals, remaining };
    }, [revisionItems, addressedKeys]);

    const handleGoToRevisionField = useCallback((key) => {
        const tabName = PRODUCT_FIELD_TAB_MAP[key];
        if (!tabName) return;

        if (highlightTimerRef.current) {
            clearTimeout(highlightTimerRef.current);
            highlightTimerRef.current = null;
        }
        setHighlightedKey(null);
        setScrollRequest({ key, targetTab: tabName, nonce: Date.now() });

        if (activeFormTab !== tabName && setActiveFormTab) {
            setActiveFormTab(tabName);
        }
    }, [activeFormTab, setActiveFormTab]);

    useEffect(() => {
        if (!isOpen || !scrollRequest || activeFormTab !== scrollRequest.targetTab) {
            return undefined;
        }

        let cancelled = false;
        let pollTimer = null;
        let attempts = 0;

        const scrollAndHighlight = () => {
            if (cancelled) return;
            const targetEl = document.querySelector(`[data-product-revision-target="${scrollRequest.key}"]`);

            if (targetEl) {
                const prefersReducedMotion = typeof window !== "undefined"
                    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

                targetEl.scrollIntoView({
                    behavior: prefersReducedMotion ? "auto" : "smooth",
                    block: "center",
                });

                setHighlightedKey(scrollRequest.key);
                setScrollRequest(null);

                highlightTimerRef.current = setTimeout(() => {
                    setHighlightedKey((current) => (current === scrollRequest.key ? null : current));
                }, 2200);
                return;
            }

            if (attempts < 12) {
                attempts += 1;
                pollTimer = setTimeout(scrollAndHighlight, 40);
            } else {
                setScrollRequest(null);
            }
        };

        const initialDelay = setTimeout(scrollAndHighlight, 40);

        return () => {
            cancelled = true;
            clearTimeout(initialDelay);
            if (pollTimer) clearTimeout(pollTimer);
        };
    }, [isOpen, scrollRequest, activeFormTab]);

    useEffect(() => () => {
        if (highlightTimerRef.current) {
            clearTimeout(highlightTimerRef.current);
        }
    }, []);

    return {
        addressedKeys,
        activeTabKeys,
        tabRevisionStatus,
        highlightedKey,
        handleGoToRevisionField,
    };
}
