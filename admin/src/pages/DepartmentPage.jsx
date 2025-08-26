import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
    <ul className="mt-4 divide-y divide-gray-700 border border-gray-700 rounded">
      {items.map((item) => (
        <li
          key={item._id}
          className="flex justify-between items-center px-4 py-2 hover:bg-gray-800 transition"
        >
          <span>{item.name}</span>
          <button
            onClick={() => deleteItem(type, item._id)}
            className="text-red-500 hover:text-red-700 font-semibold"
          >
            Delete
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto text-white">
      <ToastContainer position="top-right" autoClose={3000} />
      <h1 className="text-3xl font-bold mb-8">Department Management</h1>

      {/* Lines */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Lines</h2>
        <div className="flex gap-2 mb-2">
          <input
            className="flex-1 p-2 rounded bg-neutral-800 border border-gray-700"
            placeholder="Enter line name"
            value={lineName}
            onChange={(e) => setLineName(e.target.value)}
          />
          <button
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
            onClick={addLine}
          >
            Add
          </button>
        </div>
        {renderList(lines, "lines")}
      </div>

      {/* Machines */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Machines</h2>
        <div className="flex gap-2 mb-2">
          <input
            className="flex-1 p-2 rounded bg-neutral-800 border border-gray-700"
            placeholder="Enter machine name"
            value={machineName}
            onChange={(e) => setMachineName(e.target.value)}
          />
          <button
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
            onClick={addMachine}
          >
            Add
          </button>
        </div>
        {renderList(machines, "machines")}
      </div>

      {/* Processes */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Processes</h2>
        <div className="flex gap-2 mb-2">
          <input
            className="flex-1 p-2 rounded bg-neutral-800 border border-gray-700"
            placeholder="Enter process name"
            value={processName}
            onChange={(e) => setProcessName(e.target.value)}
          />
          <button
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
            onClick={addProcess}
          >
            Add
          </button>
        </div>
        {renderList(processes, "processes")}
      </div>
    </div>
  );
}
