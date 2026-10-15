import { DRACOLoader, KTX2Loader } from 'three-stdlib';

export const DRACO_LOCAL_DECODER_PATH = '/draco/gltf/';
export const DRACO_CDN_DECODER_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';
export const DRACO_DEFAULT_DECODER_PATH = typeof window !== 'undefined' && window.location?.origin
    ? DRACO_LOCAL_DECODER_PATH
    : DRACO_CDN_DECODER_PATH;

export const KTX2_TRANSCODER_PATH = 'https://cdn.jsdelivr.net/gh/pmndrs/drei-assets@master/basis/';

// Singleton DRACOLoader instance to reuse web workers and decoder binary memory
let sharedDRACOLoader = null;

export function getSharedDRACOLoader(dracoPath = DRACO_DEFAULT_DECODER_PATH) {
    if (!sharedDRACOLoader) {
        sharedDRACOLoader = new DRACOLoader();
        sharedDRACOLoader.setDecoderPath(dracoPath);
    } else if (dracoPath && sharedDRACOLoader.decoderPath !== dracoPath) {
        sharedDRACOLoader.setDecoderPath(dracoPath);
    }
    return sharedDRACOLoader;
}

// Singleton KTX2Loader instance to prevent worker thread pool proliferation
let sharedKTX2Loader = null;

export function getSharedKTX2Loader(gl = null) {
    if (!sharedKTX2Loader) {
        sharedKTX2Loader = new KTX2Loader();
        sharedKTX2Loader.setTranscoderPath(KTX2_TRANSCODER_PATH);
    }
    if (gl && typeof sharedKTX2Loader.detectSupport === 'function') {
        try {
            sharedKTX2Loader.detectSupport(gl);
        } catch {
            // Tolerate mock or incomplete WebGL renderers gracefully
        }
    }
    return sharedKTX2Loader;
}

export function configureGLTFExtensions(loader, gl = null, dracoPath = DRACO_DEFAULT_DECODER_PATH) {
    if (!loader) return;
    if (typeof loader.setCrossOrigin === 'function') {
        loader.setCrossOrigin('anonymous');
    }

    // Attach DRACOLoader for mesh compression (KHR_draco_mesh_compression)
    if (!loader.dracoLoader && typeof loader.setDRACOLoader === 'function') {
        const draco = getSharedDRACOLoader(dracoPath);
        loader.setDRACOLoader(draco);
    }

    // Attach KTX2Loader for GPU-compressed textures (KHR_texture_basisu)
    if (!loader.ktx2Loader && typeof loader.setKTX2Loader === 'function') {
        const ktx2 = getSharedKTX2Loader(gl);
        loader.setKTX2Loader(ktx2);
    }
}

