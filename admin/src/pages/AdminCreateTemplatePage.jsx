// AdminCreateTemplatePage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "../context/AuthContext";
import { FiPlus, FiTrash2 } from "react-icons/fi";

export default function AdminCreateTemplatePage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const [lines, setLines] = useState([]);
  const [machines, setMachines] = useState([]);
  const [processes, setProcesses] = useState([]);

  const [selectedLine, setSelectedLine] = useState("");
  const [selectedMachine, setSelectedMachine] = useState("");
  const [selectedProcess, setSelectedProcess] = useState("");

  const [questions, setQuestions] = useState([{ questionText: "", isGlobal: false }]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [linesRes, machinesRes, processesRes] = await Promise.all([
          axios.get("http://localhost:5000/api/lines", { withCredentials: true }),
          axios.get("http://localhost:5000/api/machines", { withCredentials: true }),
          axios.get("http://localhost:5000/api/processes", { withCredentials: true }),
        ]);

        setLines(linesRes.data.data);
        setMachines(machinesRes.data.data);
        setProcesses(processesRes.data.data);
      } catch (err) {
        toast.error("Failed to load options");
      }
    };
    fetchOptions();
  }, []);

  const addQuestion = () => setQuestions([...questions, { questionText: "", isGlobal: false }]);
  const removeQuestion = (idx) => setQuestions(questions.filter((_, i) => i !== idx));

  const handleQuestionChange = (idx, value) => {
    const newQ = [...questions];
    newQ[idx].questionText = value;
    setQuestions(newQ);
  };

  const handleGlobalToggle = (idx) => {
    const newQ = [...questions];
    newQ[idx].isGlobal = !newQ[idx].isGlobal;
    setQuestions(newQ);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!questions.length) return toast.error("Add at least one question!");
    if (!selectedLine || !selectedMachine || !selectedProcess) {
      return toast.error("Select a Line, Machine, and Process before adding questions!");
    }

    try {
      setLoading(true);
      const payload = questions.map((q) => ({
        questionText: q.questionText,
        isGlobal: q.isGlobal,
        line: selectedLine,
        machine: selectedMachine,
        process: selectedProcess,
      }));

      await axios.post("http://localhost:5000/api/questions", payload, {
        withCredentials: true,
      });

      toast.success("Template created!");
      navigate("/admin/questions");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create template");
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser || currentUser.role !== "admin") return <div>Access Denied</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto text-white">
      <ToastContainer />
      <h1 className="text-3xl font-bold mb-6">Create Inspection Template</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Select Options */}
        <div className="space-y-4">
          <select
            value={selectedLine}
            onChange={(e) => setSelectedLine(e.target.value)}
            className="p-2 bg-neutral-800 border border-neutral-700 rounded-md w-full"
            required
          >
            <option value="">-- Select Line --</option>
            {lines.map((line) => (
              <option key={line._id} value={line._id}>{line.name}</option>
            ))}
          </select>

          <select
            value={selectedMachine}
            onChange={(e) => setSelectedMachine(e.target.value)}
            className="p-2 bg-neutral-800 border border-neutral-700 rounded-md w-full"
            required
          >
            <option value="">-- Select Machine --</option>
            {machines.map((machine) => (
              <option key={machine._id} value={machine._id}>{machine.name}</option>
            ))}
          </select>

          <select
            value={selectedProcess}
            onChange={(e) => setSelectedProcess(e.target.value)}
            className="p-2 bg-neutral-800 border border-neutral-700 rounded-md w-full"
            required
          >
            <option value="">-- Select Process --</option>
            {processes.map((process) => (
              <option key={process._id} value={process._id}>{process.name}</option>
            ))}
          </select>
        </div>

        {/* Questions Section */}
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Questions</h2>
          {questions.map((q, idx) => (
            <div key={idx} className="p-4 border rounded-md bg-neutral-900 space-y-3">
              <input
                type="text"
                placeholder="Question"
                value={q.questionText}
                onChange={(e) => handleQuestionChange(idx, e.target.value)}
                className="p-2 bg-neutral-800 border border-neutral-700 rounded-md w-full"
                required
              />

              <div className="flex justify-between items-center">
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={q.isGlobal}
                    onChange={() => handleGlobalToggle(idx)}
                    className="accent-green-500"
                  />
                  Global
                </label>
                <button
                  type="button"
                  onClick={() => removeQuestion(idx)}
                  className="px-3 py-1 bg-red-600 rounded-md flex items-center gap-1"
                >
                  <FiTrash2 /> Remove
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addQuestion}
            className="px-4 py-2 bg-green-600 rounded-md mt-2 flex items-center gap-2"
          >
            <FiPlus /> Add Question
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 rounded-md mt-4"
        >
          {loading ? "Creating..." : "Create Template"}
        </button>
      </form>
    </div>
  );
}
