/**
 * Philippine Legal & Compliance Document OCR Parser.
 *
 * Extracts and cross-verifies official identifiers from client-side OCR text:
 * - Mayor's / Business Permit (Permit #, LGU Cavite jurisdiction)
 * - DTI Certificate of Business Name Registration (Cert #, Shop Name match)
 * - BIR Form 2303 / TIN ID (Philippine 9- or 12-digit TIN format)
 * - Philippine Government Issued IDs (Driver's License, PhilID, UMID, Passport, PRC)
 */

export const CAVITE_LGUS = [
    'IMUS',
    'BACOOR',
    'DASMARINAS',
    'DASMARIÑAS',
    'SILANG',
    'GENERAL TRIAS',
    'GEN. TRIAS',
    'TAGAYTAY',
    'KAWIT',
    'NOVELETA',
    'ROSARIO',
    'TRECE MARTIRES',
    'ALFONSO',
    'AMADEO',
    'CARMONA',
    'INDANG',
    'MAGALLANES',
    'MARAGONDON',
    'MENDEZ',
    'NAIC',
    'TERNATE',
    'GENERAL EMILIO AGUINALDO',
    'GENERAL MARIANO ALVAREZ',
    'GMA',
    'CAVITE CITY',
];

const STOP_WORDS = new Set([
    'crafts', 'craft', 'studio', 'workshops', 'workshop', 'shop', 'store',
    'ph', 'philippines', 'handmade', 'pottery', 'ceramics', 'arts', 'art',
    'enterprises', 'trading', 'manufacturing', 'services', 'co', 'company',
    'the', 'and', 'of', 'in', 'at', 'by', 'for',
]);

/**
 * Normalize raw string for fuzzy token matching.
 */
export function normalizeText(str = '') {
    return String(str || '')
        .toUpperCase()
        .replace(/Ñ/g, 'N')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Format 9 or 12 raw digits into standard Philippine TIN layout:
 * 123456789 -> 123-456-789
 * 123456789000 -> 123-456-789-000
 */
export function formatPhilippineTin(digits = '') {
    const clean = String(digits || '').replace(/\D/g, '');
    if (clean.length === 9) {
        return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6, 9)}`;
    }
    if (clean.length >= 12) {
        return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6, 9)}-${clean.slice(9, 12)}`;
    }
    return digits;
}

/**
 * Cross-match extracted text against an expected shop name.
 */
export function matchShopName(extractedText = '', expectedShopName = '') {
    if (!expectedShopName || !extractedText) return false;

    const normText = normalizeText(extractedText);
    const normShop = normalizeText(expectedShopName);

    if (normText.includes(normShop)) return true;

    // Check individual significant tokens
    const tokens = normShop
        .split(' ')
        .filter((w) => w.length >= 3 && !STOP_WORDS.has(w.toLowerCase()));

    if (tokens.length === 0) {
        return normText.includes(normShop);
    }

    const matchedTokens = tokens.filter((token) => normText.includes(token));
    const matchRatio = matchedTokens.length / tokens.length;

    // If >= 50% of significant tokens match or if the longest token matches
    const longestToken = [...tokens].sort((a, b) => b.length - a.length)[0];
    if (longestToken && longestToken.length >= 5 && normText.includes(longestToken)) {
        return true;
    }

    return matchRatio >= 0.5;
}

/**
 * Parse Mayor's / Business Permit
 */
export function parseBusinessPermit(rawText = '') {
    const text = normalizeText(rawText);
    const signals = [];

    const isMayorPermit = text.includes("MAYOR") || text.includes("MAYORS PERMIT") || text.includes("BUSINESS PERMIT");
    const isLguOrBarangay = text.includes("MUNICIPALITY") || text.includes("CITY OF") || text.includes("OFFICE OF THE MAYOR") || text.includes("BARANGAY");
    const isRepublic = text.includes("REPUBLIC OF THE PHILIPPINES");

    if (isMayorPermit) signals.push("Mayor's / Business Permit");
    if (isLguOrBarangay) signals.push('LGU / Municipal Authority');
    if (isRepublic) signals.push('Republic of the Philippines');

    const matchedLgu = CAVITE_LGUS.find((lgu) => text.includes(lgu));
    if (matchedLgu) signals.push(`Cavite LGU: ${matchedLgu}`);

    // Permit Number Regex (requires NO, NUMBER, #, or delimiter so 'BUSINESS PERMIT' is not captured as value)
    let permitNumber = null;
    const permitMatch = rawText.match(/(?:PERMIT\s*(?:NO|NUMBER|#)\.?\s*[:-]?\s*|BP\s*(?:NO|NUMBER|#)\.?\s*[:-]?\s*|BP[:-]\s*)([-A-Z0-9/]{4,24})/i)
        || rawText.match(/(?:PLATE\s*(?:NO|NUMBER|#)\.?\s*[:-]?\s*)([-A-Z0-9/]{4,20})/i)
        || rawText.match(/(?:PERMIT|BP|PLATE)\s*[:-]\s*([-A-Z0-9/]{4,24})/i)
        || rawText.match(/\b(202[0-9]-[0-9]{4,8}(?:-[A-Z0-9]+)?)\b/);

    if (permitMatch?.[1]) {
        permitNumber = permitMatch[1].trim().replace(/[^\w\-/]/g, '');
        signals.push(`Permit #${permitNumber}`);
    }

    const matched = isMayorPermit || (isLguOrBarangay && Boolean(permitNumber));

    let badgeText = 'Text scanned (Manual audit scheduled)';
    let badgeTone = 'stone';
    let status = 'manual_review';

    if (matched && permitNumber) {
        badgeText = `Mayor's Permit Verified: #${permitNumber}`;
        badgeTone = 'emerald';
        status = 'verified';
    } else if (matched) {
        badgeText = 'Mayor\'s Permit Detected';
        badgeTone = 'emerald';
        status = 'partial';
    } else if (signals.length > 0) {
        badgeText = 'Municipal Document Scanned';
        badgeTone = 'amber';
        status = 'partial';
    }

    return {
        status,
        matched,
        documentType: 'business_permit',
        badgeText,
        badgeTone,
        extractedValue: permitNumber,
        permitNumber,
        lgu: matchedLgu || null,
        signals,
        summaryText: signals.join(' • '),
    };
}

/**
 * Parse DTI Registration Certificate
 */
export function parseDtiCertificate(rawText = '', context = {}) {
    const text = normalizeText(rawText);
    const expectedShop = context?.shopName || '';
    const signals = [];

    const isDti = text.includes('DEPARTMENT OF TRADE AND INDUSTRY') || text.includes('DTI');
    const isBnr = text.includes('BUSINESS NAME') || text.includes('CERTIFICATE OF BUSINESS NAME') || text.includes('REGISTRATION');
    const isRepublic = text.includes('REPUBLIC OF THE PHILIPPINES');

    if (isDti) signals.push('DTI Philippines');
    if (isBnr) signals.push('Business Name Registration');
    if (isRepublic) signals.push('Republic of the Philippines');

    // DTI Certificate Number Regex
    let certNumber = null;
    const certMatch = rawText.match(/(?:CERTIFICATE\s*(?:NO|NUMBER|#)?\.?\s*[:-]?\s*|BUSINESS\s*NAME\s*NO\.?\s*[:-]?\s*)([0-9]{7,12})/i)
        || rawText.match(/\b(BN[-\s]?[0-9]{7,12})\b/i)
        || (isDti ? rawText.match(/(?:NO|#|REG|TRN)[\s.:#-]*([0-9]{7,10})/i) : null);

    if (certMatch?.[1]) {
        certNumber = certMatch[1].trim().replace(/\D/g, '');
        signals.push(`Cert #${certNumber}`);
    }

    const shopMatched = expectedShop ? matchShopName(rawText, expectedShop) : null;
    if (shopMatched) {
        signals.push(`Shop Matched: "${expectedShop}"`);
    }

    const matched = isDti || (isBnr && Boolean(certNumber));

    let badgeText = 'Text scanned (Manual audit scheduled)';
    let badgeTone = 'stone';
    let status = 'manual_review';

    if (matched && shopMatched && certNumber) {
        badgeText = `DTI Matched: "${expectedShop}" (#${certNumber})`;
        badgeTone = 'emerald';
        status = 'verified';
    } else if (matched && shopMatched) {
        badgeText = `DTI Matched: "${expectedShop}"`;
        badgeTone = 'emerald';
        status = 'verified';
    } else if (matched && certNumber) {
        badgeText = `DTI Detected: #${certNumber}${expectedShop ? ' (Name check recommended)' : ''}`;
        badgeTone = shopMatched === false ? 'amber' : 'emerald';
        status = 'partial';
    } else if (matched) {
        badgeText = 'DTI Certificate Detected';
        badgeTone = 'emerald';
        status = 'partial';
    }

    return {
        status,
        matched,
        documentType: 'dti_registration',
        badgeText,
        badgeTone,
        extractedValue: certNumber,
        certNumber,
        shopMatched,
        signals,
        summaryText: signals.join(' • '),
    };
}

/**
 * Parse TIN / BIR Registration
 */
export function parseTinDocument(rawText = '', context = {}) {
    const text = normalizeText(rawText);
    const expectedTin = context?.expectedTin ? String(context.expectedTin).replace(/\D/g, '') : null;
    const signals = [];

    const isBir = text.includes('BUREAU OF INTERNAL REVENUE') || text.includes('BIR');
    const isTinHeading = text.includes('TAX IDENTIFICATION NUMBER') || text.includes('TIN');
    const is2303 = text.includes('2303') || text.includes('FORM 2303') || text.includes('CERTIFICATE OF REGISTRATION');

    if (isBir) signals.push('Bureau of Internal Revenue');
    if (isTinHeading) signals.push('Taxpayer Identification');
    if (is2303) signals.push('BIR Form 2303');

    // Philippine TIN extraction regex (9 or 12 digits, grouped or sequential)
    let extractedTin = null;
    let formattedTin = null;

    const tinMatch = rawText.match(/(?:TIN|TAX\s*IDENTIFICATION\s*(?:NO|NUMBER|#)?\.?)\s*[:-]?\s*(\d{3}[\s-]?\d{3}[\s-]?\d{3}(?:[\s-]?\d{3})?)/i)
        || rawText.match(/\b(\d{3}[\s-]\d{3}[\s-]\d{3}(?:[\s-]\d{3})?)\b/)
        || rawText.match(/\b(\d{9}|\d{12})\b/);

    if (tinMatch?.[1]) {
        const rawDigits = tinMatch[1].replace(/\D/g, '');
        if (rawDigits.length === 9 || rawDigits.length === 12) {
            extractedTin = rawDigits;
            formattedTin = formatPhilippineTin(rawDigits);
            signals.push(`TIN: ${formattedTin}`);
        }
    }

    let tinMatched = null;
    if (expectedTin && extractedTin) {
        tinMatched = extractedTin.startsWith(expectedTin.slice(0, 9)) || expectedTin.startsWith(extractedTin.slice(0, 9));
        if (tinMatched) signals.push('Matches Entered TIN');
    }

    const matched = Boolean(formattedTin) || (isBir && (isTinHeading || is2303));

    let badgeText = 'Text scanned (Manual audit scheduled)';
    let badgeTone = 'stone';
    let status = 'manual_review';

    if (formattedTin && (tinMatched === true || tinMatched === null)) {
        badgeText = `TIN Detected: ${formattedTin}`;
        badgeTone = 'emerald';
        status = 'verified';
    } else if (formattedTin && tinMatched === false) {
        badgeText = `TIN Detected: ${formattedTin} (Different from setup)`;
        badgeTone = 'amber';
        status = 'partial';
    } else if (is2303) {
        badgeText = 'BIR Form 2303 Detected';
        badgeTone = 'emerald';
        status = 'partial';
    } else if (matched) {
        badgeText = 'BIR Document Detected';
        badgeTone = 'emerald';
        status = 'partial';
    }

    return {
        status,
        matched,
        documentType: 'tin_id',
        badgeText,
        badgeTone,
        extractedValue: formattedTin || extractedTin,
        tin: formattedTin || extractedTin,
        tinMatched,
        signals,
        summaryText: signals.join(' • '),
    };
}

/**
 * Parse Valid Government ID
 */
export function parseValidId(rawText = '') {
    const text = normalizeText(rawText);
    const signals = [];

    let idType = null;
    if (text.includes("DRIVER") && text.includes("LICENSE")) {
        idType = "Driver's License";
    } else if (text.includes("PHILIPPINE IDENTIFICATION") || text.includes("PHILID") || text.includes("NATIONAL ID")) {
        idType = "National ID (PhilID)";
    } else if (text.includes("PHILHEALTH")) {
        idType = "PhilHealth ID";
    } else if (text.includes("SOCIAL SECURITY SYSTEM") || /\bSSS\b/.test(text)) {
        idType = "SSS ID";
    } else if (text.includes("UNIFIED MULTI") || /\bUMID\b/.test(text)) {
        idType = "UMID Card";
    } else if (text.includes("POSTAL ID")) {
        idType = "Postal ID";
    } else if (text.includes("PASSPORT")) {
        idType = "Philippine Passport";
    } else if (text.includes("PROFESSIONAL REGULATION") || /\bPRC\b/.test(text)) {
        idType = "PRC ID";
    } else if (text.includes("VOTER") || text.includes("COMMISSION ON ELECTIONS")) {
        idType = "Voter's ID";
    } else if (text.includes("REPUBLIC OF THE PHILIPPINES")) {
        idType = "Philippine Gov ID";
    }

    if (idType) signals.push(idType);

    const matched = Boolean(idType);
    let badgeText = 'Text scanned (Manual audit scheduled)';
    let badgeTone = 'stone';
    let status = 'manual_review';

    if (matched) {
        badgeText = `Gov ID Detected: ${idType}`;
        badgeTone = 'emerald';
        status = 'verified';
    }

    return {
        status,
        matched,
        documentType: 'valid_id',
        badgeText,
        badgeTone,
        extractedValue: idType,
        idType,
        signals,
        summaryText: signals.join(' • '),
    };
}

/**
 * Universal document analyzer dispatcher.
 */
export function analyzeDocumentText(rawText = '', documentType = '', context = {}) {
    const text = String(rawText || '');
    let analysis;

    switch (documentType) {
        case 'business_permit':
            analysis = parseBusinessPermit(text, context);
            break;
        case 'dti_registration':
            analysis = parseDtiCertificate(text, context);
            break;
        case 'tin_id':
            analysis = parseTinDocument(text, context);
            break;
        case 'valid_id':
            analysis = parseValidId(text, context);
            break;
        default:
            analysis = {
                status: 'manual_review',
                matched: false,
                documentType,
                badgeText: 'Document scanned',
                badgeTone: 'stone',
                extractedValue: null,
                signals: [],
                summaryText: '',
            };
    }

    return {
        ...analysis,
        rawLength: text.length,
        hasText: text.trim().length > 0,
    };
}
