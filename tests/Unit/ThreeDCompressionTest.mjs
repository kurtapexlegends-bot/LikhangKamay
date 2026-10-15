import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { GLTFLoader } from 'three-stdlib';
import { DRACOLoader } from 'three-stdlib';
import { KTX2Loader } from 'three-stdlib';

console.log('[LikhangKamay] Running Batch 5 3D Draco / KTX2 Compression Pipeline Verification Suite...');

const rootDir = process.cwd();

// 1. Verify static Draco decoder files exist in public/draco/gltf/
const dracoDir = path.join(rootDir, 'public', 'draco', 'gltf');
const expectedDracoFiles = [
    'draco_decoder.js',
    'draco_decoder.wasm',
    'draco_wasm_wrapper.js',
];

for (const file of expectedDracoFiles) {
    const fullPath = path.join(dracoDir, file);
    assert.ok(fs.existsSync(fullPath), `public/draco/gltf/${file} must exist on disk`);
    const stat = fs.statSync(fullPath);
    assert.ok(stat.size > 0, `public/draco/gltf/${file} must not be empty`);
}
console.log('  ✓ Static Draco decoder binaries exist in public/draco/gltf/ and are non-empty');

// 2. Import threeLoaders module exports
const loadersModule = await import('../../resources/js/Components/ThreeD/threeLoaders.js');

assert.equal(loadersModule.DRACO_LOCAL_DECODER_PATH, '/draco/gltf/');
assert.equal(loadersModule.DRACO_CDN_DECODER_PATH, 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
assert.equal(loadersModule.KTX2_TRANSCODER_PATH, 'https://cdn.jsdelivr.net/gh/pmndrs/drei-assets@master/basis/');
assert.equal(typeof loadersModule.getSharedKTX2Loader, 'function');
assert.equal(typeof loadersModule.getSharedDRACOLoader, 'function');
assert.equal(typeof loadersModule.getSharedKTX2Loader, 'function');
assert.equal(typeof loadersModule.configureGLTFExtensions, 'function');
console.log('  ✓ threeLoaders exported decoder constants and extension configurators verified');

// 3. Verify getSharedDRACOLoader and getSharedKTX2Loader singletons
const dracoInstance1 = loadersModule.getSharedDRACOLoader();
const dracoInstance2 = loadersModule.getSharedDRACOLoader();
assert.ok(dracoInstance1 instanceof DRACOLoader, 'getSharedDRACOLoader must return DRACOLoader instance');
assert.equal(dracoInstance1, dracoInstance2, 'getSharedDRACOLoader must be a thread-safe singleton');
assert.equal(dracoInstance1.decoderPath, loadersModule.DRACO_DEFAULT_DECODER_PATH, 'decoderPath must match configured default');
console.log('  ✓ DRACOLoader singleton instantiates correctly with decoder path');

const ktx2Instance1 = loadersModule.getSharedKTX2Loader();
const ktx2Instance2 = loadersModule.getSharedKTX2Loader();
assert.ok(ktx2Instance1 instanceof KTX2Loader, 'getSharedKTX2Loader must return KTX2Loader instance');
assert.equal(ktx2Instance1, ktx2Instance2, 'getSharedKTX2Loader must be a thread-safe singleton');
assert.equal(ktx2Instance1.transcoderPath, loadersModule.KTX2_TRANSCODER_PATH, 'transcoderPath must point to basis transcoder CDN');
console.log('  ✓ KTX2Loader singleton instantiates correctly with basis transcoder path');

// 4. Verify configureGLTFExtensions attaches Draco and KTX2 to a bare GLTFLoader
const loader = new GLTFLoader();
assert.equal(loader.dracoLoader, null, 'Bare GLTFLoader must initially have no DRACOLoader');
assert.equal(loader.ktx2Loader, null, 'Bare GLTFLoader must initially have no KTX2Loader');

loadersModule.configureGLTFExtensions(loader, null);

assert.equal(loader.crossOrigin, 'anonymous', 'Loader must enforce anonymous crossOrigin');
assert.ok(loader.dracoLoader instanceof DRACOLoader, 'Loader must have DRACOLoader configured');
assert.equal(loader.dracoLoader.decoderPath, loadersModule.DRACO_DEFAULT_DECODER_PATH, 'Draco decoderPath must match configured default');
assert.ok(loader.ktx2Loader instanceof KTX2Loader, 'Loader must have KTX2Loader attached');
assert.equal(loader.ktx2Loader.transcoderPath, loadersModule.KTX2_TRANSCODER_PATH, 'KTX2 transcoderPath must match');
console.log('  ✓ configureGLTFExtensions configures crossOrigin, DRACOLoader, and KTX2Loader seamlessly');

// 5. Verify GLTFModel.jsx and ProductViewer3D.jsx export contracts
const gltfModelContent = fs.readFileSync(path.join(rootDir, 'resources', 'js', 'Components', 'ThreeD', 'GLTFModel.jsx'), 'utf8');
assert.match(gltfModelContent, /DRACO_DEFAULT_DECODER_PATH/, 'GLTFModel must reference DRACO_DEFAULT_DECODER_PATH');
assert.match(gltfModelContent, /configureGLTFExtensions/, 'GLTFModel must call configureGLTFExtensions');
assert.match(gltfModelContent, /GLTFModel\.preload/, 'GLTFModel must expose preload method');

const viewerContent = fs.readFileSync(path.join(rootDir, 'resources', 'js', 'Components', 'ThreeD', 'ProductViewer3D.jsx'), 'utf8');
assert.match(viewerContent, /export const preloadProduct3D/, 'ProductViewer3D must export preloadProduct3D helper');
assert.match(viewerContent, /GLTFModel\.preload/, 'preloadProduct3D must delegate to GLTFModel.preload');
console.log('  ✓ GLTFModel and ProductViewer3D integration contracts verified');

console.log('\n[PASS] ALL BATCH 5 3D COMPRESSION TESTS PASSED DETERMINISTICALLY!\n');
