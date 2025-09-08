import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "../context/AuthContext";
import api from "@/utils/axios";

export default function AdminManageQuestionsPage() {
  const { user: currentUser } = useAuth();

  const [lines, setLines] = useState([]);
  const [machines, setMachines] = useState([]);
  const [processes, setProcesses] = useState([]);

  const [selectedLine, setSelectedLine] = useState("");
  const [selectedMachine, setSelectedMachine] = useState("");
  const [selectedProcess, setSelectedProcess] = useState("");
  const [includeGlobal, setIncludeGlobal] = useState(true);
  const [fetchAll, setFetchAll] = useState(false);

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch dropdown options
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [linesRes, machinesRes, processesRes] = await Promise.all([
          api.get("/api/lines",),
          api.get("/api/machines",),
          api.get("/api/processes",),
        ]);
        setLines(linesRes.data.data || []);
        setMachines(machinesRes.data.data || []);
        setProcesses(processesRes.data.data || []);
      } catch (err) {
        toast.error("Failed to load dropdown options");
      }
    };
    fetchOptions();
  }, []);

  // Fetch questions based on filters
  useEffect(() => {
    if (!currentUser || currentUser.role !== "admin") return;

    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (!fetchAll) {
          if (selectedLine) query.append("line", selectedLine);
          if (selectedMachine) query.append("machine", selectedMachine);
          if (selectedProcess) query.append("process", selectedProcess);
        }
        query.append("includeGlobal", includeGlobal ? "true" : "false");

        const { data } = await api.get(
          `/api/questions?${query.toString()}`
        );

        setQuestions(data.data);
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to fetch questions");
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [selectedLine, selectedMachine, selectedProcess, includeGlobal, fetchAll, currentUser]);

  // Delete question
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;
    try {
      await api.delete(`/api/questions/${id}`);
      toast.success("Question deleted!");
      setQuestions(questions.filter((q) => q._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete question");
    }
  };

  if (!currentUser || currentUser.role !== "admin")
    return <div className="text-center p-6 text-red-500">Access Denied</div>;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto text-gray-900">
      <ToastContainer position="top-right" autoClose={3000} />
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Manage Questions</h1>

      {/* Filters */}
      <div className="bg-gray-100 p-4 sm:p-6 rounded-lg flex flex-col sm:flex-row flex-wrap gap-4 mb-6 items-start sm:items-center shadow">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <select
            value={selectedLine}
            onChange={(e) => setSelectedLine(e.target.value)}
            className="p-2 bg-white border border-gray-300 rounded-md min-w-[150px]"
            disabled={fetchAll}
          >
            <option value="">-- All Lines --</option>
            {lines.map((line) => (
              <option key={line._id} value={line._id}>
                {line.name}
              </option>
            ))}
          </select>

          <select
            value={selectedMachine}
            onChange={(e) => setSelectedMachine(e.target.value)}
            className="p-2 bg-white border border-gray-300 rounded-md min-w-[150px]"
            disabled={fetchAll}
          >
            <option value="">-- All Machines --</option>
            {machines.map((machine) => (
              <option key={machine._id} value={machine._id}>
                {machine.name}
              </option>
            ))}
          </select>

          <select
            value={selectedProcess}
            onChange={(e) => setSelectedProcess(e.target.value)}
            className="p-2 bg-white border border-gray-300 rounded-md min-w-[150px]"
            disabled={fetchAll}
          >
            <option value="">-- All Processes --</option>
            {processes.map((process) => (
              <option key={process._id} value={process._id}>
                {process.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-4 flex-wrap">
          <label className="flex items-center gap-2 text-gray-700">
            <input
              type="checkbox"
              checked={includeGlobal}
              onChange={() => setIncludeGlobal(!includeGlobal)}
              className="accent-green-600"
            />
            Include Global
          </label>

          <label className="flex items-center gap-2 text-gray-700">
            <input
              type="checkbox"
              checked={fetchAll}
              onChange={() => setFetchAll(!fetchAll)}
              className="accent-blue-600"
            />
            Fetch All Questions
          </label>
        </div>
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="text-center p-4 text-gray-600">Loading...</div>
      ) : questions.length === 0 ? (
        <div className="text-gray-500 text-center p-4">No questions found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {questions.map((q) => (
            <div
              key={q._id}
              className={`p-4 rounded-md border flex flex-col justify-between h-full shadow ${
                q.isGlobal
                  ? "border-yellow-400 bg-yellow-50"
                  : "bg-white border-gray-300"
              }`}
            >
              <div>
                <p className="font-semibold mb-1 text-gray-900">{q.questionText}</p>
                <p className="text-sm text-gray-600">
                  Line: {q.lines?.[0]?.name || "-"}, Machine: {q.machines?.[0]?.name || "-"}, Process:{" "}
                  {q.processes?.[0]?.name || "-"} {q.isGlobal && "(Global)"}
                </p>
              </div>
              <button
                onClick={() => handleDelete(q._id)}
                className="mt-3 px-3 py-1 bg-red-600 rounded-md hover:bg-red-700 transition self-start text-sm text-white"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
