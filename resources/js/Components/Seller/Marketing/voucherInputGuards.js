export const blockInvalidNumericKeys = (e, { integerOnly = false } = {}) => {
    const blocked = ["-", "+", "e", "E"];
    if (integerOnly) {
        blocked.push(".", ",");
    }
    if (blocked.includes(e.key)) {
        e.preventDefault();
    }
};

export const sanitizeNumericInput = (
    rawValue,
    { max = null, integerOnly = false } = {}
) => {
    const str = String(rawValue ?? "");
    if (str === "") return "";

    let cleaned;
    if (integerOnly) {
        cleaned = str.replace(/[^0-9]/g, "");
    } else {
        cleaned = str.replace(/[^0-9.]/g, "");
        const firstDot = cleaned.indexOf(".");
        if (firstDot !== -1) {
            const beforeDot = cleaned.slice(0, firstDot);
            const afterDot = cleaned.slice(firstDot + 1).replace(/\./g, "").slice(0, 2);
            cleaned = `${beforeDot}.${afterDot}`;
        }
    }

    if (cleaned === "" || cleaned === ".") return integerOnly ? "" : cleaned === "." ? "0." : "";

    const num = Number(cleaned);
    if (Number.isNaN(num)) return "";

    if (max !== null && num > max) {
        return String(max);
    }

    return cleaned;
};

export const normalizeNumericBlur = (
    rawValue,
    { min = 0, max = null, integerOnly = false, fallbackEmpty = "" } = {}
) => {
    const trimmed = String(rawValue ?? "").trim();
    if (trimmed === "") {
        return fallbackEmpty === "" ? "" : String(fallbackEmpty);
    }

    let num = Number(trimmed);
    if (Number.isNaN(num)) {
        return fallbackEmpty === "" ? "" : String(fallbackEmpty);
    }

    if (integerOnly) {
        num = Math.floor(num);
    } else {
        num = Math.round(num * 100) / 100;
    }

    if (num < min) {
        num = min;
    }
    if (max !== null && num > max) {
        num = max;
    }

    return String(num);
};

export const sanitizePromoCode = (rawValue) =>
    String(rawValue ?? "")
        .toUpperCase()
        .replace(/[^A-Z0-9_-]/g, "")
        .slice(0, 50);
