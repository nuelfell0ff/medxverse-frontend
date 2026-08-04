import axios from "axios";

const API = axios.create({
  // baseURL:  "https://benedex-backend.onrender.com/api",
  baseURL:  "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor (Injects your JWT Token)
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);


// CRITICAL: GLOBAL INTERCEPTOR FOR MAINTENANCE MODE (503)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the server returns a 503 (Service Unavailable)
    if (error.response && error.response.status === 503) {
      
      // Double check localStorage to make sure we don't accidentally boot out the Admin
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      
      if (user.role !== "admin") {
        // Force-redirect non-admins to your maintenance screen route layout
        window.location.href = "/maintenance";
      }
    }
    
    return Promise.reject(error);
  }
);

export default API;