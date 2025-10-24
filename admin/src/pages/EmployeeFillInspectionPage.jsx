import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { FiCheckCircle, FiHome, FiBarChart2, FiCamera, FiX } from "react-icons/fi";
import "react-toastify/dist/ReactToastify.css";
import { 
  useGetLinesQuery,
  useGetMachinesQuery,
  useGetProcessesQuery,
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

  const [line, setLine] = useState("");
  const [machine, setMachine] = useState("");
  const [process, setProcess] = useState("");
  const [lineLeader, setLineLeader] = useState("");   
  const [shiftIncharge, setShiftIncharge] = useState("");

  const [questions, setQuestions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [submittedAuditId, setSubmittedAuditId] = useState(null);
  
  // Photo capture states
  const [showCamera, setShowCamera] = useState(false);
  const [currentQuestionForPhoto, setCurrentQuestionForPhoto] = useState(null);
  const [questionPhotos, setQuestionPhotos] = useState({}); // questionId -> array of photos
  const [uploading, setUploading] = useState(false);

  const { data: linesRes } = useGetLinesQuery();
  const { data: machinesRes } = useGetMachinesQuery();
  const { data: processesRes } = useGetProcessesQuery();
  const [createAudit] = useCreateAuditMutation();
  const [uploadImage] = useUploadImageMutation();
  const [deleteUpload] = useDeleteUploadMutation();

  useEffect(() => {
    setLines(linesRes?.data || []);
    setMachines(machinesRes?.data || []);
    setProcesses(processesRes?.data || []);
    setLoading(false);
  }, [linesRes, machinesRes, processesRes]);

  // Fetch questions when line/machine/process changes via RTK Query
  const questionParams = {
    ...(line ? { lineId: line } : {}),
    ...(machine ? { machineId: machine } : {}),
    ...(process ? { processId: process } : {}),
    includeGlobal: 'true',
  };
  const { data: questionsRes, isLoading: questionsLoading } = useGetQuestionsQuery(questionParams, { skip: !(line && machine && process) });
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
    if (!line || !machine || !process || !lineLeader || !shiftIncharge) {
      toast.error("Please fill all required fields");
      return;
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
      const payload = {
        date: new Date(),
        line,
        machine,
        process,
        lineLeader,
        shiftIncharge,
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
            <label className="block mb-1 font-semibold">Line Leader</label>
            <input type="text" placeholder="Line Leader" value={lineLeader} onChange={(e) => setLineLeader(e.target.value)} className="p-2 bg-white border rounded-md w-full" required />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Shift Incharge</label>
            <input type="text" placeholder="Shift Incharge" value={shiftIncharge} onChange={(e) => setShiftIncharge(e.target.value)} className="p-2 bg-white border rounded-md w-full" required />
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
            questions.map((q, idx) => (
              <div key={q._id} className="bg-gray-100 p-4 rounded-lg border shadow space-y-2">
                <p className="font-medium break-words">{q.questionText}</p>
                <select value={q.answer} onChange={(e) => handleAnswerChange(idx, e.target.value)} className="p-2 bg-white border rounded-md w-full" required>
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
                {q.answer === "No" && (
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
                          Photos (Optional)
                        </label>
                        <button
                          type="button"
                          onClick={() => handleCameraOpen(q)}
                          disabled={uploading}
                          className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 transition"
                        >
                          <FiCamera className="w-4 h-4" />
                          {uploading ? 'Uploading...' : 'Add Photo'}
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
            ))
          ) : (
            <p className="text-red-500 text-center sm:text-left">No questions available for the selected filters.</p>
          )}
        </div>

        <button type="submit" className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
          Submit Audit
        </button>
      </form>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fadeIn p-4">
          <div className="bg-white p-6 rounded-xl max-w-sm w-full text-center space-y-4 shadow-lg transform transition-all duration-300 scale-100 animate-scaleIn">
            <FiCheckCircle className="mx-auto text-green-600 text-5xl" />
            <h2 className="text-2xl font-bold text-gray-800">Audit Submitted!</h2>
            <p className="text-gray-600">Choose an option to proceed:</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-4">
              <button onClick={() => navigate("/employee/dashboard")} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition w-full sm:w-auto">
                <FiHome /> Back to Home
              </button>
              <button onClick={() => navigate(`/employee/results/${submittedAuditId}`)} className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition w-full sm:w-auto">
                <FiBarChart2 /> Show Results
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
