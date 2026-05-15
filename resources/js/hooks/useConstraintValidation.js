import { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Custom hook for real-time validation of business constraints (SKU uniqueness, etc.)
 * 
 * @param {string} type - The type of constraint (e.g., 'sku_uniqueness')
 * @param {any} value - The value to validate
 * @param {object} context - Additional context (e.g., current ID to exclude)
 * @param {boolean} shouldValidate - Condition to trigger validation
 * @param {number} debounceTime - Milliseconds to wait before calling API
 */
export default function useConstraintValidation(type, value, context = {}, shouldValidate = true, debounceTime = 600) {
    const [validation, setValidation] = useState({ isValid: null, message: '' });

    useEffect(() => {
        if (!shouldValidate || !value) {
            setValidation({ isValid: null, message: '' });
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const response = await axios.post(route('api.validate-constraint'), {
                    type,
                    value,
                    context
                });
                setValidation({
                    isValid: response.data.valid,
                    message: response.data.message
                });
            } catch (error) {
                console.error(`${type} validation failed`, error);
                // We don't reset to null here to avoid flickering if there's a transient network error,
                // but we could set an error state if needed.
            }
        }, debounceTime);

        return () => clearTimeout(timer);
    }, [value, shouldValidate, type, JSON.stringify(context), debounceTime]);

    return validation;
}
