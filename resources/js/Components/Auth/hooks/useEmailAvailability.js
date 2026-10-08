import { useState, useEffect } from 'react';
import axios from 'axios';

export default function useEmailAvailability(email) {
    const [emailValidation, setEmailValidation] = useState({ isValid: null, message: '' });

    useEffect(() => {
        if (!email || email.length < 5) {
            setEmailValidation({ isValid: null, message: '' });
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const response = await axios.post(route('api.validate-constraint'), {
                    type: 'email_availability',
                    value: email
                });
                setEmailValidation({ 
                    isValid: response.data.valid, 
                    message: response.data.message 
                });
            } catch (error) {
                console.error("Email validation failed", error);
            }
        }, 600);

        return () => clearTimeout(timer);
    }, [email]);

    return emailValidation;
}
