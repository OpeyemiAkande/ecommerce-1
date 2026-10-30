import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true
});

let getAuthToken = null;

// Registered from App.jsx with Clerk's getToken so API calls work even when
// the admin and the API are on different sites (session cookie isn't sent).
export const setAuthTokenGetter = (getter) => {
  getAuthToken = getter;
};

axiosInstance.interceptors.request.use(async (config) => {
  const token = await getAuthToken?.();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default axiosInstance;
