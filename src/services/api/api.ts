import axios from "axios";

const baseApiUrl = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: baseApiUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

async function getAccessToken() {
  const tokenCookie = await window.localStorage.getItem("token");
  return tokenCookie;
}

api.interceptors.request.use(async (config) => {
  const accessToken = await getAccessToken();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.status === 401 && window.location.pathname !== "/auth/login") {
      window.location.pathname = "/auth/login";
    }

    throw error;
  }
);

export default api;
