// EmployeeAuditResult.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function EmployeeAuditResult() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { auditId } = useParams(); // Expecting audit ID in route: /employee/results/:auditId
  const [loading, setLoading] = useState(true);
  const [audit, setAudit] = useState(null);

  const baseURL = "http://localhost:5000/api";

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const res = await axios.get(`${baseURL}/audits/${auditId}`, { withCredentials: true });
        setAudit(res.data?.data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch audit data");
      } finally {
        setLoading(false);
      }
    };

    fetchAudit();
  }, [auditId]);

  if (loading) return <div className="p-6 text-white">Loading audit result...</div>;
  if (!audit) return <div className="p-6 text-white">No audit found.</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto text-white">
      <ToastContainer />
      <h1 className="text-3xl font-bold mb-6">Audit Result</h1>

      <div className="bg-neutral-900 p-6 rounded-lg space-y-4">
        <div>
          <strong>Date:</strong> {new Date(audit.date).toLocaleDateString()}
        </div>
        <div>
          <strong>Line:</strong> {audit.line?.name || audit.line}
        </div>
        <div>
          <strong>Machine:</strong> {audit.machine?.name || audit.machine}
        </div>
        <div>
          <strong>Process:</strong> {audit.process?.name || audit.process}
        </div>
        <div>
          <strong>Line Leader:</strong> {audit.lineLeader}
        </div>
        <div>
          <strong>Shift Incharge:</strong> {audit.shiftIncharge}
        </div>
        <div>
          <strong>Auditor:</strong> {audit.auditor?.fullName || "Unknown"}
        </div>
      </div>

      <h2 className="text-2xl font-semibold mt-6 mb-2">Questions and Answers</h2>
      <div className="space-y-4">
        {audit.answers?.map((ans, idx) => (
          <div key={idx} className="bg-neutral-900 p-4 rounded-lg border border-neutral-700">
            <p className="font-medium">{ans.question?.questionText || ans.question}</p>
            <p>
              <strong>Answer:</strong> {ans.answer}
            </p>
            {ans.answer === "No" && ans.remark && (
              <p>
                <strong>Remark:</strong> {ans.remark}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6">
        <button
          className="px-6 py-2 bg-blue-600 rounded-md hover:bg-blue-700 transition"
          onClick={() => navigate("/employee/dashboard")}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
