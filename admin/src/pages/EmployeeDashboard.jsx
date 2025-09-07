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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const auditsPerPage = 5;

  const baseURL = "https://185.170.198.55:5000/api";

  useEffect(() => {
    const fetchAudits = async () => {
      try {
        const res = await axios.get(`${baseURL}/audits?auditor=${currentUser?._id}`, {
          withCredentials: true,
        });
        const fetchedAudits = res.data?.data || [];
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

  if (loading) return <div className="p-6 text-gray-800">Loading dashboard...</div>;

  // Pagination logic
  const indexOfLastAudit = currentPage * auditsPerPage;
  const indexOfFirstAudit = indexOfLastAudit - auditsPerPage;
  const currentAudits = audits.slice(indexOfFirstAudit, indexOfLastAudit);
  const totalPages = Math.ceil(audits.length / auditsPerPage);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto text-gray-900">
      <ToastContainer />
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center sm:text-left">
        Employee Dashboard
      </h1>

      <button
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition w-full sm:w-auto"
        onClick={downloadExcel}
      >
        Download Excel
      </button>

      {audits.length === 0 ? (
        <p className="text-gray-600 text-center mt-4">No audits filled yet.</p>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="grid gap-4 sm:hidden">
            {currentAudits.map((audit) => (
              <div
                key={audit._id}
                className="bg-gray-100 p-4 rounded-lg shadow border border-gray-300 space-y-2"
              >
                <p><strong>Date:</strong> {new Date(audit.date).toLocaleDateString()}</p>
                <p><strong>Line:</strong> {audit.line?.name || "N/A"}</p>
                <p><strong>Machine:</strong> {audit.machine?.name || "N/A"}</p>
                <p><strong>Process:</strong> {audit.process?.name || "N/A"}</p>
                <p>
                  <strong>Status:</strong>{" "}
                  {audit.answers.every((a) => a.answer === "Yes") ? (
                    <span className="text-green-600 font-semibold">Completed</span>
                  ) : (
                    <span className="text-red-600 font-semibold">Issues Found</span>
                  )}
                </p>
                <button
                  className="w-full px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  onClick={() => setSelectedAudit(audit)}
                >
                  View
                </button>
              </div>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="hidden sm:block overflow-x-auto rounded-lg shadow-md">
            <table className="min-w-full border border-gray-300 divide-y divide-gray-300 table-auto">
              <thead className="bg-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left text-sm">Date</th>
                  <th className="px-3 py-2 text-left text-sm">Line</th>
                  <th className="px-3 py-2 text-left text-sm">Machine</th>
                  <th className="px-3 py-2 text-left text-sm">Process</th>
                  <th className="px-3 py-2 text-left text-sm">Status</th>
                  <th className="px-3 py-2 text-left text-sm">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentAudits.map((audit) => (
                  <tr key={audit._id} className="hover:bg-gray-100 transition">
                    <td className="px-3 py-2 text-sm">{new Date(audit.date).toLocaleDateString()}</td>
                    <td className="px-3 py-2 text-sm">{audit.line?.name || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">{audit.machine?.name || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">{audit.process?.name || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">
                      {audit.answers.every((a) => a.answer === "Yes") ? (
                        <span className="text-green-600 font-semibold">Completed</span>
                      ) : (
                        <span className="text-red-600 font-semibold">Issues Found</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <button
                        className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 w-full sm:w-auto"
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

          {/* Pagination */}
          <div className="flex flex-wrap justify-center sm:justify-end gap-2 mt-4">
            <button
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded ${currentPage === 1 ? "bg-gray-400 text-white" : "bg-blue-600 text-white hover:bg-blue-700"}`}
              onClick={() => setCurrentPage((prev) => prev - 1)}
            >
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, idx) => (
              <button
                key={idx}
                className={`px-3 py-1 rounded ${currentPage === idx + 1 ? "bg-green-600 text-white" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                onClick={() => setCurrentPage(idx + 1)}
              >
                {idx + 1}
              </button>
            ))}

            <button
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded ${currentPage === totalPages ? "bg-gray-400 text-white" : "bg-blue-600 text-white hover:bg-blue-700"}`}
              onClick={() => setCurrentPage((prev) => prev + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}

      {/* Modal */}
      {selectedAudit && (
        <div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center z-50 p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white p-4 sm:p-6 rounded-xl max-w-2xl w-full text-gray-900 space-y-4 shadow-lg">
            <h2 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-4 text-center sm:text-left">
              Audit Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
              <p><strong>Date:</strong> {new Date(selectedAudit.date).toLocaleDateString()}</p>
              <p><strong>Line:</strong> {selectedAudit.line?.name || "N/A"}</p>
              <p><strong>Machine:</strong> {selectedAudit.machine?.name || "N/A"}</p>
              <p><strong>Process:</strong> {selectedAudit.process?.name || "N/A"}</p>
              <p><strong>Line Leader:</strong> {selectedAudit.lineLeader || "N/A"}</p>
              <p><strong>Shift Incharge:</strong> {selectedAudit.shiftIncharge || "N/A"}</p>
            </div>

            <h3 className="text-lg sm:text-xl font-semibold mt-4">Answers</h3>
            <div className="space-y-2 max-h-80 sm:max-h-96 overflow-y-auto">
              {selectedAudit.answers.map((a, idx) => (
                <div
                  key={idx}
                  className="bg-gray-100 p-2 sm:p-3 rounded-md border border-gray-300 break-words"
                >
                  <p><strong>Question:</strong> {a.question?.questionText || "N/A"}</p>
                  <p><strong>Answer:</strong> {a.answer}</p>
                  {a.answer === "No" && <p><strong>Remark:</strong> {a.remark}</p>}
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-center sm:justify-end gap-4 flex-col sm:flex-row">
              <button
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 w-full sm:w-auto"
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
