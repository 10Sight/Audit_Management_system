// EmployeeDashboard.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import * as XLSX from "xlsx";

export default function EmployeeDashboard() {
  const { user: currentUser } = useAuth();
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAudit, setSelectedAudit] = useState(null);

  const baseURL = "http://localhost:5000/api";

  useEffect(() => {
    const fetchAudits = async () => {
      try {
        const res = await axios.get(`${baseURL}/audits?auditor=${currentUser?._id}`, {
          withCredentials: true,
        });

        const fetchedAudits = res.data?.data || [];

        // Sort by date descending (newest first)
        fetchedAudits.sort((a, b) => new Date(b.date) - new Date(a.date));

        setAudits(fetchedAudits);
      } catch (err) {
        console.error("Error fetching audits:", err);
        toast.error("Failed to load audits");
      } finally {
        setLoading(false);
      }
    };
    fetchAudits();
  }, [currentUser]);

  const downloadExcel = () => {
    if (audits.length === 0) {
      toast.info("No audits to download");
      return;
    }

    const data = audits.map((audit) => ({
      Date: new Date(audit.date).toLocaleDateString(),
      Line: audit.line?.name || "N/A",
      Machine: audit.machine?.name || "N/A",
      Process: audit.process?.name || "N/A",
      LineLeader: audit.lineLeader || "N/A",
      ShiftIncharge: audit.shiftIncharge || "N/A",
      Status: audit.answers.every((a) => a.answer === "Yes") ? "Completed" : "Issues Found",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Audits");
    XLSX.writeFile(workbook, `Audits_${currentUser?.fullName || "user"}.xlsx`);
  };

  if (loading) return <div className="p-6 text-white">Loading dashboard...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto text-white">
      <ToastContainer />
      <h1 className="text-3xl font-bold mb-6">Employee Dashboard</h1>

      <button
        className="mb-4 px-4 py-2 bg-white text-black rounded hover:bg-gray-200 transition"
        onClick={downloadExcel}
      >
        Download Excel
      </button>

      {audits.length === 0 ? (
        <p className="text-gray-400">No audits filled yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-neutral-700 rounded-lg overflow-hidden">
            <thead className="bg-neutral-900">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Line</th>
                <th className="px-4 py-2 text-left">Machine</th>
                <th className="px-4 py-2 text-left">Process</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="bg-neutral-950">
              {audits.map((audit) => (
                <tr key={audit._id} className="border-b border-neutral-700">
                  <td className="px-4 py-2">{new Date(audit.date).toLocaleDateString()}</td>
                  <td className="px-4 py-2">{audit.line?.name || "N/A"}</td>
                  <td className="px-4 py-2">{audit.machine?.name || "N/A"}</td>
                  <td className="px-4 py-2">{audit.process?.name || "N/A"}</td>
                  <td className="px-4 py-2">
                    {audit.answers.every((a) => a.answer === "Yes") ? (
                      <span className="text-green-400 font-semibold">Completed</span>
                    ) : (
                      <span className="text-red-400 font-semibold">Issues Found</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      className="px-2 py-1 bg-blue-600 rounded hover:bg-blue-700"
                      onClick={() => setSelectedAudit(audit)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View Modal */}
      {selectedAudit && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-neutral-900 p-6 rounded-lg max-w-2xl w-full overflow-y-auto max-h-[80vh]">
            <h2 className="text-2xl font-bold mb-4">Audit Details</h2>
            <p className="mb-2"><strong>Date:</strong> {new Date(selectedAudit.date).toLocaleDateString()}</p>
            <p className="mb-2"><strong>Line:</strong> {selectedAudit.line?.name || "N/A"}</p>
            <p className="mb-2"><strong>Machine:</strong> {selectedAudit.machine?.name || "N/A"}</p>
            <p className="mb-2"><strong>Process:</strong> {selectedAudit.process?.name || "N/A"}</p>
            <p className="mb-2"><strong>Line Leader:</strong> {selectedAudit.lineLeader}</p>
            <p className="mb-2"><strong>Shift Incharge:</strong> {selectedAudit.shiftIncharge}</p>

            <h3 className="text-xl font-semibold mt-4 mb-2">Answers</h3>
            <div className="space-y-2">
              {selectedAudit.answers.map((a, idx) => (
                <div key={idx} className="bg-neutral-950 p-3 rounded-md border border-neutral-700">
                  <p><strong>Question:</strong> {a.question?.questionText || "N/A"}</p>
                  <p><strong>Answer:</strong> {a.answer}</p>
                  {a.answer === "No" && <p><strong>Remark:</strong> {a.remark}</p>}
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
                onClick={() => setSelectedAudit(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
