// AuditsPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "../context/AuthContext";
import {
  FiPlus,
  FiEdit,
  FiTrash2,
  FiArrowLeft,
  FiArrowRight,
} from "react-icons/fi";

export default function AuditsPage() {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const auditsPerPage = 5;
  const navigate = useNavigate();
  const { user: currentUser, loading: authLoading } = useAuth();

  // Fetch audits
  const fetchAudits = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get("http://localhost:5000/api/audits", {
        withCredentials: true,
      });
      const sortedAudits = (Array.isArray(data?.data) ? data.data : []).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setAudits(sortedAudits);
    } catch (err) {
      console.error("Failed to fetch audits:", err);
      toast.error("Failed to fetch audits");
      setAudits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudits();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this audit?")) return;

    try {
      setProcessing(true);
      await axios.delete(`http://localhost:5000/api/audits/${id}`, {
        withCredentials: true,
      });
      toast.success("Audit deleted successfully");
      setAudits((prev) => prev.filter((audit) => audit._id !== id));
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to delete audit");
    } finally {
      setProcessing(false);
    }
  };

  // Pagination
  const indexOfLast = currentPage * auditsPerPage;
  const indexOfFirst = indexOfLast - auditsPerPage;
  const currentAudits = audits.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(audits.length / auditsPerPage);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  if (loading || authLoading)
    return <div className="p-6 text-gray-700">Loading audits...</div>;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto text-gray-800">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Heading + Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <h1 className="text-2xl font-bold">Audits</h1>
        {currentUser?.role === "admin" && (
          <button
            onClick={() => navigate("/admin/audits/create")}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-md text-sm flex items-center gap-2 w-full sm:w-auto justify-center text-white"
            disabled={processing}
          >
            <FiPlus /> Add Audit
          </button>
        )}
      </div>

      {/* Audits List */}
      <div className="space-y-4">
        {audits.length > 0 ? (
          currentAudits.map((audit) => (
            <div
              key={audit._id}
              className="bg-white p-4 sm:p-5 rounded-lg shadow-md border border-gray-300 cursor-pointer hover:shadow-lg transition"
              onClick={() => navigate(`/admin/audits/${audit._id}`)}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex-1 flex flex-col gap-1">
                  <h2 className="text-lg sm:text-xl font-semibold break-words">
                    {audit.line?.name || "N/A"} - {audit.machine?.name || "N/A"} (
                    {audit.date
                      ? new Date(audit.date).toLocaleDateString()
                      : "N/A"}
                    )
                  </h2>
                  <p className="text-gray-600 text-sm sm:text-base break-words">
                    Process: {audit.process?.name || "N/A"} | Auditor:{" "}
                    {audit.auditor?.fullName || "N/A"} | Shift Incharge:{" "}
                    {audit.shiftIncharge || "N/A"} | Line Leader:{" "}
                    {audit.lineLeader || "N/A"}
                  </p>
                </div>

                {currentUser?.role === "admin" && (
                  <div className="flex gap-2 mt-2 sm:mt-0 flex-wrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/audits/edit/${audit._id}`);
                      }}
                      className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm flex items-center gap-1"
                      disabled={processing}
                    >
                      <FiEdit /> Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(audit._id);
                      }}
                      className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm flex items-center gap-1"
                      disabled={processing}
                    >
                      <FiTrash2 /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-center py-4">No audits found.</p>
        )}
      </div>

      {/* Pagination Controls */}
      {audits.length > auditsPerPage && (
        <div className="flex flex-wrap justify-center items-center mt-6 gap-2">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 flex items-center gap-1"
          >
            <FiArrowLeft /> Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => goToPage(i + 1)}
              className={`px-3 py-1 rounded-md ${
                currentPage === i + 1
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 flex items-center gap-1"
          >
            Next <FiArrowRight />
          </button>
        </div>
      )}
    </div>
  );
}
