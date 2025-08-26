// EmployeeFillInspectionPage.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { FiCheckCircle, FiHome, FiBarChart2 } from "react-icons/fi";
import "react-toastify/dist/ReactToastify.css";

export default function EmployeeFillInspectionPage() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Dropdown data
  const [lines, setLines] = useState([]);
  const [machines, setMachines] = useState([]);
  const [processes, setProcesses] = useState([]);

  // Selections
  const [line, setLine] = useState("");
  const [machine, setMachine] = useState("");
  const [process, setProcess] = useState("");
  const [lineLeader, setLineLeader] = useState("");   
  const [shiftIncharge, setShiftIncharge] = useState("");

  // Questions
  const [questions, setQuestions] = useState([]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [submittedAuditId, setSubmittedAuditId] = useState(null); // New state

  const baseURL = "http://localhost:5000/api";

  // Fetch dropdown data
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [linesRes, machinesRes, processesRes] = await Promise.all([
          axios.get(`${baseURL}/lines`, { withCredentials: true }),
          axios.get(`${baseURL}/machines`, { withCredentials: true }),
          axios.get(`${baseURL}/processes`, { withCredentials: true }),
        ]);
        setLines(linesRes.data?.data || []);
        setMachines(machinesRes.data?.data || []);
        setProcesses(processesRes.data?.data || []);
      } catch (err) {
        console.error("Error fetching dropdowns:", err);
        toast.error("Failed to load dropdowns");
      } finally {
        setLoading(false);
      }
    };
    fetchDropdowns();
  }, []);

  // Fetch questions when line/machine/process changes
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const query = new URLSearchParams();
        if (line) query.append("lineId", line);
        if (machine) query.append("machineId", machine);
        if (process) query.append("processId", process);

        const res = await axios.get(`${baseURL}/questions?${query.toString()}`, {
          withCredentials: true,
        });

        const data = res.data?.data || [];
        setQuestions(data.map((q) => ({ ...q, answer: "", remark: "" })));
      } catch (err) {
        console.error("Error fetching questions:", err);
        toast.error("Failed to load questions");
      }
    };

    fetchQuestions();
  }, [line, machine, process]);

  // Handlers
  const handleAnswerChange = (idx, value) => {
    const newQs = [...questions];
    newQs[idx].answer = value;
    if (value !== "No") newQs[idx].remark = "";
    setQuestions(newQs);
  };

  const handleRemarkChange = (idx, value) => {
    const newQs = [...questions];
    newQs[idx].remark = value;
    setQuestions(newQs);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!line || !machine || !process || !lineLeader || !shiftIncharge) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const payload = {
        date: new Date(),
        line,
        machine,
        process,
        lineLeader,
        shiftIncharge,
        auditor: currentUser?._id,
        answers: questions.map((q) => ({
          question: q._id,
          answer: q.answer,
          remark: q.answer === "No" ? q.remark : "",
        })),
      };

      const res = await axios.post(`${baseURL}/audits`, payload, { withCredentials: true });

      // Store the audit ID returned from backend
      setSubmittedAuditId(res.data?.data?._id);

      // Show modal after success
      setShowModal(true);
    } catch (err) {
      console.error("Error submitting inspection:", err);
      toast.error(err.response?.data?.message || "Failed to submit inspection");
    }
  };

  if (loading) return <div className="p-6 text-white">Loading form...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto text-white">
      <ToastContainer />
      <h1 className="text-3xl font-bold mb-6">Part and Quality Audit Performance</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selection Fields */}
        <div className="bg-neutral-900 p-4 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 font-semibold">Date</label>
            <input
              type="date"
              value={new Date().toISOString().split("T")[0]}
              disabled
              className="p-2 bg-neutral-800 rounded-md w-full"
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Line</label>
            <select
              value={line}
              onChange={(e) => setLine(e.target.value)}
              className="p-2 bg-neutral-800 rounded-md w-full"
              required
            >
              <option value="">Select Line</option>
              {lines.map((l) => (
                <option key={l._id} value={l._id}>{l.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-semibold">Machine</label>
            <select
              value={machine}
              onChange={(e) => setMachine(e.target.value)}
              className="p-2 bg-neutral-800 rounded-md w-full"
              required
            >
              <option value="">Select Machine</option>
              {machines.map((m) => (
                <option key={m._id} value={m._id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-semibold">Process</label>
            <select
              value={process}
              onChange={(e) => setProcess(e.target.value)}
              className="p-2 bg-neutral-800 rounded-md w-full"
              required
            >
              <option value="">Select Process</option>
              {processes.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-semibold">Line Leader</label>
            <input
              type="text"
              placeholder="Line Leader"
              value={lineLeader}
              onChange={(e) => setLineLeader(e.target.value)}
              className="p-2 bg-neutral-800 rounded-md w-full"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Shift Incharge</label>
            <input
              type="text"
              placeholder="Shift Incharge"
              value={shiftIncharge}
              onChange={(e) => setShiftIncharge(e.target.value)}
              className="p-2 bg-neutral-800 rounded-md w-full"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Auditor</label>
            <input
              type="text"
              value={currentUser?.fullName || "Unknown"}
              disabled
              className="p-2 bg-neutral-800 rounded-md w-full"
            />
          </div>
        </div>

        {/* Questions Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-2">Inspection Questions</h2>
          {questions.length > 0 ? (
            questions.map((q, idx) => (
              <div key={q._id} className="bg-neutral-900 p-4 rounded-lg border border-neutral-700 space-y-2">
                <p className="font-medium">{q.questionText}</p>
                <select
                  value={q.answer}
                  onChange={(e) => handleAnswerChange(idx, e.target.value)}
                  className="p-2 bg-neutral-800 rounded-md w-full"
                  required
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
                {q.answer === "No" && (
                  <input
                    type="text"
                    placeholder="Remark"
                    value={q.remark}
                    onChange={(e) => handleRemarkChange(idx, e.target.value)}
                    className="p-2 rounded-md bg-neutral-800 w-full"
                    required
                  />
                )}
              </div>
            ))
          ) : (
            <p className="text-red-400">No questions available for the selected filters.</p>
          )}
        </div>

        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 rounded-md hover:bg-blue-700 transition"
        >
          Submit Audit
        </button>
      </form>

      {/* Animated Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-neutral-900 p-6 rounded-xl max-w-sm w-full text-center space-y-4 transform transition-all duration-300 scale-100 animate-scaleIn">
            <FiCheckCircle className="mx-auto text-green-500 text-5xl" />
            <h2 className="text-2xl font-bold">Audit Submitted!</h2>
            <p className="text-gray-300">Choose an option to proceed:</p>
            <div className="flex justify-center gap-4 mt-4">
              <button
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700 transition"
                onClick={() => navigate("/employee/dashboard")}
              >
                <FiHome /> Back to Home
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2 bg-green-600 rounded-md hover:bg-green-700 transition"
                onClick={() => navigate(`/employee/results/${submittedAuditId}`)}
              >
                <FiBarChart2 /> Show Results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tailwind animation classes */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes scaleIn {
            0% { transform: scale(0.8); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
          .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
          .animate-scaleIn { animation: scaleIn 0.3s ease-out; }
        `}
      </style>
    </div>
  );
}
