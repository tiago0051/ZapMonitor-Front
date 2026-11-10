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

const REFRESH_LOCK = "zapmonitor:auth-refresh";
const REFRESHED_AT_KEY = "zapmonitor:auth-refreshed-at";

let refreshing: Promise<void> | null = null;

const readRefreshedAt = () => {
  try {
    return Number(localStorage.getItem(REFRESHED_AT_KEY)) || 0;
  } catch {
    return 0;
  }
};

const renewSession = async (sentAt: number) => {
  // Outra aba renovou depois que a requisição saiu: o cookie novo já vale, basta repetir
  if (readRefreshedAt() > sentAt) return;

  await axios.post("/user/auth/refresh", undefined, { withCredentials: true, baseURL: baseApiUrl });
  try {
    localStorage.setItem(REFRESHED_AT_KEY, String(Date.now()));
  } catch {
    // Sem localStorage cada aba renova por conta própria
  }
};

/**
 * O refresh token vale uma vez. Uma renovação por vez na aba (várias requisições com 401 juntas) e entre abas do
 * mesmo navegador (Web Locks), para nenhuma usar um token que outra acabou de trocar e cair no logout.
 */
const refreshSession = (sentAt: number) => {
  refreshing ??= (navigator.locks ? navigator.locks.request(REFRESH_LOCK, () => renewSession(sentAt)) : renewSession(sentAt)).finally(
    () => {
      refreshing = null;
    },
  );
  return refreshing;
};

api.interceptors.request.use((config) => {
  (config as typeof config & { _sentAt?: number })._sentAt = Date.now();
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await refreshSession(originalRequest._sentAt ?? Date.now());
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
