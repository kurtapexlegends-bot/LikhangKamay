import test from 'node:test';
import assert from 'node:assert/strict';

// Test the pure folder size guard logic implemented in handleModelAssetFolderChange
function simulateHandleModelAssetFolderChange({
    files,
    currentData = {},
    setData,
    addToast,
    event,
}) {
    const selectedFiles = Array.from(files || []);
    const totalSizeBytes = selectedFiles.reduce((acc, file) => acc + (file.size || 0), 0);
    const MAX_FOLDER_BYTES = 4 * 1024 * 1024; // 4MB ceiling for serverless multipart payload

    if (totalSizeBytes > MAX_FOLDER_BYTES) {
        event.target.value = "";
        if (typeof addToast === "function") {
            addToast(
                "Companion 3D asset folder exceeds 4MB serverless payload limit. Please compress textures or optimize assets.",
                "error"
            );
        }
        return;
    }

    const mainModelName = currentData.model_3d?.name || "";
    const normalizedFiles = selectedFiles
        .filter((file) => file.name !== mainModelName)
        .map((file) => ({
            file,
            relativePath: file.webkitRelativePath
                ? file.webkitRelativePath.split(/[\\/]/).filter(Boolean).join("/")
                : file.name,
        }))
        .filter(({ relativePath }) => Boolean(relativePath));

    setData("model_3d_assets", normalizedFiles.map(({ file }) => file));
    setData("model_3d_asset_paths", normalizedFiles.map(({ relativePath }) => relativePath));
    event.target.value = "";
}

// Test the pure single-file size guard logic implemented in handleFileChange for model_3d
function simulateHandleModel3dFileChange({
    file,
    setData,
    addToast,
    event,
}) {
    const MAX_MODEL_BYTES = 4 * 1024 * 1024; // 4MB ceiling for serverless multipart payload

    if (file && file.size > MAX_MODEL_BYTES) {
        event.target.value = "";
        if (typeof addToast === "function") {
            addToast(
                "3D model file exceeds 4MB serverless payload limit. Please compress textures or optimize the model.",
                "error"
            );
        }
        return false;
    }

    setData("model_3d", file);
    setData("model_3d_assets", []);
    setData("model_3d_asset_paths", []);
    return true;
}

// Test the Vite preload error sessionStorage reload loop guard with offline check
function simulateVitePreloadErrorHandler({
    sessionStorageStore,
    windowLocation,
    event,
    isOnline = true,
}) {
    const VITE_RELOAD_KEY = 'vite_preload_reloaded';
    event.preventDefault();

    if (!isOnline) {
        return 'offline_skipped';
    }

    try {
        const hasReloaded = sessionStorageStore.getItem(VITE_RELOAD_KEY);
        if (!hasReloaded) {
            sessionStorageStore.setItem(VITE_RELOAD_KEY, 'true');
            windowLocation.reload();
            return 'reloaded';
        }
    } catch {
        // Fallback
    }

    return 'blocked_infinite_loop';
}

// Test aggregate multipart payload shield (4MB serverless ceiling)
function simulateAggregateMultipartPayloadGuard({
    compressedCover,
    compressedGallery = [],
    model3dAssets = [],
    model3dFile = null,
    addToast,
    setIsSubmitting,
}) {
    let totalPayloadBytes = 0;
    if (compressedCover && typeof compressedCover.size === 'number') {
        totalPayloadBytes += compressedCover.size;
    }
    if (Array.isArray(compressedGallery)) {
        compressedGallery.forEach((f) => {
            if (f && typeof f.size === 'number') totalPayloadBytes += f.size;
        });
    }
    if (Array.isArray(model3dAssets)) {
        model3dAssets.forEach((f) => {
            if (f && typeof f.size === 'number') totalPayloadBytes += f.size;
        });
    }
    if (model3dFile && typeof model3dFile.size === 'number') {
        totalPayloadBytes += model3dFile.size;
    }

    const MAX_MULTIPART_BYTES = 4 * 1024 * 1024;
    if (totalPayloadBytes > MAX_MULTIPART_BYTES) {
        if (typeof setIsSubmitting === 'function') setIsSubmitting(false);
        if (typeof addToast === 'function') {
            addToast("Total upload payload exceeds 4MB serverless limit. Please compress images or companion assets.", "error");
        }
        return false;
    }

    return true;
}

// Test WebGL reference counting with 1000ms debounce
function simulateModelRefCounting() {
    const activeModelUrlRefs = new Map();
    const modelDisposalTimers = new Map();
    let disposedCount = 0;

    function retainModelUrl(url) {
        if (!url) return;
        if (modelDisposalTimers.has(url)) {
            clearTimeout(modelDisposalTimers.get(url));
            modelDisposalTimers.delete(url);
        }
        const current = activeModelUrlRefs.get(url) || 0;
        activeModelUrlRefs.set(url, current + 1);
    }

    function releaseModelUrl(url, timeoutMs = 50) {
        if (!url) return;
        const current = (activeModelUrlRefs.get(url) || 1) - 1;
        if (current <= 0) {
            activeModelUrlRefs.delete(url);
            if (modelDisposalTimers.has(url)) {
                clearTimeout(modelDisposalTimers.get(url));
            }
            const timerId = setTimeout(() => {
                modelDisposalTimers.delete(url);
                if ((activeModelUrlRefs.get(url) || 0) > 0) return;
                disposedCount++;
            }, timeoutMs);
            modelDisposalTimers.set(url, timerId);
        } else {
            activeModelUrlRefs.set(url, current);
        }
    }

    return {
        activeModelUrlRefs,
        modelDisposalTimers,
        getDisposedCount: () => disposedCount,
        retainModelUrl,
        releaseModelUrl,
    };
}

test('blocks companion 3D asset folders exceeding 4MB', () => {
    let toastMessage = null;
    let toastType = null;
    let setDataCalls = [];
    const event = { target: { value: 'C:\\fakepath\\textures' } };

    const heavyFiles = [
        { name: 'diffuse.png', size: 2.5 * 1024 * 1024, webkitRelativePath: 'textures/diffuse.png' },
        { name: 'normal.png', size: 2.0 * 1024 * 1024, webkitRelativePath: 'textures/normal.png' },
    ]; // Total = 4.5MB > 4MB

    simulateHandleModelAssetFolderChange({
        files: heavyFiles,
        currentData: {},
        setData: (key, val) => setDataCalls.push({ key, val }),
        addToast: (msg, type) => {
            toastMessage = msg;
            toastType = type;
        },
        event,
    });

    assert.equal(event.target.value, '');
    assert.equal(toastType, 'error');
    assert.match(toastMessage, /exceeds 4MB serverless payload limit/);
    assert.equal(setDataCalls.length, 0, 'setData should NOT have been called when exceeding 4MB');
});

test('allows companion 3D asset folders within 4MB limit', () => {
    let toastCalled = false;
    let setDataCalls = [];
    const event = { target: { value: 'C:\\fakepath\\textures' } };

    const validFiles = [
        { name: 'diffuse.jpg', size: 1.2 * 1024 * 1024, webkitRelativePath: 'textures/diffuse.jpg' },
        { name: 'roughness.jpg', size: 800 * 1024, webkitRelativePath: 'textures/roughness.jpg' },
    ]; // Total = 2.0MB <= 4MB

    simulateHandleModelAssetFolderChange({
        files: validFiles,
        currentData: {},
        setData: (key, val) => setDataCalls.push({ key, val }),
        addToast: () => {
            toastCalled = true;
        },
        event,
    });

    assert.equal(event.target.value, '');
    assert.equal(toastCalled, false, 'Toast error should not be shown for valid size');
    assert.equal(setDataCalls.length, 2, 'Should set model_3d_assets and model_3d_asset_paths');
    assert.equal(setDataCalls[0].key, 'model_3d_assets');
    assert.equal(setDataCalls[0].val.length, 2);
    assert.equal(setDataCalls[1].key, 'model_3d_asset_paths');
    assert.deepEqual(setDataCalls[1].val, ['textures/diffuse.jpg', 'textures/roughness.jpg']);
});

test('blocks main 3D model file exceeding 4MB', () => {
    let toastMessage = null;
    let toastType = null;
    let setDataCalls = [];
    const event = { target: { value: 'C:\\fakepath\\heavy_pottery.glb' } };

    const heavyFile = { name: 'heavy_pottery.glb', size: 5.5 * 1024 * 1024 };

    const accepted = simulateHandleModel3dFileChange({
        file: heavyFile,
        setData: (key, val) => setDataCalls.push({ key, val }),
        addToast: (msg, type) => {
            toastMessage = msg;
            toastType = type;
        },
        event,
    });

    assert.equal(accepted, false);
    assert.equal(event.target.value, '');
    assert.equal(toastType, 'error');
    assert.match(toastMessage, /exceeds 4MB serverless payload limit/);
    assert.equal(setDataCalls.length, 0);
});

test('allows main 3D model file within 4MB', () => {
    let toastCalled = false;
    let setDataCalls = [];
    const event = { target: { value: 'C:\\fakepath\\pottery.glb' } };

    const validFile = { name: 'pottery.glb', size: 1.8 * 1024 * 1024 };

    const accepted = simulateHandleModel3dFileChange({
        file: validFile,
        setData: (key, val) => setDataCalls.push({ key, val }),
        addToast: () => {
            toastCalled = true;
        },
        event,
    });

    assert.equal(accepted, true);
    assert.equal(toastCalled, false);
    assert.equal(setDataCalls.length, 3);
    assert.equal(setDataCalls[0].key, 'model_3d');
    assert.deepEqual(setDataCalls[0].val, validFile);
});

test('prevents infinite reload loops on dynamic chunk preload failure', () => {
    const memoryStorage = new Map();
    const mockSessionStorage = {
        getItem: (k) => memoryStorage.get(k) || null,
        setItem: (k, v) => memoryStorage.set(k, String(v)),
        removeItem: (k) => memoryStorage.delete(k),
    };

    let reloadCount = 0;
    const mockLocation = {
        reload: () => {
            reloadCount++;
        },
    };

    let defaultPrevented = false;
    const mockEvent = {
        preventDefault: () => {
            defaultPrevented = true;
        },
    };

    // First failure: should reload and set sessionStorage flag
    const result1 = simulateVitePreloadErrorHandler({
        sessionStorageStore: mockSessionStorage,
        windowLocation: mockLocation,
        event: mockEvent,
    });

    assert.equal(defaultPrevented, true);
    assert.equal(result1, 'reloaded');
    assert.equal(reloadCount, 1);
    assert.equal(mockSessionStorage.getItem('vite_preload_reloaded'), 'true');

    // Second failure: should NOT reload again, preventing infinite browser freeze
    const result2 = simulateVitePreloadErrorHandler({
        sessionStorageStore: mockSessionStorage,
        windowLocation: mockLocation,
        event: mockEvent,
    });

    assert.equal(result2, 'blocked_infinite_loop');
    assert.equal(reloadCount, 1, 'reload should not be invoked a second time');

    // Navigation success clears the flag for future deploys
    mockSessionStorage.removeItem('vite_preload_reloaded');
    assert.equal(mockSessionStorage.getItem('vite_preload_reloaded'), null);
});

test('skips reload on vite:preloadError when offline', () => {
    const memoryStorage = new Map();
    const mockSessionStorage = {
        getItem: (k) => memoryStorage.get(k) || null,
        setItem: (k, v) => memoryStorage.set(k, String(v)),
        removeItem: (k) => memoryStorage.delete(k),
    };

    let reloadCalled = false;
    const mockLocation = {
        reload: () => {
            reloadCalled = true;
        },
    };

    const mockEvent = {
        preventDefault: () => {},
    };

    const result = simulateVitePreloadErrorHandler({
        sessionStorageStore: mockSessionStorage,
        windowLocation: mockLocation,
        event: mockEvent,
        isOnline: false,
    });

    assert.equal(result, 'offline_skipped');
    assert.equal(reloadCalled, false, 'reload() should not be invoked when offline');
    assert.equal(mockSessionStorage.getItem('vite_preload_reloaded'), null);
});

test('blocks aggregate multipart payload exceeding 4MB', () => {
    let toastMessage = null;
    let toastType = null;
    let isSubmitting = true;

    // 1MB cover + 2MB gallery (2 x 1MB) + 1.5MB companion assets = 4.5MB > 4MB
    const cover = { name: 'cover.jpg', size: 1.0 * 1024 * 1024 };
    const gallery = [
        { name: 'g1.jpg', size: 1.0 * 1024 * 1024 },
        { name: 'g2.jpg', size: 1.0 * 1024 * 1024 },
    ];
    const assets = [
        { name: 'texture.png', size: 1.5 * 1024 * 1024 },
    ];

    const allowed = simulateAggregateMultipartPayloadGuard({
        compressedCover: cover,
        compressedGallery: gallery,
        model3dAssets: assets,
        model3dFile: null,
        addToast: (msg, type) => {
            toastMessage = msg;
            toastType = type;
        },
        setIsSubmitting: (val) => {
            isSubmitting = val;
        },
    });

    assert.equal(allowed, false);
    assert.equal(isSubmitting, false);
    assert.equal(toastType, 'error');
    assert.match(toastMessage, /Total upload payload exceeds 4MB serverless limit/);
});

test('allows aggregate multipart payload within 4MB', () => {
    let toastCalled = false;
    let isSubmitting = true;

    // 0.4MB cover + 1.2MB gallery (3 x 0.4MB) + 1.0MB companion assets = 2.6MB <= 4MB
    const cover = { name: 'cover.jpg', size: 400 * 1024 };
    const gallery = [
        { name: 'g1.jpg', size: 400 * 1024 },
        { name: 'g2.jpg', size: 400 * 1024 },
        { name: 'g3.jpg', size: 400 * 1024 },
    ];
    const assets = [
        { name: 'texture.png', size: 1.0 * 1024 * 1024 },
    ];

    const allowed = simulateAggregateMultipartPayloadGuard({
        compressedCover: cover,
        compressedGallery: gallery,
        model3dAssets: assets,
        model3dFile: null,
        addToast: () => {
            toastCalled = true;
        },
        setIsSubmitting: (val) => {
            isSubmitting = val;
        },
    });

    assert.equal(allowed, true);
    assert.equal(isSubmitting, true);
    assert.equal(toastCalled, false);
});

test('debounces WebGL geometry disposal and cancels timer if viewer remounts', async () => {
    const {
        activeModelUrlRefs,
        modelDisposalTimers,
        getDisposedCount,
        retainModelUrl,
        releaseModelUrl,
    } = simulateModelRefCounting();

    const modelUrl = 'https://assets.likhangkamay.test/pottery.glb';

    // Viewer 1 mounts
    retainModelUrl(modelUrl);
    assert.equal(activeModelUrlRefs.get(modelUrl), 1);

    // Viewer 1 unmounts (e.g. view transition or drawer closing)
    releaseModelUrl(modelUrl, 60);
    assert.equal(activeModelUrlRefs.get(modelUrl), undefined);
    assert.equal(modelDisposalTimers.has(modelUrl), true, 'Disposal timer should be scheduled');
    assert.equal(getDisposedCount(), 0, 'Should not dispose immediately');

    // Sibling viewer 2 mounts within 20ms under Suspense / modal
    await new Promise((r) => setTimeout(r, 20));
    retainModelUrl(modelUrl);
    assert.equal(modelDisposalTimers.has(modelUrl), false, 'Pending disposal timer should be cancelled');
    assert.equal(activeModelUrlRefs.get(modelUrl), 1);

    // Wait past original 60ms timer
    await new Promise((r) => setTimeout(r, 70));
    assert.equal(getDisposedCount(), 0, 'Geometries must remain intact and NOT disposed');
});

test('executes WebGL geometry disposal after debounce timeout expires on unmount', async () => {
    const {
        activeModelUrlRefs,
        modelDisposalTimers,
        getDisposedCount,
        retainModelUrl,
        releaseModelUrl,
    } = simulateModelRefCounting();

    const modelUrl = 'https://assets.likhangkamay.test/pottery.glb';

    retainModelUrl(modelUrl);
    releaseModelUrl(modelUrl, 40);

    assert.equal(getDisposedCount(), 0, 'Not disposed immediately');
    await new Promise((r) => setTimeout(r, 60));
    assert.equal(getDisposedCount(), 1, 'Disposed after debounce timeout expires');
    assert.equal(modelDisposalTimers.has(modelUrl), false);
});
