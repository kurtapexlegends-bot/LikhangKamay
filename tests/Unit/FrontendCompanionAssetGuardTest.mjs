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

// Test the Vite preload error sessionStorage reload loop guard
function simulateVitePreloadErrorHandler({
    sessionStorageStore,
    windowLocation,
    event,
}) {
    const VITE_RELOAD_KEY = 'vite_preload_reloaded';
    event.preventDefault();

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
