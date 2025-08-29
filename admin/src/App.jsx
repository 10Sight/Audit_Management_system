import React, { useState, useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import RoboticArm from "./components/ui/RoboticArm";

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // fake loading (2s). Replace with API call or asset preload if needed
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Router>
      {loading ? <RoboticArm /> : <AppRoutes />}
    </Router>
  );
}

export default App;
