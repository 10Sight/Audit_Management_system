import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function AuditDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`http://localhost:5000/api/audits/${id}`, {
          withCredentials: true,
        });

        setAudit(data?.data || null);
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch audit");
        setAudit(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAudit();
  }, [id]);

  if (loading) return <div className="p-6 text-white">Loading audit...</div>;
  if (!audit) return <div className="p-6 text-white">Audit not found.</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto text-white">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Audit Details</h1>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md text-sm"
        >
          ← Back
        </button>
      </div>

      {/* Audit Metadata */}
      <div className="bg-neutral-900 p-4 rounded-lg shadow-md border border-neutral-800 mb-4">
        <h2 className="text-xl font-semibold mb-2">
          {audit.line?.name || "N/A"} - {audit.machine?.name || "N/A"} (
          {audit.date ? new Date(audit.date).toLocaleDateString() : "N/A"})
        </h2>
        <p className="text-gray-400 text-sm mb-1">
          Process: {audit.process?.name || "N/A"} | Auditor: {audit.auditor?.fullName || "N/A"} | Shift Incharge:{" "}
          {audit.shiftIncharge || "N/A"} | Line Leader: {audit.lineLeader || "N/A"}
        </p>
        <p className="text-gray-400 text-sm">
          Created by: {audit.createdBy?.fullName || "N/A"}
        </p>
      </div>

      {/* Questions & Answers */}
      <div className="space-y-3">
        {audit.answers?.length > 0 ? (
          <table className="table-auto w-full border-collapse border border-neutral-700">
            <thead>
              <tr className="bg-gray-800">
                <th className="px-4 py-2 border border-neutral-700">#</th>
                <th className="px-4 py-2 border border-neutral-700">Question</th>
                <th className="px-4 py-2 border border-neutral-700">Answer</th>
                <th className="px-4 py-2 border border-neutral-700">Remark</th>
              </tr>
            </thead>
            <tbody>
              {audit.answers.map((ans, idx) => (
                <tr key={ans._id} className={ans.answer === "No" ? "bg-red-900" : "bg-neutral-800"}>
                  <td className="px-4 py-2 border border-neutral-700 text-center">{idx + 1}</td>
                  <td className="px-4 py-2 border border-neutral-700">{ans.question?.questionText || "Question text missing"}</td>
                  <td className="px-4 py-2 border border-neutral-700 text-center">{ans.answer}</td>
                  <td className="px-4 py-2 border border-neutral-700">{ans.remark || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-400 mt-2">No questions found for this audit.</p>
        )}
      </div>
    </div>
  );
}
