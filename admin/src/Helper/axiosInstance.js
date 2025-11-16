import axios from "axios";

const BASE_URL = import.meta.env?.VITE_SERVER_URL || "http://https://swargaya-learning-management-system-3vcz.onrender.com";

const axiosInstance = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    timeout: 10000, // 10 second timeout
    headers: {
        'Content-Type': 'application/json',
    },
});

export default axiosInstance;
