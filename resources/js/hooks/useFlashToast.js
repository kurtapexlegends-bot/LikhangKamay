import { useEffect } from 'react';

export default function useFlashToast(
    flash,
    addToast,
    {
        successDuration = 3000,
        errorDuration = 5000,
        warningDuration = 4000,
        mapSuccess,
        mapError,
        mapWarning,
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

    useEffect(() => {
        if (flash?.warning) {
            addToast(mapWarning ? mapWarning(flash.warning) : flash.warning, 'warning', warningDuration);
        }
    }, [addToast, flash?.warning, mapWarning, warningDuration]);
}
