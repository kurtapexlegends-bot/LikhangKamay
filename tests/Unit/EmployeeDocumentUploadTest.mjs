import test from 'node:test';
import assert from 'node:assert/strict';
import {
    MAX_DOCUMENT_BYTES,
    isSupportedEmployeeDocument,
    prepareEmployeeDocumentFile,
    resolveEmployeeDocumentContentType,
    uploadEmployeeDocumentToPresign,
} from '../../resources/js/utils/employeeDocumentUpload.js';

const makeMockFile = ({ name, size, type }) => ({
    name,
    size,
    type,
});

test('isSupportedEmployeeDocument accepts PDF and supported image formats only', () => {
    assert.equal(isSupportedEmployeeDocument(makeMockFile({ name: 'id.jpg', size: 1000, type: 'image/jpeg' })), true);
    assert.equal(isSupportedEmployeeDocument(makeMockFile({ name: 'scan.png', size: 1000, type: 'image/png' })), true);
    assert.equal(isSupportedEmployeeDocument(makeMockFile({ name: 'doc.webp', size: 1000, type: 'image/webp' })), true);
    assert.equal(isSupportedEmployeeDocument(makeMockFile({ name: 'contract.pdf', size: 1000, type: 'application/pdf' })), true);
    assert.equal(isSupportedEmployeeDocument(makeMockFile({ name: 'script.exe', size: 1000, type: 'application/x-msdownload' })), false);
    assert.equal(isSupportedEmployeeDocument(makeMockFile({ name: 'mesh.glb', size: 1000, type: 'model/gltf-binary' })), false);
});

test('prepareEmployeeDocumentFile rejects missing, invalid, and >4MB files', async () => {
    const emptyRes = await prepareEmployeeDocumentFile(null);
    assert.equal(emptyRes.file, null);
    assert.match(emptyRes.error, /select a document/i);

    const badExtRes = await prepareEmployeeDocumentFile(makeMockFile({ name: 'payload.html', size: 512, type: 'text/html' }));
    assert.equal(badExtRes.file, null);
    assert.match(badExtRes.error, /JPG, PNG, WEBP, or PDF/i);

    const hugePdfRes = await prepareEmployeeDocumentFile(
        makeMockFile({ name: 'huge.pdf', size: MAX_DOCUMENT_BYTES + 1, type: 'application/pdf' })
    );
    assert.equal(hugePdfRes.file, null);
    assert.match(hugePdfRes.error, /4MB/i);

    const validPdf = makeMockFile({ name: 'nbi.pdf', size: 350 * 1024, type: 'application/pdf' });
    const validRes = await prepareEmployeeDocumentFile(validPdf);
    assert.equal(validRes.error, null);
    assert.equal(validRes.file, validPdf);
});

test('resolveEmployeeDocumentContentType infers fallback MIME from extension when missing', () => {
    assert.equal(resolveEmployeeDocumentContentType({ name: 'a.pdf', type: '' }), 'application/pdf');
    assert.equal(resolveEmployeeDocumentContentType({ name: 'a.png', type: '' }), 'image/png');
    assert.equal(resolveEmployeeDocumentContentType({ name: 'a.webp', type: '' }), 'image/webp');
    assert.equal(resolveEmployeeDocumentContentType({ name: 'a.jpg', type: 'image/jpeg' }), 'image/jpeg');
    assert.equal(resolveEmployeeDocumentContentType({ name: 'a.jpg', type: 'image/jpg' }), 'image/jpeg');
});

test('uploadEmployeeDocumentToPresign uses fetch PUT for direct cloud and axios.put for local fallback', async () => {
    const origWindow = globalThis.window;
    const origRoute = globalThis.route;
    const origFetch = globalThis.fetch;

    const calls = [];
    globalThis.route = (name) => `/mock/${name}`;

    // 1. Direct S3/Supabase cloud presign branch
    globalThis.window = {
        axios: {
            post: async (url, payload) => {
                calls.push(['post', url, payload]);
                return {
                    data: {
                        url: 'https://supabase.example.com/presigned-put',
                        key: 'employee_documents/5/abc.pdf',
                        is_direct_cloud: true,
                    },
                };
            },
            put: async () => {
                throw new Error('axios.put should not be used when is_direct_cloud is true');
            },
        },
    };
    globalThis.fetch = async (url, init) => {
        calls.push(['fetch', url, init.method, init.headers['Content-Type']]);
        return { ok: true, status: 200 };
    };

    const file = makeMockFile({ name: 'nbi-clearance.pdf', size: 1024, type: 'application/pdf' });
    const cloudResult = await uploadEmployeeDocumentToPresign(file);
    assert.deepEqual(cloudResult, {
        key: 'employee_documents/5/abc.pdf',
        originalFilename: 'nbi-clearance.pdf',
    });
    assert.equal(calls[0][0], 'post');
    assert.equal(calls[0][2].folder, 'employee_documents');
    assert.equal(calls[1][0], 'fetch');
    assert.equal(calls[1][2], 'PUT');

    // 2. Local fallback PUT branch
    const localCalls = [];
    globalThis.window = {
        axios: {
            post: async () => ({
                data: {
                    url: '/api/uploads/local?key=employee_documents%2F5%2Fxyz.png',
                    key: 'employee_documents/5/xyz.png',
                    is_direct_cloud: false,
                },
            }),
            put: async (url, body, config) => {
                localCalls.push([url, body, config.headers['Content-Type']]);
                return { data: { success: true } };
            },
        },
    };

    const imgFile = makeMockFile({ name: 'id.png', size: 512, type: 'image/png' });
    const localResult = await uploadEmployeeDocumentToPresign(imgFile);
    assert.deepEqual(localResult, {
        key: 'employee_documents/5/xyz.png',
        originalFilename: 'id.png',
    });
    assert.equal(localCalls.length, 1);
    assert.equal(localCalls[0][2], 'image/png');

    globalThis.window = origWindow;
    globalThis.route = origRoute;
    globalThis.fetch = origFetch;
});
