import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

// Create the context
const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);       // stores logged-in user
  const [loading, setLoading] = useState(true); // tracks fetching state

  // Fetch current user from backend
  const fetchUser = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/v1/auth/me", {
        withCredentials: true, // important to send HttpOnly cookie
      });
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
