import React, { useState, useEffect } from 'react';
import { usePage, router } from '@inertiajs/react';
import axios from 'axios';
import Modal from '@/Components/Modal';
import ClockInHeader from './ClockIn/ClockInHeader';
import ClockInIdentityCard from './ClockIn/ClockInIdentityCard';
import ClockInGeofenceCard from './ClockIn/ClockInGeofenceCard';

const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
    if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return null;
    const R = 6371000;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
};

export default function StaffClockInModal({ isOpen, onClose }) {
    const { attendance } = usePage().props;
    const assignedLoc = attendance?.assigned_location;

    const [cameraError, setCameraError] = useState(null);
    const [capturedPhoto, setCapturedPhoto] = useState(null);
    const [submitError, setSubmitError] = useState(null);
    
    const [location, setLocation] = useState({ lat: null, lng: null, accuracy: null });
    const [locationStatus, setLocationStatus] = useState('fetching'); // fetching, success, error
    const [submitting, setSubmitting] = useState(false);
    const [activeMobileTab, setActiveMobileTab] = useState('selfie'); // 'selfie' | 'geofence'

    // Workplace location parameters
    const workplaceLat = assignedLoc?.latitude;
    const workplaceLng = assignedLoc?.longitude;
    const radiusLimit = Number(assignedLoc?.radius_meters || 200);
    const locationName = assignedLoc?.name || 'Assigned Workplace';
    const strictGeofence = !!assignedLoc?.enforce_strict_geofence;

    // Calculate actual distance between staff and workplace center
    const distanceMeters = (locationStatus === 'success' && location.lat !== null && workplaceLat !== undefined && workplaceLat !== null)
        ? calculateDistanceMeters(location.lat, location.lng, workplaceLat, workplaceLng)
        : null;

    const isWithinGeofence = distanceMeters !== null ? (distanceMeters <= radiusLimit) : true;

    // Initialize Geolocation when modal opens
    useEffect(() => {
        if (!isOpen) return;

        setSubmitError(null);
        fetchGeolocation();
        setActiveMobileTab('selfie');
    }, [isOpen]);

    const fetchGeolocation = () => {
        if (!navigator.geolocation) {
            setLocationStatus('error');
            return;
        }

        setLocationStatus('fetching');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocation({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: Math.round(pos.coords.accuracy)
                });
                setLocationStatus('success');
            },
            (err) => {
                console.warn('Geolocation error:', err);
                setLocationStatus('error');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const [useOtpFallback, setUseOtpFallback] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [otpError, setOtpError] = useState(null);
    const [otpCooldown, setOtpCooldown] = useState(0);
    const [maskedEmail, setMaskedEmail] = useState(attendance?.masked_email || '');

    // Cooldown countdown timer for resending OTP
    useEffect(() => {
        if (otpCooldown <= 0) return;
        const timer = setInterval(() => {
            setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [otpCooldown]);

    const handleRequestOtp = async () => {
        if (otpCooldown > 0 || isSendingOtp) return;
        setIsSendingOtp(true);
        setOtpError(null);
        try {
            const res = await axios.post('/staff/attendance/otp');
            setOtpSent(true);
            setOtpCooldown(res.data.cooldown_seconds || 60);
            if (res.data.masked_email) {
                setMaskedEmail(res.data.masked_email);
            }
        } catch (err) {
            setOtpError(err.response?.data?.errors?.otp?.[0] || err.response?.data?.message || 'Failed to send email security code. Please try again.');
        } finally {
            setIsSendingOtp(false);
        }
    };

    const handleSubmit = () => {
        setSubmitting(true);
        setSubmitError(null);
        router.post('/staff/attendance/resume', {
            photo_data: capturedPhoto,
            otp_code: useOtpFallback ? otpCode : null,
            latitude: location.lat,
            longitude: location.lng
        }, {
            onSuccess: () => {
                setSubmitting(false);
                onClose();
            },
            onError: (errors) => {
                setSubmitting(false);
                const errMsg = errors.shift || errors.location || errors.workplace_pin || errors.otp_code || errors.photo_data || Object.values(errors)[0] || 'Unable to clock in. Please try again.';
                setSubmitError(errMsg);
            }
        });
    };

    const isLocationVerified = locationStatus === 'success' && location.lat !== null && location.lng !== null;
    const canClockIn = (Boolean(capturedPhoto) || (useOtpFallback && otpCode.length >= 6)) && isLocationVerified && (!strictGeofence || isWithinGeofence);

    const getButtonText = () => {
        if (submitting) return 'Clocking In...';
        if (useOtpFallback && otpCode.length < 6) return 'Enter 6-Digit Email Code';
        if (!capturedPhoto && !useOtpFallback) return 'Take Photo to Continue';
        if (locationStatus === 'fetching') return 'Checking Store Location...';
        if (!isLocationVerified) return 'Allow Location Access to Continue';
        if (strictGeofence && !isWithinGeofence) return `Too Far from Store: Move Closer to ${locationName}`;
        return 'Confirm Clock In';
    };

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="3xl">
            <div className="p-4 sm:p-6 bg-white space-y-3.5 sm:space-y-4 rounded-t-3xl sm:rounded-2xl border border-stone-200/60 shadow-xl max-h-[92vh] overflow-y-auto">
                {/* Mobile Drag Handle Bar */}
                <div className="w-12 h-1 bg-stone-200 rounded-full mx-auto sm:hidden -mt-1 mb-1" />

                <ClockInHeader
                    onClose={onClose}
                    submitError={submitError}
                    activeMobileTab={activeMobileTab}
                    setActiveMobileTab={setActiveMobileTab}
                    capturedPhoto={capturedPhoto}
                    isLocationVerified={isLocationVerified}
                    isWithinGeofence={isWithinGeofence}
                    locationStatus={locationStatus}
                />

                {/* Cockpit Container: 2-Column Split on Desktop/Tablet (md+), Single Tabbed View on Mobile (< md) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 items-stretch">
                    <ClockInIdentityCard
                        activeMobileTab={activeMobileTab}
                        setActiveMobileTab={setActiveMobileTab}
                        useOtpFallback={useOtpFallback}
                        setUseOtpFallback={setUseOtpFallback}
                        otpCode={otpCode}
                        setOtpCode={setOtpCode}
                        isSendingOtp={isSendingOtp}
                        otpSent={otpSent}
                        otpError={otpError}
                        otpCooldown={otpCooldown}
                        maskedEmail={maskedEmail}
                        handleRequestOtp={handleRequestOtp}
                        isOpen={isOpen}
                        capturedPhoto={capturedPhoto}
                        setCapturedPhoto={setCapturedPhoto}
                        setCameraError={setCameraError}
                    />

                    <ClockInGeofenceCard
                        activeMobileTab={activeMobileTab}
                        isLocationVerified={isLocationVerified}
                        workplaceLat={workplaceLat}
                        workplaceLng={workplaceLng}
                        radiusLimit={radiusLimit}
                        location={location}
                        distanceMeters={distanceMeters}
                        isWithinGeofence={isWithinGeofence}
                        locationName={locationName}
                        locationStatus={locationStatus}
                        fetchGeolocation={fetchGeolocation}
                        handleSubmit={handleSubmit}
                        submitting={submitting}
                        canClockIn={canClockIn}
                        getButtonText={getButtonText}
                    />
                </div>
            </div>
        </Modal>
    );
}
