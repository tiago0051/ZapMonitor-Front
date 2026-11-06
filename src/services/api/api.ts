import axios from "axios";

// Resposta do back quando o plano do tenant venceu e o usuário perdeu o acesso
export const PLAN_EXPIRED_CODE = "PLAN_EXPIRED";
export const PLAN_EXPIRED_EVENT = "zapmonitor:plan-expired";

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

    if (error.response?.status === 401 && !originalRequest._retry) {
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
    // Plano vencido no meio do uso: a tela do cliente recarrega o acesso e mostra o aviso de bloqueio
    if (error.response?.status === 403 && error.response?.data?.code === PLAN_EXPIRED_CODE)
      window.dispatchEvent(new CustomEvent(PLAN_EXPIRED_EVENT));

    return Promise.reject(error);
  },
);

export default api;
