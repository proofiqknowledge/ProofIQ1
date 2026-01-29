import { PublicClientApplication } from "@azure/msal-browser";

/**
 * Microsoft Authentication Library (MSAL) Configuration
 */

// 1. Feature Flag
export const MSAL_ENABLED = import.meta.env.VITE_MSAL_ENABLED === "true";

// 2. Configuration Object
// Check localStorage for selected tenant (default to 'ptg')
const selectedTenant = localStorage.getItem('msal_tenant') || 'ptg';

// Select IDs based on proper environment variables
const clientId = selectedTenant === 'ramp'
    ? (import.meta.env.VITE_MSAL_CLIENT_ID_RAMP || "PLACEHOLDER_RAMP_CLIENT_ID")
    : (import.meta.env.VITE_MSAL_CLIENT_ID || "PLACEHOLDER_CLIENT_ID");

const tenantId = selectedTenant === 'ramp'
    ? (import.meta.env.VITE_MSAL_TENANT_ID_RAMP || "common")
    : (import.meta.env.VITE_MSAL_TENANT_ID || "common");

export const msalConfiguration = {
    auth: {
        clientId: clientId,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        redirectUri: import.meta.env.VITE_MSAL_REDIRECT_URI || window.location.origin,
        postLogoutRedirectUri: window.location.origin,
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
    },
    system: {
        allowNativeBroker: false,
        windowHashTimeout: 60000,
        iframeHashTimeout: 6000,
        loadFrameTimeout: 0,
    }
};

// 3. Instance Creation (Safe Initialization)
// We export the *instance* so main.jsx can use it, but only if enabled or placeholders exist.
// This prevents crashes if config is totally missing in dev.
let msalInstance = null;

try {
    msalInstance = new PublicClientApplication(msalConfiguration);
} catch (error) {
    console.error("MSAL Configuration Failure:", error);
}

export { msalInstance };

// 4. Scopes
export const loginRequest = {
    scopes: ["User.Read", "openid", "profile", "email"],
    prompt: "select_account", // ✅ Force account picker to avoid "User not found in tenant" errors
};

