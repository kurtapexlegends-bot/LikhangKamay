import assert from 'node:assert/strict';
import {
    formatPhilippineTin,
    matchShopName,
    parseBusinessPermit,
    parseDtiCertificate,
    parseTinDocument,
    parseValidId,
    analyzeDocumentText,
} from '../../resources/js/lib/documentOcrParser.js';

console.log('--- Testing documentOcrParser ---');

// 1. formatPhilippineTin
assert.equal(formatPhilippineTin('123456789'), '123-456-789');
assert.equal(formatPhilippineTin('123456789000'), '123-456-789-000');
assert.equal(formatPhilippineTin('123-456-789'), '123-456-789');
console.log('✓ formatPhilippineTin passed');

// 2. matchShopName
assert.equal(matchShopName('CERTIFICATE OF REGISTRATION: LIKHA POTTERY STUDIO', 'Likha Pottery'), true);
assert.equal(matchShopName('SILANG CLAY HANDICRAFTS ENTERPRISES', 'Silang Clay'), true);
assert.equal(matchShopName('RANDOM OTHER STORE', 'Likha Pottery'), false);
console.log('✓ matchShopName passed');

// 3. parseBusinessPermit
const sampleMayorPermit = `
REPUBLIC OF THE PHILIPPINES
PROVINCE OF CAVITE
CITY OF IMUS
OFFICE OF THE CITY MAYOR
BUSINESS PERMIT
PERMIT NO: 2024-001928-BP
Issued to: LIKHANG KAMAY WORKSHOP
`;
const permitRes = parseBusinessPermit(sampleMayorPermit);
assert.equal(permitRes.matched, true);
assert.equal(permitRes.status, 'verified');
assert.equal(permitRes.extractedValue, '2024-001928-BP');
assert.equal(permitRes.badgeTone, 'emerald');
assert.ok(permitRes.badgeText.includes('2024-001928-BP'));

// 3b. parseBusinessPermit with Unicode Ñ in DASMARIÑAS
const dasmarinasPermit = `
REPUBLIC OF THE PHILIPPINES
CITY OF DASMARIÑAS
OFFICE OF THE CITY MAYOR
BUSINESS PERMIT NO: 2024-99881
`;
const dasmaRes = parseBusinessPermit(dasmarinasPermit);
assert.equal(dasmaRes.matched, true);
assert.ok(dasmaRes.signals.some((s) => s.includes('DASMARINAS') || s.includes('DASMARIÑAS')));
console.log('✓ parseBusinessPermit (including Unicode Dasmariñas) passed');

// 4. parseDtiCertificate
const sampleDti = `
DEPARTMENT OF TRADE AND INDUSTRY
PHILIPPINES
CERTIFICATE OF BUSINESS NAME REGISTRATION
This is to certify that
TERRACOTTA ARTISANS CAVITE
is registered under Business Name No. 05489214
`;
const dtiRes = parseDtiCertificate(sampleDti, { shopName: 'Terracotta Artisans' });
assert.equal(dtiRes.matched, true);
assert.equal(dtiRes.shopMatched, true);
assert.equal(dtiRes.status, 'verified');
assert.equal(dtiRes.extractedValue, '05489214');
console.log('✓ parseDtiCertificate passed');

// 5. parseTinDocument
const sampleTin = `
BUREAU OF INTERNAL REVENUE
CERTIFICATE OF REGISTRATION
BIR FORM 2303
TIN: 948-120-334-000
TAXPAYER NAME: MARAWI CLAY WORKS
`;
const tinRes = parseTinDocument(sampleTin, { expectedTin: '948120334000' });
assert.equal(tinRes.matched, true);
assert.equal(tinRes.tinMatched, true);
assert.equal(tinRes.extractedValue, '948-120-334-000');
assert.equal(tinRes.status, 'verified');
console.log('✓ parseTinDocument passed');

// 6. parseValidId
const sampleId = `
REPUBLIC OF THE PHILIPPINES
LAND TRANSPORTATION OFFICE
DRIVER'S LICENSE
LAST NAME: SANTOS
FIRST NAME: JUAN
`;
const idRes = parseValidId(sampleId);
assert.equal(idRes.matched, true);
assert.equal(idRes.idType, "Driver's License");
assert.equal(idRes.status, 'verified');

// 6b. parseValidId does not trigger SSS on OCR stutter 'ISSSUED'
const stutterText = `
BUSINESS PERMIT ISSSUED ON 2024
PROVINCE OF CAVITE
`;
const stutterRes = parseValidId(stutterText);
assert.notEqual(stutterRes.idType, 'SSS ID');

// 6c. parseValidId recognizes real SSS with word boundary
const realSss = `
REPUBLIC OF THE PHILIPPINES
SSS SOCIAL SECURITY SYSTEM
SS NUMBER: 34-1234567-8
JUAN DELA CRUZ
`;
const sssRes = parseValidId(realSss);
assert.equal(sssRes.idType, 'SSS ID');
assert.equal(sssRes.matched, true);
console.log('✓ parseValidId (including stutter immunity & SSS) passed');

// 7. analyzeDocumentText universal dispatcher
const genericAnalysis = analyzeDocumentText(sampleMayorPermit, 'business_permit');
assert.equal(genericAnalysis.documentType, 'business_permit');
assert.equal(genericAnalysis.hasText, true);
console.log('✓ analyzeDocumentText passed');

console.log('ALL UNIT TESTS PASSED!');
