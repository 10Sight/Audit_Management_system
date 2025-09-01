import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function AdminEditAuditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    line: "",
    machine: "",
    process: "",
    lineLeader: "",
    shiftIncharge: "",
    answers: [],
  });

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const { data } = await axios.get(
          `https://audit-management-system-server.onrender.com`,
          { withCredentials: true }
        );
        const auditData = data.data;

        setAudit(auditData);
        setFormData({
          line: auditData.line?._id || "",
          machine: auditData.machine?._id || "",
          process: auditData.process?._id || "",
          lineLeader: auditData.lineLeader || "",
          shiftIncharge: auditData.shiftIncharge || "",
          answers: auditData.answers.map((a) => ({
            question: a.question?._id,
            questionText: a.question?.questionText,
            answer: a.answer,
            remark: a.remark || "",
          })),
        });
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch audit");
      } finally {
        setLoading(false);
      }
    };
    fetchAudit();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAnswerChange = (idx, field, value) => {
    setFormData((prev) => {
      const newAnswers = [...prev.answers];
      newAnswers[idx][field] = value;
      return { ...prev, answers: newAnswers };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await axios.put(`https://audit-management-system-server.onrender.com/api/audits${id}`, formData, {
        withCredentials: true,
      });
      toast.success("Audit updated successfully");
      navigate(-1);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update audit");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return <div className="p-6 text-gray-700 text-center">Loading audit...</div>;
  if (!audit)
    return <div className="p-6 text-gray-700 text-center">Audit not found.</div>;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto text-gray-900">
      <ToastContainer position="top-right" autoClose={3000} theme="light" />

      <div className="bg-gray-100 shadow-lg rounded-2xl p-6 sm:p-8 border border-gray-300">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">
          Edit Audit
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Line Leader & Shift Incharge */}
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              name="lineLeader"
              value={formData.lineLeader}
              onChange={handleChange}
              placeholder="Line Leader"
              className="p-3 rounded-md bg-white text-gray-900 border border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full md:flex-1"
            />
            <input
              type="text"
              name="shiftIncharge"
              value={formData.shiftIncharge}
              onChange={handleChange}
              placeholder="Shift Incharge"
              className="p-3 rounded-md bg-white text-gray-900 border border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full md:flex-1"
            />
          </div>

          {/* Answers */}
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {formData.answers.map((ans, idx) => (
              <div
                key={idx}
                className="bg-white p-4 rounded-lg border border-gray-300 shadow-sm flex flex-col gap-3"
              >
                <p className="font-semibold text-gray-800 text-sm sm:text-base">
                  {ans.questionText}
                </p>
                <select
                  value={ans.answer}
                  onChange={(e) =>
                    handleAnswerChange(idx, "answer", e.target.value)
                  }
                  className="p-2 rounded-md bg-gray-50 text-gray-900 border border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
                {ans.answer === "No" && (
                  <input
                    type="text"
                    placeholder="Remark"
                    value={ans.remark}
                    onChange={(e) =>
                      handleAnswerChange(idx, "remark", e.target.value)
                    }
                    className="p-2 rounded-md bg-gray-50 text-gray-900 border border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Submit */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-md bg-gray-400 hover:bg-gray-500 text-white font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
            >
              {submitting ? "Updating..." : "Update Audit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
