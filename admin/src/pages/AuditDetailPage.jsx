import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FiImage, FiEye, FiX } from "react-icons/fi";
import api from "@/utils/axios";
import Loader from "@/components/ui/Loader";

export default function AuditDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);

  const openImageModal = (imageUrl) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
    setShowImageModal(false);
  };

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(
          `/api/audits/${id}`
        );
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

  if (loading)
    return (
      <Loader />
    );
  if (!audit)
    return (
      <div className="p-6 text-gray-700 text-center">Audit not found.</div>
    );

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto text-gray-800">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold">Audit Details</h1>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-md text-sm"
        >
          ← Back
        </button>
      </div>

      {/* Audit Metadata */}
      <div className="bg-gray-100 p-4 rounded-lg shadow-md border border-gray-300 mb-4 text-sm sm:text-base">
        <h2 className="text-lg font-semibold mb-2">
          {audit.line?.name || "N/A"} - {audit.machine?.name || "N/A"} (
          {audit.date ? new Date(audit.date).toLocaleDateString() : "N/A"})
        </h2>
        <p className="text-gray-600 mb-1">
          Process: {audit.process?.name || "N/A"} | Auditor:{" "}
          {audit.auditor?.fullName || "N/A"} | Shift Incharge:{" "}
          {audit.shiftIncharge || "N/A"} | Line Leader: {audit.lineLeader || "N/A"}
        </p>
        <p className="text-gray-600">
          Created by: {audit.createdBy?.fullName || "N/A"}
        </p>
      </div>

      {/* Questions & Answers */}
      <div className="space-y-3">
        {/* Table for desktop */}
        {audit.answers?.length > 0 && (
          <div className="hidden sm:block overflow-x-auto">
            <table className="table-auto w-full border border-gray-300 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-200 text-gray-700">
                  <th className="px-4 py-2 border border-gray-300">#</th>
                  <th className="px-4 py-2 border border-gray-300">Question</th>
                  <th className="px-4 py-2 border border-gray-300">Answer</th>
                  <th className="px-4 py-2 border border-gray-300">Remark</th>
                  <th className="px-4 py-2 border border-gray-300">Photos</th>
                </tr>
              </thead>
              <tbody>
                {audit.answers.map((ans, idx) => (
                  <tr
                    key={ans._id}
                    className={`${
                      ans.answer === "No" ? "bg-red-100" : "bg-white"
                    } hover:bg-gray-50 transition`}
                  >
                    <td className="px-4 py-2 border border-gray-300 text-center">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-2 border border-gray-300">
                      {ans.question?.questionText || "Question text missing"}
                    </td>
                    <td className="px-4 py-2 border border-gray-300 text-center font-medium">
                      {ans.answer}
                    </td>
                    <td className="px-4 py-2 border border-gray-300">
                      {ans.remark || "-"}
                    </td>
                    <td className="px-4 py-2 border border-gray-300">
                      {ans.photoUrls && ans.photoUrls.length > 0 ? (
                        <div className="flex gap-1 justify-center">
                          {ans.photoUrls.slice(0, 3).map((photo, photoIdx) => (
                            <button
                              key={photoIdx}
                              onClick={() => openImageModal(photo.url)}
                              className="w-8 h-8 rounded border hover:opacity-75 transition"
                            >
                              <img
                                src={photo.url}
                                alt={`Photo ${photoIdx + 1}`}
                                className="w-full h-full object-cover rounded"
                              />
                            </button>
                          ))}
                          {ans.photoUrls.length > 3 && (
                            <span className="text-xs text-gray-500 self-center">+{ans.photoUrls.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile Cards */}
        {audit.answers?.length > 0 && (
          <div className="sm:hidden space-y-3">
            {audit.answers.map((ans, idx) => (
              <div
                key={ans._id}
                className={`bg-white p-3 rounded-lg border shadow-sm ${
                  ans.answer === "No" ? "border-red-400 bg-red-50" : "border-gray-300"
                }`}
              >
                <p className="font-semibold mb-1">
                  {idx + 1}. {ans.question?.questionText || "Question text missing"}
                </p>
                <p>
                  <span className="font-medium">Answer:</span> {ans.answer}
                </p>
                {ans.remark && (
                  <p>
                    <span className="font-medium">Remark:</span> {ans.remark}
                  </p>
                )}
                {ans.photoUrls && ans.photoUrls.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium text-sm mb-1">Photos:</p>
                    <div className="flex gap-2 flex-wrap">
                      {ans.photoUrls.map((photo, photoIdx) => (
                        <button
                          key={photoIdx}
                          onClick={() => openImageModal(photo.url)}
                          className="w-16 h-16 rounded border hover:opacity-75 transition"
                        >
                          <img
                            src={photo.url}
                            alt={`Photo ${photoIdx + 1}`}
                            className="w-full h-full object-cover rounded"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!audit.answers?.length && (
          <p className="text-gray-500 mt-2">No questions found for this audit.</p>
        )}
      </div>

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={closeImageModal}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <img
              src={selectedImage}
              alt="Full size view"
              className="max-w-full max-h-full object-contain rounded-lg shadow-xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={closeImageModal}
              className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full p-2 transition"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
