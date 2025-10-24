import axios from "axios";

// Create axios instance with optimized configuration
const api = axios.create({
    baseURL: import.meta.env.VITE_SERVER_URL || 'https://audit-management-system-server.onrender.com',
    withCredentials: true,
    timeout: 30000, // 30 second default timeout
    headers: {
        'Content-Type': 'application/json',
    },
});

// Simple cache for GET requests
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Request interceptor for performance monitoring and caching
api.interceptors.request.use(
    (config) => {
        // Add timestamp for performance monitoring
        config.metadata = { startTime: new Date() };
        
        // Check cache for GET requests
        if (config.method === 'get') {
            const cacheKey = `${config.url}?${JSON.stringify(config.params)}`;
            const cachedResponse = cache.get(cacheKey);
            
            if (cachedResponse && (Date.now() - cachedResponse.timestamp) < CACHE_DURATION) {
                // Return cached response
                config.adapter = () => {
                    return Promise.resolve({
                        data: cachedResponse.data,
                        status: 200,
                        statusText: 'OK',
                        headers: {},
                        config,
                        request: {}
                    });
                };
            }
        }
        
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for caching and error handling
api.interceptors.response.use(
    (response) => {
        // Performance logging in development
        if (process.env.NODE_ENV === 'development' && response.config.metadata) {
            const endTime = new Date();
            const duration = endTime - response.config.metadata.startTime;
            // Adjust warning threshold based on endpoint complexity
            let threshold = 1000; // Default 1 second
            if (response.config.url.includes('/stats') || 
                response.config.url.includes('/aggregate') ||
                response.config.url.includes('/audit')) {
                threshold = 2000; // 2 seconds for complex queries
            }
            
            if (duration > threshold) {
                console.warn(`Slow API request: ${response.config.url} took ${duration}ms (threshold: ${threshold}ms)`);
            }
        }
        
        // Cache successful GET requests
        if (response.config.method === 'get' && response.status === 200) {
            const cacheKey = `${response.config.url}?${JSON.stringify(response.config.params)}`;
            cache.set(cacheKey, {
                data: response.data,
                timestamp: Date.now()
            });
            
            // Clean old cache entries
            if (cache.size > 50) {
                const entries = Array.from(cache.entries());
                const oldEntries = entries.filter(([, value]) => 
                    (Date.now() - value.timestamp) > CACHE_DURATION
                );
                oldEntries.forEach(([key]) => cache.delete(key));
            }
        }
        
        return response;
    },
    (error) => {
        // Handle common error scenarios
        if (error.code === 'ECONNABORTED') {
            if (process.env.NODE_ENV === 'development') {
                console.error('Request timeout:', error.config.url);
            }
        }
        
        // Clear cache on 401 errors (authentication issues)
        if (error.response?.status === 401) {
            cache.clear();
        }
        
        return Promise.reject(error);
    }
);

// Function to manually clear cache
api.clearCache = () => {
    cache.clear();
};

export default api;
