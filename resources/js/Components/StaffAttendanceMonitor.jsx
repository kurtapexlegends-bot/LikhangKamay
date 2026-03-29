import { StaffResumePromptOverlay } from '@/Components/StaffResumePrompt';
import { usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

export default function StaffAttendanceMonitor() {
    const { auth } = usePage().props;
    const [resumePrompt, setResumePrompt] = useState(null);

    const heartbeatUrl = useMemo(() => {
        try {
            return route('staff.attendance.heartbeat');
        } catch {
            return null;
        }
    }, []);

    useEffect(() => {
        if (!auth?.isStaff || !heartbeatUrl || resumePrompt) {
            return undefined;
        }

        let intervalId = null;
        let cancelled = false;

        const sendHeartbeat = async () => {
            if (cancelled || document.visibilityState !== 'visible') {
                return;
            }

            try {
                await window.axios.post(heartbeatUrl);
            } catch (error) {
                if (cancelled) {
                    return;
                }

                if (error?.response?.status === 423 && error.response?.data?.requires_resume) {
                    setResumePrompt(error.response.data.resume_prompt || { requires_resume: true });
                }
            }
        };

        const stopHeartbeat = () => {
            if (intervalId) {
                window.clearInterval(intervalId);
                intervalId = null;
            }
        };

        const startHeartbeat = () => {
            stopHeartbeat();
            intervalId = window.setInterval(sendHeartbeat, 60 * 1000);
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                void sendHeartbeat();
                startHeartbeat();
                return;
            }

            stopHeartbeat();
        };

        const handlePageHide = () => {
            stopHeartbeat();

            if (!navigator.sendBeacon || resumePrompt) {
                return;
            }

            const csrf = document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute('content');

            if (!csrf) {
                return;
            }

            const payload = new FormData();
            payload.append('_token', csrf);
            navigator.sendBeacon(heartbeatUrl, payload);
        };

        if (document.visibilityState === 'visible') {
            void sendHeartbeat();
            startHeartbeat();
        }

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pagehide', handlePageHide);

        return () => {
            cancelled = true;
            stopHeartbeat();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('pagehide', handlePageHide);
        };
    }, [auth?.isStaff, heartbeatUrl, resumePrompt]);

    return <StaffResumePromptOverlay open={!!resumePrompt} prompt={resumePrompt} />;
}
