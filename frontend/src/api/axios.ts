import axios from 'axios';

// Create an Axios instance
const instance = axios.create({
    // Use environment variable or fallback to localhost
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
    headers: {
        'Content-Type': 'application/json',
    },
});

// --- 1. Request Interceptor ---
// Automatically adds the JWT Token to every request
instance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// --- 2. Response Interceptor ---
// Automatically logs the user out if the API says "401 Unauthorized"
instance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            // Optional: Redirect to login page
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default instance;