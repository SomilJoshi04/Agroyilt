// Location Permission Checker Component for Agroyilt
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import LocationAccessModal from './LocationAccessModal';
import flutterBridge from '../../utils/flutterBridge';

export const LocationPermissionChecker = () => {
    const [showModal, setShowModal] = useState(false);
    const [userType, setUserType] = useState('user');
    const location = useLocation();

    useEffect(() => {
        // ... previous user logic ...
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const vendorData = JSON.parse(localStorage.getItem('vendorData') || '{}');
        const workerData = JSON.parse(localStorage.getItem('workerData') || '{}');

        let type = 'user';
        if (vendorData._id || vendorData.id) type = 'vendor';
        else if (workerData._id || workerData.id) type = 'worker';
        setUserType(type);

        const isHomePage = [
            '/user', 
            '/user/', 
            '/vendor',
            '/vendor/dashboard', 
            '/worker',
            '/worker/dashboard'
        ].includes(location.pathname);

        const checkPermission = async (isManualTrigger = false) => {
            console.log('Checking location permissions (manual:', isManualTrigger, ')');

            // If manual trigger (user clicked something), always show modal immediately
            if (isManualTrigger) {
                setShowModal(true);
                return;
            }

            const isIOSOrSafari = () => {
                const ua = window.navigator.userAgent;
                const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
                const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
                return isIOS || isSafari;
            };

            if (!isHomePage || isIOSOrSafari()) {
                return; // Only show automatic prompt on home pages after login, and not on iOS/Safari
            }

            const hasGrantedPreviously = localStorage.getItem('location_granted') === 'true';

            // 1. Silent check via Unified Bridge (prefers Native GPS)
            try {
                const locationResult = await flutterBridge.getCurrentLocation();
                console.log('Location already granted (bridge check success)');
                localStorage.setItem('location_granted', 'true');
                setShowModal(false);
            } catch (err) {
                console.log('Bridge check failed or permission needed:', err.message);
                // If we don't have permission, or it's turned off, show modal
                if (!hasGrantedPreviously || err.code === 1) { // 1 = PERMISSION_DENIED
                    setShowModal(true);
                }
            }

            // 2. Parallel check with Permissions API if available
            if (navigator.permissions) {
                try {
                    const status = await navigator.permissions.query({ name: 'geolocation' });
                    console.log('Permissions API status:', status.state);

                    if (status.state === 'denied' || status.state === 'prompt') {
                        if (!hasGrantedPreviously) setShowModal(true);
                    }

                    status.onchange = () => {
                        console.log('Permission state changed to:', status.state);
                        if (status.state === 'granted') {
                            setShowModal(false);
                            localStorage.setItem('location_granted', 'true');
                        }
                    };
                } catch (e) {
                    console.warn('Permissions API query failed:', e);
                }
            }
        };

        // Delay execution to ensure Flutter WebView is fully ready
        const timer = setTimeout(() => {
            checkPermission(false);
        }, 1500);


        // Global listener for manual triggers
        const handleManualTrigger = () => {
            console.log('Manual location trigger received');
            setShowModal(true);
        };
        window.addEventListener('requestLocationPrompt', handleManualTrigger);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('requestLocationPrompt', handleManualTrigger);
        };
    }, [location.pathname]);



    const handleSuccess = (coords) => {
        console.log('Location granted:', coords);
        localStorage.setItem('location_granted', 'true');
        // You can dispatch a global event or update context here
        window.dispatchEvent(new CustomEvent('locationUpdate', { detail: coords }));
    };


    const handleClose = () => {
        setShowModal(false);
    };

    return (
        <LocationAccessModal
            isOpen={showModal}
            onClose={handleClose}
            onSuccess={handleSuccess}
            userType={userType}
        />
    );
};
