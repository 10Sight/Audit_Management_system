import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { FiCheckCircle, FiHome, FiBarChart2, FiCamera, FiX, FiShare2 } from "react-icons/fi";
import "react-toastify/dist/ReactToastify.css";
import { 
  useGetLinesQuery,
  useGetMachinesQuery,
  useGetProcessesQuery,
  useGetUnitsQuery,
  useGetQuestionsQuery,
  useCreateAuditMutation,
  useUploadImageMutation,
  useDeleteUploadMutation
} from "@/store/api";
import Loader from "@/components/ui/Loader";
import CameraCapture from "@/components/CameraCapture";
import { uploadImageWithRetry, validateImageFile } from "@/utils/imageUpload";
import simpleImageUpload, { simpleCompressImage } from "@/utils/simpleUpload";
import api from "@/utils/axios";

export default function EmployeeFillInspectionPage() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [lines, setLines] = useState([]);
  const [machines, setMachines] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [units, setUnits] = useState([]);

  const [line, setLine] = useState("");
  const [machine, setMachine] = useState("");
  const [process, setProcess] = useState("");
  const [unit, setUnit] = useState("");
  const [lineLeader, setLineLeader] = useState("");   
  const [shift, setShift] = useState("");
  const [shiftIncharge, setShiftIncharge] = useState("");
  const [lineRating, setLineRating] = useState("");
  const [machineRating, setMachineRating] = useState("");
  const [processRating, setProcessRating] = useState("");
  const [unitRating, setUnitRating] = useState("");

  const [questions, setQuestions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [submittedAuditId, setSubmittedAuditId] = useState(null);
  
  // Photo capture states
  const [showCamera, setShowCamera] = useState(false);
  const [currentQuestionForPhoto, setCurrentQuestionForPhoto] = useState(null);
  const [questionPhotos, setQuestionPhotos] = useState({}); // questionId -> array of photos
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sharing, setSharing] = useState(false);

  const describeRating = (val) => {
    const num = Number(val);
    if (!Number.isFinite(num)) return "Select a score between 1 and 10";
    if (num <= 3) return "Poor";
    if (num <= 7) return "Average";
    return "Excellent";
  };

  const getDepartmentName = (dept) => {
    if (!dept) return "Department";
    if (typeof dept === "string") return dept;
    if (typeof dept === "object" && dept?.name) return dept.name;
    return "Department";
  };

  const { data: linesRes } = useGetLinesQuery();
  const { data: machinesRes } = useGetMachinesQuery();
  const { data: processesRes } = useGetProcessesQuery();
  const { data: unitsRes } = useGetUnitsQuery();
  const [createAudit] = useCreateAuditMutation();
  const [uploadImage] = useUploadImageMutation();
  const [deleteUpload] = useDeleteUploadMutation();

  useEffect(() => {
    setLines(linesRes?.data || []);
    setMachines(machinesRes?.data || []);
    setProcesses(processesRes?.data || []);
    setUnits(unitsRes?.data || []);
    setLoading(false);
  }, [linesRes, machinesRes, processesRes, unitsRes]);

  // Fetch questions when line/machine/process changes via RTK Query
  const questionParams = {
    ...(line ? { lineId: line } : {}),
    ...(machine ? { machineId: machine } : {}),
    ...(process ? { processId: process } : {}),
    ...(unit ? { unitId: unit } : {}),
    includeGlobal: 'true',
    ...(currentUser?.department ? { departmentId: currentUser.department._id || currentUser.department } : {}),
  };
  const { data: questionsRes, isLoading: questionsLoading } = useGetQuestionsQuery(questionParams, { skip: !(line && machine && process && unit) });
  useEffect(() => {
    if (questionsLoading) return;
    const list = Array.isArray(questionsRes?.data) ? questionsRes.data : [];
    setQuestions(list.map(q => ({ ...q, answer: "", remark: "" })));
  }, [questionsRes, questionsLoading]);

  const handleAnswerChange = (idx, value) => {
    const newQs = [...questions];
    newQs[idx].answer = value;
    if (value !== "No") newQs[idx].remark = "";
    setQuestions(newQs);
  };

  const handleRemarkChange = (idx, value) => {
    const newQs = [...questions];
    newQs[idx].remark = value;
    setQuestions(newQs);
  };

  // Photo handling functions
  const handleCameraOpen = (question) => {
    setCurrentQuestionForPhoto(question);
    setShowCamera(true);
  };

  const handleCameraClose = () => {
    setShowCamera(false);
    setCurrentQuestionForPhoto(null);
  };

  const handlePhotoCapture = async (questionId, capturedImage) => {
    setUploading(true);
    try {
      const validationErrors = validateImageFile(capturedImage.file);
      if (validationErrors.length > 0) {
        toast.error(validationErrors.join(', '));
        return;
      }

      // Fast path: compress small and upload single image endpoint
      const compressedBlob = await simpleCompressImage(capturedImage.file, 0.55);
      const compressedFile = new File([compressedBlob], `photo_${Date.now()}.webp`, { type: 'image/webp' });
      const form = new FormData();
      form.append('photo', compressedFile);
      const res = await api.post('/api/upload/image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
        timeout: 0, // do not time out large uploads
      });
      const data = res?.data?.data;
      const photoUrl = data?.url;
      const publicId = data?.publicId;
      if (!photoUrl || !publicId) throw new Error('Upload succeeded but missing URL or publicId');

      setQuestionPhotos(prev => ({
        ...prev,
        [questionId]: [...(prev[questionId] || []), {
          url: photoUrl,
          publicId,
          originalName: compressedFile.name,
          uploadedAt: new Date().toISOString()
        }]
      }));
      toast.success('Photo uploaded successfully!');
    } catch (error) {
      console.error('Photo upload error:', error);
      const msg = error?.data?.message || error?.response?.data?.message || error?.message || 'Upload failed';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoRemove = async (questionId, photoIndex) => {
    try {
      const photos = questionPhotos[questionId] || [];
      const photoToRemove = photos[photoIndex];
      
      if (photoToRemove?.publicId) {
        await deleteUpload(photoToRemove.publicId).unwrap();
      }
      
      setQuestionPhotos(prev => ({
        ...prev,
        [questionId]: photos.filter((_, idx) => idx !== photoIndex)
      }));
      
      toast.success('Photo removed successfully!');
    } catch (error) {
      console.error('Photo removal error:', error);
      toast.error('Failed to remove photo.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return; // prevent double submit

    if (!line || !machine || !process || !unit || !lineLeader || !shift || !shiftIncharge || !lineRating || !machineRating || !processRating || !unitRating) {
      toast.error("Please fill all required fields");
      return;
    }

    // Validate rating values (1-10)
    const ratingFields = [
      { label: 'Line rating', value: lineRating },
      { label: 'Machine rating', value: machineRating },
      { label: 'Process rating', value: processRating },
      { label: 'Unit rating', value: unitRating },
    ];

    for (const field of ratingFields) {
      const num = Number(field.value);
      if (!Number.isFinite(num) || num < 1 || num > 10) {
        toast.error(`${field.label} must be a number between 1 and 10`);
        return;
      }
    }

    // Validate each 'No' answer has remark and at least one photo
    const missing = [];
    questions.forEach((q) => {
      if (q.answer === 'No') {
        const photos = questionPhotos[q._id] || [];
        if (!q.remark || q.remark.trim() === '') {
          missing.push(`Remark required for: ${q.questionText}`);
        }
        if (photos.length === 0) {
          missing.push(`At least one photo required for: ${q.questionText}`);
        }
      }
    });
    if (missing.length) {
      toast.error(missing[0]);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        date: new Date(),
        line,
        machine,
        process,
        unit,
        department: currentUser?.department?._id || currentUser?.department || undefined,
        lineLeader,
        shift,
        shiftIncharge,
        lineRating: Number(lineRating),
        machineRating: Number(machineRating),
        processRating: Number(processRating),
        unitRating: Number(unitRating),
        auditor: currentUser?._id,
        answers: questions.map((q) => ({
          question: q._id,
          answer: q.answer,
          remark: q.answer === "No" ? q.remark : "",
          photos: q.answer === "No" && questionPhotos[q._id]
            ? questionPhotos[q._id].map(photo => ({
                url: photo.url,
                publicId: photo.publicId,
                uploadedAt: photo.uploadedAt,
                originalName: photo.originalName,
              }))
            : []
        })),
      };
      const res = await createAudit(payload).unwrap();
      setSubmittedAuditId(res?.data?._id);
      setShowModal(true);
    } catch (err) {
      const msg = err?.data?.message || err?.response?.data?.message || err?.message || 'Failed to submit inspection';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleShareAudit = async () => {
    if (!submittedAuditId) return;

    try {
      setSharing(true);
      toast.info("Sending audit result...");
      await api.post(`/api/audits/${submittedAuditId}/share`);
      toast.success("Audit result shared successfully!");
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to share audit result";
      toast.error(msg);
    } finally {
      setSharing(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto text-gray-800">
      <ToastContainer />
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center sm:text-left">
        Part and Quality Audit Performance
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selection Fields */}
        <div className="bg-gray-100 p-4 sm:p-6 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-4 shadow">
          <div>
            <label className="block mb-1 font-semibold">Date</label>
            <input
              type="date"
              value={new Date().toISOString().split("T")[0]}
              disabled
              className="p-2 bg-gray-200 rounded-md w-full"
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Line</label>
            <select value={line} onChange={(e) => setLine(e.target.value)} className="p-2 bg-white border rounded-md w-full" required>
              <option value="">Select Line</option>
              {lines.map((l) => (<option key={l._id} value={l._id}>{l.name}</option>))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-semibold">Machine</label>
            <select value={machine} onChange={(e) => setMachine(e.target.value)} className="p-2 bg-white border rounded-md w-full" required>
              <option value="">Select Machine</option>
              {machines.map((m) => (<option key={m._id} value={m._id}>{m.name}</option>))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-semibold">Process</label>
            <select value={process} onChange={(e) => setProcess(e.target.value)} className="p-2 bg-white border rounded-md w-full" required>
              <option value="">Select Process</option>
              {processes.map((p) => (<option key={p._id} value={p._id}>{p.name}</option>))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-semibold">Unit</label>
            <select value={unit} onChange={(e) => setUnit(e.target.value)} className="p-2 bg-white border rounded-md w-full" required>
              <option value="">Select Unit</option>
              {units.map((u) => (<option key={u._id} value={u._id}>{u.name}</option>))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-semibold">Line Leader</label>
            <input type="text" placeholder="Line Leader" value={lineLeader} onChange={(e) => setLineLeader(e.target.value)} className="p-2 bg-white border rounded-md w-full" required />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Shift</label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className="p-2 bg-white border rounded-md w-full"
              required
            >
              <option value="">Select Shift</option>
              <option value="Shift 1">Shift 1</option>
              <option value="Shift 2">Shift 2</option>
              <option value="Shift 3">Shift 3</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 font-semibold">Shift Incharge</label>
            <input type="text" placeholder="Shift Incharge" value={shiftIncharge} onChange={(e) => setShiftIncharge(e.target.value)} className="p-2 bg-white border rounded-md w-full" required />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Department</label>
            <input
              type="text"
              value={getDepartmentName(currentUser?.department)}
              disabled
              className="p-2 bg-gray-200 rounded-md w-full"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block mb-1 font-semibold">Auditor</label>
            <input type="text" value={currentUser?.fullName || "Unknown"} disabled className="p-2 bg-gray-200 rounded-md w-full" />
          </div>
        </div>

        {/* Questions Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-2">Inspection Questions</h2>
          {questions.length > 0 ? (
            questions.map((q, idx) => {
              const type = q.questionType || "yes_no";
              const isYesNoType = type === "yes_no" || type === "image";
              const isChoiceType = type === "mcq" || type === "dropdown";

              return (
                <div key={q._id} className="bg-gray-100 p-4 rounded-lg border shadow space-y-3">
                  <p className="font-medium break-words">{q.questionText}</p>

                  {type === "image" && q.imageUrl && (
                    <div className="mb-2">
                      <img
                        src={q.imageUrl}
                        alt="Question context"
                        className="max-h-48 w-full rounded-md object-contain border"
                      />
                    </div>
                  )}

                  {isYesNoType && (
                    <select
                      value={q.answer}
                      onChange={(e) => handleAnswerChange(idx, e.target.value)}
                      className="p-2 bg-white border rounded-md w-full"
                      required
                    >
                      <option value="">Select</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  )}

                  {isChoiceType && (
                    <select
                      value={q.answer}
                      onChange={(e) => handleAnswerChange(idx, e.target.value)}
                      className="p-2 bg-white border rounded-md w-full"
                      required
                    >
                      <option value="">Select</option>
                      {(q.options || []).map((opt, optIdx) => (
                        <option key={optIdx} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}

                  {type === "short_text" && (
                    <input
                      type="text"
                      placeholder="Enter answer"
                      value={q.answer}
                      onChange={(e) => handleAnswerChange(idx, e.target.value)}
                      className="p-2 rounded-md border bg-white w-full"
                      required
                    />
                  )}

                  {isYesNoType && q.answer === "No" && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Remark"
                        value={q.remark}
                        onChange={(e) => handleRemarkChange(idx, e.target.value)}
                        className="p-2 rounded-md border bg-white w-full"
                        required
                      />

                      {/* Photo Upload Section */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-gray-700">
                            Photos (Required for "No" answers)
                          </label>
                          <button
                            type="button"
                            onClick={() => handleCameraOpen(q)}
                            disabled={uploading}
                            className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 transition"
                          >
                            <FiCamera className="w-4 h-4" />
                            {uploading ? "Uploading..." : "Add Photo"}
                          </button>
                        </div>

                        {/* Photo Previews */}
                        {questionPhotos[q._id]?.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                            {questionPhotos[q._id].map((photo, photoIdx) => (
                              <div key={photoIdx} className="relative group">
                                <img
                                  src={photo.url}
                                  alt={`Photo ${photoIdx + 1}`}
                                  className="w-full h-20 object-cover rounded-md border"
                                />
                                <button
                                  type="button"
                                  onClick={() => handlePhotoRemove(q._id, photoIdx)}
                                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <FiX />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-red-500 text-center sm:text-left">No questions available for the selected filters.</p>
          )}
        </div>

        {/* Ratings Section */}
        <div className="bg-gray-100 p-4 sm:p-6 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-4 shadow">
          <div className="sm:col-span-2">
            <h2 className="text-xl font-semibold mb-2">Overall Ratings (1-10)</h2>
            <p className="text-sm text-gray-600">
              Please provide overall ratings for the selected line, machine, process, and unit after answering the questions above.
            </p>
          </div>

          <div>
            <label className="block mb-1 font-semibold">Line Rating (1-10)</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => {
                const selected = Number(lineRating) === score;
                let colorClass = "bg-white text-gray-700 border-gray-300 hover:bg-blue-50";
                if (score <= 3) {
                  colorClass = selected
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100";
                } else if (score <= 7) {
                  colorClass = selected
                    ? "bg-yellow-500 text-white border-yellow-500"
                    : "bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-100";
                } else {
                  colorClass = selected
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-green-50 text-green-800 border-green-200 hover:bg-green-100";
                }
                return (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setLineRating(String(score))}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${colorClass}`}
                  >
                    {score}
                  </button>
                );
              })}
            </div>
            <input
              type="number"
              min={1}
              max={10}
              value={lineRating}
              onChange={(e) => setLineRating(e.target.value)}
              className="p-2 bg-white border rounded-md w-full text-sm"
              required
            />
            <p className="text-xs text-gray-500 mt-1">{describeRating(lineRating)}</p>
          </div>

          <div>
            <label className="block mb-1 font-semibold">Machine Rating (1-10)</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => {
                const selected = Number(machineRating) === score;
                let colorClass = "bg-white text-gray-700 border-gray-300 hover:bg-blue-50";
                if (score <= 3) {
                  colorClass = selected
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100";
                } else if (score <= 7) {
                  colorClass = selected
                    ? "bg-yellow-500 text-white border-yellow-500"
                    : "bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-100";
                } else {
                  colorClass = selected
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-green-50 text-green-800 border-green-200 hover:bg-green-100";
                }
                return (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setMachineRating(String(score))}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${colorClass}`}
                  >
                    {score}
                  </button>
                );
              })}
            </div>
            <input
              type="number"
              min={1}
              max={10}
              value={machineRating}
              onChange={(e) => setMachineRating(e.target.value)}
              className="p-2 bg-white border rounded-md w-full text-sm"
              required
            />
            <p className="text-xs text-gray-500 mt-1">{describeRating(machineRating)}</p>
          </div>

          <div>
            <label className="block mb-1 font-semibold">Process Rating (1-10)</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => {
                const selected = Number(processRating) === score;
                let colorClass = "bg-white text-gray-700 border-gray-300 hover:bg-blue-50";
                if (score <= 3) {
                  colorClass = selected
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100";
                } else if (score <= 7) {
                  colorClass = selected
                    ? "bg-yellow-500 text-white border-yellow-500"
                    : "bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-100";
                } else {
                  colorClass = selected
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-green-50 text-green-800 border-green-200 hover:bg-green-100";
                }
                return (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setProcessRating(String(score))}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${colorClass}`}
                  >
                    {score}
                  </button>
                );
              })}
            </div>
            <input
              type="number"
              min={1}
              max={10}
              value={processRating}
              onChange={(e) => setProcessRating(e.target.value)}
              className="p-2 bg-white border rounded-md w-full text-sm"
              required
            />
            <p className="text-xs text-gray-500 mt-1">{describeRating(processRating)}</p>
          </div>

          <div>
            <label className="block mb-1 font-semibold">Unit Rating (1-10)</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => {
                const selected = Number(unitRating) === score;
                let colorClass = "bg-white text-gray-700 border-gray-300 hover:bg-blue-50";
                if (score <= 3) {
                  colorClass = selected
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100";
                } else if (score <= 7) {
                  colorClass = selected
                    ? "bg-yellow-500 text-white border-yellow-500"
                    : "bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-100";
                } else {
                  colorClass = selected
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-green-50 text-green-800 border-green-200 hover:bg-green-100";
                }
                return (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setUnitRating(String(score))}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${colorClass}`}
                  >
                    {score}
                  </button>
                );
              })}
            </div>
            <input
              type="number"
              min={1}
              max={10}
              value={unitRating}
              onChange={(e) => setUnitRating(e.target.value)}
              className="p-2 bg-white border rounded-md w-full text-sm"
              required
            />
            <p className="text-xs text-gray-500 mt-1">{describeRating(unitRating)}</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || uploading}
          className={`w-full sm:w-auto px-6 py-2 rounded-md transition flex items-center justify-center gap-2 ${
            submitting || uploading
              ? 'bg-blue-400 cursor-not-allowed opacity-80'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {submitting ? (
            <>
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Audit'
          )}
        </button>
      </form>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-2xl transition-all duration-300 animate-scaleIn sm:p-7">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
              <FiCheckCircle className="text-3xl" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900 sm:text-2xl">Audit submitted successfully</h2>
            <p className="mt-2 text-sm text-gray-600">
              Your inspection has been saved. You can return to your dashboard, review the detailed results,
              or share the audit via email.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => navigate("/employee/dashboard")}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 sm:w-auto"
              >
                <FiHome className="h-4 w-4" />
                Back to Home
              </button>
              <button
                onClick={() => navigate(`/employee/results/${submittedAuditId}`)}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 sm:w-auto"
              >
                <FiBarChart2 className="h-4 w-4" />
                Show Results
              </button>
              <button
                type="button"
                onClick={handleShareAudit}
                disabled={sharing}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-700 disabled:opacity-60 sm:w-auto"
              >
                <FiShare2 className="h-4 w-4" />
                {sharing ? "Sharing..." : "Share via Email"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Capture Component */}
      {showCamera && currentQuestionForPhoto && (
        <CameraCapture
          isOpen={showCamera}
          onClose={handleCameraClose}
          onCapture={handlePhotoCapture}
          questionId={currentQuestionForPhoto._id}
          questionText={currentQuestionForPhoto.questionText}
        />
      )}

      <style>
        {`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes scaleIn { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
          .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
          .animate-scaleIn { animation: scaleIn 0.3s ease-out; }
        `}
      </style>
    </div>
  );
}
