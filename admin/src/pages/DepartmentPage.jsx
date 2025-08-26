import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Trash2 } from "lucide-react"; // icon for delete

export default function DepartmentPage() {
  const [lines, setLines] = useState([]);
  const [machines, setMachines] = useState([]);
  const [processes, setProcesses] = useState([]);

  const [lineName, setLineName] = useState("");
  const [machineName, setMachineName] = useState("");
  const [processName, setProcessName] = useState("");

  const api = axios.create({
    baseURL: "http://localhost:5000/api",
    withCredentials: true,
  });

  useEffect(() => {
    fetchLines();
    fetchMachines();
    fetchProcesses();
  }, []);

  // Fetch functions
  const fetchLines = async () => {
    try {
      const res = await api.get("/lines");
      setLines(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMachines = async () => {
    try {
      const res = await api.get("/machines");
      setMachines(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProcesses = async () => {
    try {
      const res = await api.get("/processes");
      setProcesses(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Add functions
  const addLine = async () => {
    if (!lineName) return;
    try {
      await api.post("/lines", { name: lineName });
      toast.success("Line added");
      setLineName("");
      fetchLines();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add line");
    }
  };

  const addMachine = async () => {
    if (!machineName) return;
    try {
      await api.post("/machines", { name: machineName });
      toast.success("Machine added");
      setMachineName("");
      fetchMachines();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add machine");
    }
  };

  const addProcess = async () => {
    if (!processName) return;
    try {
      await api.post("/processes", { name: processName });
      toast.success("Process added");
      setProcessName("");
      fetchProcesses();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add process");
    }
  };

  // Delete functions
  const deleteItem = async (type, id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      await api.delete(`/${type}/${id}`);
      toast.success(`${type.slice(0, -1)} deleted`);
      if (type === "lines") fetchLines();
      if (type === "machines") fetchMachines();
      if (type === "processes") fetchProcesses();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const renderList = (items, type) => (
    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
      {items.map((item) => (
        <div
          key={item._id}
          className="flex justify-between items-center p-4 bg-neutral-900 border border-gray-700 rounded shadow hover:shadow-lg transition"
        >
          <span className="text-gray-200 font-medium">{item.name}</span>
          <button
            onClick={() => deleteItem(type, item._id)}
            className="text-red-500 hover:text-red-400"
          >
            <Trash2 size={18} />
          </button>
        </div>
      ))}
    </div>
  );

  const renderSection = (title, inputValue, setInputValue, addFunc, items, type) => (
    <div className="mb-10">
      <h2 className="text-2xl font-semibold mb-3">{title}</h2>
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <input
          className="flex-1 p-3 rounded-lg bg-neutral-800 border border-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={`Enter ${title.toLowerCase().slice(0, -1)} name`}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg font-semibold transition"
          onClick={addFunc}
        >
          Add
        </button>
      </div>
      {renderList(items, type)}
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto text-white">
      <ToastContainer position="top-right" autoClose={3000} />
      <h1 className="text-4xl font-bold mb-10 text-center">Department Management</h1>

      {renderSection("Lines", lineName, setLineName, addLine, lines, "lines")}
      {renderSection("Machines", machineName, setMachineName, addMachine, machines, "machines")}
      {renderSection("Processes", processName, setProcessName, addProcess, processes, "processes")}
    </div>
  );
}
