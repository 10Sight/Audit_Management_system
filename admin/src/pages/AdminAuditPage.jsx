// AdminEditAuditPage.jsx
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
        const { data } = await axios.get(`http://localhost:5000/api/audits/${id}`, {
          withCredentials: true,
        });
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
      await axios.put(`http://localhost:5000/api/audits/${id}`, formData, {
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
    return <div className="p-6 text-white text-center">Loading audit...</div>;
  if (!audit)
    return <div className="p-6 text-white text-center">Audit not found.</div>;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto text-white">
      <ToastContainer position="top-right" autoClose={3000} />
      <h1 className="text-2xl sm:text-3xl font-bold mb-4">Edit Audit</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Line Leader & Shift Incharge */}
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            name="lineLeader"
            value={formData.lineLeader}
            onChange={handleChange}
            placeholder="Line Leader"
            className="p-2 rounded bg-neutral-800 border border-neutral-700 w-full md:flex-1"
          />
          <input
            type="text"
            name="shiftIncharge"
            value={formData.shiftIncharge}
            onChange={handleChange}
            placeholder="Shift Incharge"
            className="p-2 rounded bg-neutral-800 border border-neutral-700 w-full md:flex-1"
          />
        </div>

        {/* Answers */}
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {formData.answers.map((ans, idx) => (
            <div
              key={idx}
              className="bg-neutral-900 p-3 rounded border border-neutral-700 flex flex-col gap-2"
            >
              <p className="font-semibold text-sm sm:text-base">{ans.questionText}</p>
              <select
                value={ans.answer}
                onChange={(e) => handleAnswerChange(idx, "answer", e.target.value)}
                className="p-2 rounded bg-neutral-800 border border-neutral-700 w-full"
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
              {ans.answer === "No" && (
                <input
                  type="text"
                  placeholder="Remark"
                  value={ans.remark}
                  onChange={(e) => handleAnswerChange(idx, "remark", e.target.value)}
                  className="p-2 rounded bg-neutral-800 border border-neutral-700 w-full"
                />
              )}
            </div>
          ))}
        </div>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700"
          >
            {submitting ? "Updating..." : "Update Audit"}
          </button>
        </div>
      </form>
    </div>
  );
}
