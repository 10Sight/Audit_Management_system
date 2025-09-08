import { createContext, useContext, useState, useEffect } from "react";
import api from "@/utils/axios";

// Create the context
const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);      
  const [loading, setLoading] = useState(true); 

  // Fetch current user from backend
  const fetchUser = async () => {
    try {
      const res = await api.get("/api/v1/auth/me");
      setUser(res.data?.data?.employee || null);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use context easily
export const useAuth = () => useContext(AuthContext);
