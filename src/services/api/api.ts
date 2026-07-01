import axios from "axios";

const baseApiUrl = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: baseApiUrl,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const pathName = window.location.pathname;
    const isPublicAuthPath = pathName.startsWith("/auth");

    if (error.response?.status === 401 && !isPublicAuthPath && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await axios.post("/user/auth/refresh", undefined, { withCredentials: true, baseURL: baseApiUrl });
        return api(originalRequest); // Retry the original request
      } catch (refreshError) {
        console.error("Failed to refresh token:", refreshError);

        window.location.pathname = "/auth/logout";
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

export default api;
