import axios from "axios";

const api = axios.create({
    baseURL: 'https://api.audiotmanagementsystem.org',
    withCredentials: true,
});

export default api;