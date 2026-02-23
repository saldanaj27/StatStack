import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api/",
  timeout: 30000,
});

// Simulation state (module-level, set by SimulationContext)
let simulationParams = null;

export function setSimulationParams(params) {
  simulationParams = params;
}

// Inject simulation params into every request when active
api.interceptors.request.use((config) => {
  if (simulationParams) {
    config.params = {
      ...config.params,
      simulate_season: simulationParams.season,
      simulate_week: simulationParams.week,
    };
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (import.meta.env.DEV) {
      console.error("API Error:", error.response?.status, error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
