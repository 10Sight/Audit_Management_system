import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "../context/AuthContext";

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
          axios.get("http://localhost:5000/api/lines", { withCredentials: true }),
          axios.get("http://localhost:5000/api/machines", { withCredentials: true }),
          axios.get("http://localhost:5000/api/processes", { withCredentials: true }),
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

        const { data } = await axios.get(
          `http://localhost:5000/api/questions?${query.toString()}`,
          { withCredentials: true }
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
      await axios.delete(`http://localhost:5000/api/questions/${id}`, { withCredentials: true });
      toast.success("Question deleted!");
      setQuestions(questions.filter((q) => q._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete question");
    }
  };

  if (!currentUser || currentUser.role !== "admin") return <div>Access Denied</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto text-white">
      <ToastContainer />
      <h1 className="text-3xl font-bold mb-6">Manage Questions</h1>

      {/* Filters */}
      <div className="bg-neutral-900 p-4 rounded-lg flex flex-wrap gap-4 mb-6 items-center">
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <select
            value={selectedLine}
            onChange={(e) => setSelectedLine(e.target.value)}
            className="p-2 bg-neutral-800 border border-neutral-700 rounded-md min-w-[150px]"
            disabled={fetchAll}
          >
            <option value="">-- All Lines --</option>
            {lines.map((line) => (
              <option key={line._id} value={line._id}>{line.name}</option>
            ))}
          </select>

          <select
            value={selectedMachine}
            onChange={(e) => setSelectedMachine(e.target.value)}
            className="p-2 bg-neutral-800 border border-neutral-700 rounded-md min-w-[150px]"
            disabled={fetchAll}
          >
            <option value="">-- All Machines --</option>
            {machines.map((machine) => (
              <option key={machine._id} value={machine._id}>{machine.name}</option>
            ))}
          </select>

          <select
            value={selectedProcess}
            onChange={(e) => setSelectedProcess(e.target.value)}
            className="p-2 bg-neutral-800 border border-neutral-700 rounded-md min-w-[150px]"
            disabled={fetchAll}
          >
            <option value="">-- All Processes --</option>
            {processes.map((process) => (
              <option key={process._id} value={process._id}>{process.name}</option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeGlobal}
            onChange={() => setIncludeGlobal(!includeGlobal)}
            className="accent-green-500"
          />
          Include Global
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={fetchAll}
            onChange={() => setFetchAll(!fetchAll)}
            className="accent-blue-500"
          />
          Fetch All Questions
        </label>
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="text-center p-4">Loading...</div>
      ) : questions.length === 0 ? (
        <div className="text-gray-400 text-center p-4">No questions found.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {questions.map((q) => (
            <div
              key={q._id}
              className={`p-4 rounded-md border flex flex-col justify-between ${
                q.isGlobal ? "border-yellow-500 bg-neutral-700" : "bg-neutral-800 border-neutral-700"
              }`}
            >
              <div>
                <p className="font-semibold mb-1">{q.questionText}</p>
                <p className="text-sm text-gray-400">
                  Line: {q.lines?.[0]?.name || "-"}, Machine: {q.machines?.[0]?.name || "-"}, Process: {q.processes?.[0]?.name || "-"}{" "}
                  {q.isGlobal && "(Global)"}
                </p>
              </div>
              <button
                onClick={() => handleDelete(q._id)}
                className="mt-2 px-3 py-1 bg-red-600 rounded-md hover:bg-red-700 transition self-start"
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
