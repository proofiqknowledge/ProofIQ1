import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useMsal } from "@azure/msal-react";
import { logout } from '../../redux/slices/authSlice';
import { MSAL_ENABLED } from '../../config/msalConfig';

export default function LogoutPage() {
    const dispatch = useDispatch();
    const { instance } = useMsal();

    useEffect(() => {
        const performLogout = async () => {
            console.warn('💥 LOGOUT PAGE MOUNTED - EXECUTING TOTAL WIPE');

            // 1. Clear Redux
            dispatch(logout());

            // 2. Clear ALL storage
            try {
                localStorage.clear();
                sessionStorage.clear();

                // Specifically target common auth cookies if any (safety measure)
                document.cookie.split(";").forEach((c) => {
                    document.cookie = c
                        .replace(/^ +/, "")
                        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                });

                console.log('✅ Storage and cookies purged');
            } catch (err) {
                console.warn('Storage purge error:', err);
            }

            // 3. Handle MSAL identity logout
            try {
                if (MSAL_ENABLED && instance) {
                    const accounts = instance.getAllAccounts();
                    if (accounts.length > 0) {
                        console.log('Redirecting to Microsoft for session termination...');
                        await instance.logoutRedirect({
                            account: accounts[0],
                            postLogoutRedirectUri: `${window.location.origin}/login?logout=success`
                        });
                        return;
                    }
                }
            } catch (err) {
                console.error('MSAL identity logout failed:', err);
            }

            // 4. Force hard redirect if not using MSAL redirect
            console.log('Finalizing logout redirect...');
            setTimeout(() => {
                window.location.replace('/login?logout=force');
            }, 300);
        };

        performLogout();
    }, [dispatch, instance]);

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFFFFF',
            color: '#9B1C36',
            fontWeight: 'bold',
            fontSize: '1.2rem'
        }}>
            Logging out safe and secure...
        </div>
    );
}
