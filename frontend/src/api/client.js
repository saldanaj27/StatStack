import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api/",
  timeout: 30000,
});

// Toast listener bridge — lets non-React code dispatch toasts
let toastListener = null;

export function setToastListener(fn) {
  toastListener = fn;
}

export function clearToastListener() {
  toastListener = null;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (import.meta.env.DEV) {
      console.error("API Error:", error.response?.status, error.message);
    }

    const status = error.response?.status;

    // Classify and toast transient errors (skip 401/403/404 — pages handle those)
    if (toastListener && status !== 401 && status !== 403 && status !== 404) {
      if (!error.response && (error.code === "ECONNABORTED" || error.message?.includes("timeout"))) {
        toastListener("Request timed out. Please try again.");
      } else if (!error.response) {
        toastListener("Network error. Check your connection.");
      } else if (status === 429) {
        toastListener("Too many requests. Please wait a moment.", { type: "warning" });
      } else if (status >= 500) {
        toastListener("Something went wrong. Please try again.");
      }
    }

    return Promise.reject(error);
  }
);

export default api;
