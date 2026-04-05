import { useEffect } from 'react';

export default function useFlashToast(
    flash,
    addToast,
    {
        successDuration = 3000,
        errorDuration = 5000,
        mapSuccess,
        mapError,
    } = {}
) {
    useEffect(() => {
        if (flash?.success) {
            addToast(mapSuccess ? mapSuccess(flash.success) : flash.success, 'success', successDuration);
        }
    }, [addToast, flash?.success, mapSuccess, successDuration]);

    useEffect(() => {
        if (flash?.error) {
            addToast(mapError ? mapError(flash.error) : flash.error, 'error', errorDuration);
        }
    }, [addToast, errorDuration, flash?.error, mapError]);
}
