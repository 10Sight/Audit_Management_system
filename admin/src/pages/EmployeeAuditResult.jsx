import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useGetAuditByIdQuery } from "@/store/api";
import Loader from "@/components/ui/Loader";

export default function EmployeeAuditResult() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { auditId } = useParams();
  const [loading, setLoading] = useState(true);
  const [audit, setAudit] = useState(null);

  const { data: auditRes, isLoading: auditLoading } = useGetAuditByIdQuery(auditId, { skip: !auditId });
  useEffect(() => {
    setLoading(auditLoading);
    setAudit(auditRes?.data);
  }, [auditRes, auditLoading]);

  if (loading) return <Loader />;
  if (!audit) return <div className="p-6 text-gray-700 text-center">No audit found.</div>;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto text-gray-900">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center sm:text-left">
        Audit Result
      </h1>

      {/* Audit Metadata */}
      <div className="bg-gray-100 p-4 sm:p-6 rounded-lg space-y-2 sm:space-y-3 border border-gray-300 shadow-sm">
        <div><strong>Date:</strong> {new Date(audit.date).toLocaleDateString()}</div>
        <div><strong>Line:</strong> {audit.line?.name || audit.line}</div>
        <div><strong>Machine:</strong> {audit.machine?.name || audit.machine}</div>
        <div><strong>Process:</strong> {audit.process?.name || audit.process}</div>
        <div><strong>Line Leader:</strong> {audit.lineLeader}</div>
        <div><strong>Shift Incharge:</strong> {audit.shiftIncharge}</div>
        <div><strong>Auditor:</strong> {audit.auditor?.fullName || "Unknown"}</div>
      </div>

      {/* Questions & Answers */}
      <h2 className="text-xl sm:text-2xl font-semibold mt-6 mb-2">
        Questions and Answers
      </h2>
      <div className="space-y-4">
        {audit.answers?.length > 0 ? (
          audit.answers.map((ans, idx) => (
            <div
              key={idx}
              className={`bg-white p-4 sm:p-6 rounded-lg border shadow-sm ${
                ans.answer === "No" ? "border-red-400 bg-red-50" : "border-gray-300"
              }`}
            >
              <p className="font-medium mb-1 text-sm sm:text-base">
                {idx + 1}. {ans.question?.questionText || ans.question}
              </p>
              <p className="text-sm sm:text-base">
                <strong>Answer:</strong>{" "}
                {ans.answer === "Yes" ? (
                  <span className="text-green-600 font-semibold">Yes</span>
                ) : (
                  <span className="text-red-600 font-semibold">No</span>
                )}
              </p>
              {ans.answer === "No" && ans.remark && (
                <p className="text-sm sm:text-base text-gray-700">
                  <strong>Remark:</strong> {ans.remark}
                </p>
              )}
              {ans.photos && ans.photos.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium text-sm mb-1">Photos:</p>
                  <div className="flex gap-2 flex-wrap">
                    {ans.photos.map((photo, photoIdx) => (
                      <img
                        key={photoIdx}
                        src={photo.url}
                        alt={`Photo ${photoIdx + 1}`}
                        className="w-16 h-16 rounded border object-cover"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-sm sm:text-base">
            No questions found for this audit.
          </p>
        )}
      </div>

      {/* Back Button */}
      <div className="mt-6 flex justify-center sm:justify-start">
        <button
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition text-sm sm:text-base"
          onClick={() => navigate("/employee/dashboard")}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
