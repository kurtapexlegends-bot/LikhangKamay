import * as faceapi from '@vladmandic/face-api';

const CACHE_NAME = 'face-api-weights-v1';

let isMonkeyPatched = false;

/**
 * Custom fetch implementation that caches model files in window.caches (CacheStorage API).
 * Enables instant loading (<50ms) on repeat visits in concrete rural workshops with spotty reception.
 *
 * @param {string} url
 * @param {RequestInit} [init]
 * @returns {Promise<Response>}
 */
export async function cachedModelFetch(url, init) {
    if (typeof window !== 'undefined' && 'caches' in window) {
        try {
            const cache = await window.caches.open(CACHE_NAME);
            const cachedResponse = await cache.match(url);
            if (cachedResponse) {
                return cachedResponse.clone();
            }

            const networkResponse = await window.fetch(url, init);
            if (networkResponse && networkResponse.ok) {
                // Store clone asynchronously in cache for subsequent visits
                cache.put(url, networkResponse.clone()).catch(() => {});
            }
            return networkResponse;
        } catch {
            // Graceful fallback if CacheStorage throws (e.g. storage quota / private browsing)
            return window.fetch(url, init);
        }
    }

    return window.fetch(url, init);
}

/**
 * Initializes the face-api environment with CacheStorage interception and loads required models.
 *
 * @param {string} [modelsPath='/models/face']
 * @returns {Promise<boolean>}
 */
export async function loadCachedFaceModels(modelsPath = '/models/face') {
    if (!isMonkeyPatched && typeof window !== 'undefined') {
        try {
            if (faceapi.env && typeof faceapi.env.monkeyPatch === 'function') {
                faceapi.env.monkeyPatch({ fetch: cachedModelFetch });
                isMonkeyPatched = true;
            }
        } catch (err) {
            console.warn('Failed to monkeyPatch faceapi.env.fetch, falling back to default fetch:', err);
        }
    }

    const loadPromises = [];

    if (!faceapi.nets.tinyFaceDetector.isLoaded) {
        loadPromises.push(faceapi.nets.tinyFaceDetector.loadFromUri(modelsPath));
    }
    if (!faceapi.nets.faceLandmark68TinyNet.isLoaded) {
        loadPromises.push(faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelsPath));
    }

    if (loadPromises.length > 0) {
        await Promise.all(loadPromises);
    }

    return true;
}

/**
 * Checks whether both tinyFaceDetector and faceLandmark68TinyNet are already loaded in memory.
 *
 * @returns {boolean}
 */
export function areFaceModelsLoaded() {
    return Boolean(faceapi.nets.tinyFaceDetector.isLoaded && faceapi.nets.faceLandmark68TinyNet.isLoaded);
}
