import React, { useState, useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { Toaster } from "@/components/ui/sonner";

function App() {

  return (
    <Router>
      <AppRoutes />
      <Toaster position="top-right" richColors />
    </Router>
  );
}

export default App;
