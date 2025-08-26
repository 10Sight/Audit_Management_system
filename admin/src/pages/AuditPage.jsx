import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "../context/AuthContext";

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

  // Delete audit
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
    return <div className="p-6 text-white">Loading audits...</div>;

  return (
    <div className="p-6 text-white max-w-5xl mx-auto">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Heading + Add Button */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Audits</h1>
        {currentUser?.role === "admin" && (
          <button
            onClick={() => navigate("/admin/audits/create")}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm"
            disabled={processing}
          >
            ➕ Add Audit
          </button>
        )}
      </div>

      {/* Audits List */}
      <div className="space-y-4">
        {audits.length > 0 ? (
          currentAudits.map((audit) => (
            <div
              key={audit._id}
              className="bg-neutral-900 p-4 rounded-lg shadow-md border border-neutral-800 cursor-pointer hover:bg-neutral-800 transition"
              onClick={() => navigate(`/admin/audits/${audit._id}`)}
            >
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <h2 className="text-xl font-semibold">
                    {audit.line?.name || "N/A"} - {audit.machine?.name || "N/A"} (
                    {audit.date ? new Date(audit.date).toLocaleDateString() : "N/A"})
                  </h2>
                  <p className="text-gray-400 text-sm">
                    Process: {audit.process?.name || "N/A"} | Auditor: {audit.auditor?.fullName || "N/A"} | Shift Incharge:{" "}
                    {audit.shiftIncharge || "N/A"} | Line Leader: {audit.lineLeader || "N/A"}
                  </p>
                </div>

                {currentUser?.role === "admin" && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/audits/edit/${audit._id}`);
                      }}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-md text-sm"
                      disabled={processing}
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(audit._id);
                      }}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-md text-sm"
                      disabled={processing}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-red-400">No audits found.</p>
        )}
      </div>

      {/* Pagination Controls */}
      {audits.length > auditsPerPage && (
        <div className="flex justify-center items-center mt-6 gap-2">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-neutral-800 rounded-md hover:bg-neutral-700 disabled:opacity-50"
          >
            Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => goToPage(i + 1)}
              className={`px-3 py-1 rounded-md ${
                currentPage === i + 1 ? "bg-blue-600" : "bg-neutral-800 hover:bg-neutral-700"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-neutral-800 rounded-md hover:bg-neutral-700 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
