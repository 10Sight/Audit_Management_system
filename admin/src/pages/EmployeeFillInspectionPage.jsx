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

  const [lines, setLines] = useState([]);
  const [machines, setMachines] = useState([]);
  const [processes, setProcesses] = useState([]);

  const [line, setLine] = useState("");
  const [machine, setMachine] = useState("");
  const [process, setProcess] = useState("");
  const [lineLeader, setLineLeader] = useState("");   
  const [shiftIncharge, setShiftIncharge] = useState("");

  const [questions, setQuestions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [submittedAuditId, setSubmittedAuditId] = useState(null);

  const baseURL = "http://14793.78.231:5000/api";

  // Fetch dropdowns
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

        const res = await axios.get(`${baseURL}/questions?${query.toString()}`, { withCredentials: true });
        const data = res.data?.data || [];

        // Fetch global questions
        const globalRes = await axios.get(`${baseURL}/questions?global=true`, { withCredentials: true });
        const globalData = globalRes.data?.data || [];

        // Merge unique
        const merged = [...data, ...globalData.filter(g => !data.some(d => d._id === g._id))];
        setQuestions(merged.map((q) => ({ ...q, answer: "", remark: "" })));
      } catch {
        toast.error("Failed to load questions");
      }
    };

    fetchQuestions();
  }, [line, machine, process]);

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
      setSubmittedAuditId(res.data?.data?._id);
      setShowModal(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit inspection");
    }
  };

  if (loading) return <div className="p-6 text-gray-700">Loading form...</div>;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto text-gray-800">
      <ToastContainer />
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center sm:text-left">
        Part and Quality Audit Performance
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selection Fields */}
        <div className="bg-gray-100 p-4 sm:p-6 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-4 shadow">
          <div>
            <label className="block mb-1 font-semibold">Date</label>
            <input
              type="date"
              value={new Date().toISOString().split("T")[0]}
              disabled
              className="p-2 bg-gray-200 rounded-md w-full"
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Line</label>
            <select value={line} onChange={(e) => setLine(e.target.value)} className="p-2 bg-white border rounded-md w-full" required>
              <option value="">Select Line</option>
              {lines.map((l) => (<option key={l._id} value={l._id}>{l.name}</option>))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-semibold">Machine</label>
            <select value={machine} onChange={(e) => setMachine(e.target.value)} className="p-2 bg-white border rounded-md w-full" required>
              <option value="">Select Machine</option>
              {machines.map((m) => (<option key={m._id} value={m._id}>{m.name}</option>))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-semibold">Process</label>
            <select value={process} onChange={(e) => setProcess(e.target.value)} className="p-2 bg-white border rounded-md w-full" required>
              <option value="">Select Process</option>
              {processes.map((p) => (<option key={p._id} value={p._id}>{p.name}</option>))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-semibold">Line Leader</label>
            <input type="text" placeholder="Line Leader" value={lineLeader} onChange={(e) => setLineLeader(e.target.value)} className="p-2 bg-white border rounded-md w-full" required />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Shift Incharge</label>
            <input type="text" placeholder="Shift Incharge" value={shiftIncharge} onChange={(e) => setShiftIncharge(e.target.value)} className="p-2 bg-white border rounded-md w-full" required />
          </div>

          <div className="sm:col-span-2">
            <label className="block mb-1 font-semibold">Auditor</label>
            <input type="text" value={currentUser?.fullName || "Unknown"} disabled className="p-2 bg-gray-200 rounded-md w-full" />
          </div>
        </div>

        {/* Questions Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-2">Inspection Questions</h2>
          {questions.length > 0 ? (
            questions.map((q, idx) => (
              <div key={q._id} className="bg-gray-100 p-4 rounded-lg border shadow space-y-2">
                <p className="font-medium break-words">{q.questionText}</p>
                <select value={q.answer} onChange={(e) => handleAnswerChange(idx, e.target.value)} className="p-2 bg-white border rounded-md w-full" required>
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
                {q.answer === "No" && (
                  <input type="text" placeholder="Remark" value={q.remark} onChange={(e) => handleRemarkChange(idx, e.target.value)} className="p-2 rounded-md border bg-white w-full" required />
                )}
              </div>
            ))
          ) : (
            <p className="text-red-500 text-center sm:text-left">No questions available for the selected filters.</p>
          )}
        </div>

        <button type="submit" className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
          Submit Audit
        </button>
      </form>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fadeIn p-4">
          <div className="bg-white p-6 rounded-xl max-w-sm w-full text-center space-y-4 shadow-lg transform transition-all duration-300 scale-100 animate-scaleIn">
            <FiCheckCircle className="mx-auto text-green-600 text-5xl" />
            <h2 className="text-2xl font-bold text-gray-800">Audit Submitted!</h2>
            <p className="text-gray-600">Choose an option to proceed:</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-4">
              <button onClick={() => navigate("/employee/dashboard")} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition w-full sm:w-auto">
                <FiHome /> Back to Home
              </button>
              <button onClick={() => navigate(`/employee/results/${submittedAuditId}`)} className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition w-full sm:w-auto">
                <FiBarChart2 /> Show Results
              </button>
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes scaleIn { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
          .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
          .animate-scaleIn { animation: scaleIn 0.3s ease-out; }
        `}
      </style>
    </div>
  );
}
