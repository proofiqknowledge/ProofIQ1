import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { MsalProvider } from "@azure/msal-react";
import App from './App';
import store from './redux/store';
import { setCredentials } from './redux/slices/authSlice';
import { msalInstance } from './config/msalConfig';
import './index.css';
import 'react-toastify/dist/ReactToastify.css';

// Hydrate auth state from localStorage so protected routes work after reload
const token = localStorage.getItem('token');
let storedUser = null;
try {
  const raw = localStorage.getItem('user');
  storedUser = raw ? JSON.parse(raw) : null;
} catch (err) {
  storedUser = null;
}

if (token && storedUser) {
  store.dispatch(setCredentials({ user: storedUser, token, role: storedUser.role }));
}

// Initialize MSAL and then Render
msalInstance.initialize().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <Provider store={store}>
        <MsalProvider instance={msalInstance}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </MsalProvider>
      </Provider>
    </React.StrictMode>
  );
}).catch(err => {
  console.error("MSAL Initialization Failed:", err);
});

