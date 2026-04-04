import {useAuth} from "@clerk/clerk-expo";
import axios from "axios";
import {useEffect} from "react";

const API_URL = "http://192.168.0.173:8000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

export const useApi = () => {
  const {getToken} = useAuth();

  useEffect(() => {
    const interceptor = api.interceptors.request.use(async (config) => {
      const token = await getToken();
      // console.log("🌍 Request URL:", `${config.baseURL}${config.url}`);

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    });

    return () => {
      api.interceptors.request.eject(interceptor);
    };
  }, [getToken]);

  return api;
};
