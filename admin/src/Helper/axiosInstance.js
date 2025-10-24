import axios from "axios";

const BASE_URL = "https://audit-management-system-server.onrender.com";

const axiosInstance = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    timeout: 10000, // 10 second timeout
    headers: {
        'Content-Type': 'application/json',
    },
});

export default axiosInstance;
