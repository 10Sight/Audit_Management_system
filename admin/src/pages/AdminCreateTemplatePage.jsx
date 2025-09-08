import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "../context/AuthContext";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import api from "@/utils/axios";

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
          api.get("/api/lines"),
          api.get("/api/machines"),
          api.get("/api/processes"),
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

  const addQuestion = () =>
    setQuestions([...questions, { questionText: "", isGlobal: false }]);
  const removeQuestion = (idx) =>
    setQuestions(questions.filter((_, i) => i !== idx));

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

      await api.post("/api/questions", payload, {
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
    <div className="p-6 max-w-4xl mx-auto text-gray-900">
      <ToastContainer theme="light" />
      <div className="bg-gray-100 shadow-lg rounded-2xl p-6 sm:p-8 border border-gray-300">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          Create Inspection Template
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Select Options */}
          <div className="space-y-4">
            <select
              value={selectedLine}
              onChange={(e) => setSelectedLine(e.target.value)}
              className="p-3 bg-white border border-gray-400 rounded-md w-full text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            >
              <option value="">-- Select Line --</option>
              {lines.map((line) => (
                <option key={line._id} value={line._id}>
                  {line.name}
                </option>
              ))}
            </select>

            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="p-3 bg-white border border-gray-400 rounded-md w-full text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            >
              <option value="">-- Select Machine --</option>
              {machines.map((machine) => (
                <option key={machine._id} value={machine._id}>
                  {machine.name}
                </option>
              ))}
            </select>

            <select
              value={selectedProcess}
              onChange={(e) => setSelectedProcess(e.target.value)}
              className="p-3 bg-white border border-gray-400 rounded-md w-full text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            >
              <option value="">-- Select Process --</option>
              {processes.map((process) => (
                <option key={process._id} value={process._id}>
                  {process.name}
                </option>
              ))}
            </select>
          </div>

          {/* Questions Section */}
          <div className="space-y-4">
            <h2 className="font-semibold text-lg text-gray-800">Questions</h2>
            {questions.map((q, idx) => (
              <div
                key={idx}
                className="p-4 border rounded-lg bg-white space-y-3 shadow-sm"
              >
                <input
                  type="text"
                  placeholder="Question"
                  value={q.questionText}
                  onChange={(e) => handleQuestionChange(idx, e.target.value)}
                  className="p-2 bg-gray-50 border border-gray-400 rounded-md w-full text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />

                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-1 text-gray-700">
                    <input
                      type="checkbox"
                      checked={q.isGlobal}
                      onChange={() => handleGlobalToggle(idx)}
                      className="accent-green-600"
                    />
                    Global
                  </label>
                  <button
                    type="button"
                    onClick={() => removeQuestion(idx)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-md flex items-center gap-1 text-white transition"
                  >
                    <FiTrash2 /> Remove
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addQuestion}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md mt-2 flex items-center gap-2 transition"
            >
              <FiPlus /> Add Question
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md mt-4 font-medium transition"
          >
            {loading ? "Creating..." : "Create Template"}
          </button>
        </form>
      </div>
    </div>
  );
}
