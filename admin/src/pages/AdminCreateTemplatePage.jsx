import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "../context/AuthContext";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { useGetLinesQuery, useGetMachinesQuery, useGetProcessesQuery, useGetUnitsQuery, useCreateQuestionsMutation, useUploadImageMutation, useGetQuestionCategoriesQuery } from "@/store/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminCreateTemplatePage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const [lines, setLines] = useState([]);
  const [machines, setMachines] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [units, setUnits] = useState([]);

  const [selectedLine, setSelectedLine] = useState("");
  const [selectedMachine, setSelectedMachine] = useState("");
  const [selectedProcess, setSelectedProcess] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");

  const [questions, setQuestions] = useState([
    {
      questionText: "",
      isGlobal: false,
      // Default to simple Yes/No questions
      questionType: "yes_no",
      // Used only for MCQ and dropdown questions
      options: [""],
      // Index of correct option for MCQ / dropdown (0-based)
      correctOptionIndex: null,
      // Optional image URL for image-based questions
      imageUrl: "",
    },
  ]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  const { data: linesRes } = useGetLinesQuery();
  const { data: machinesRes } = useGetMachinesQuery();
  const { data: processesRes } = useGetProcessesQuery();
  const { data: unitsRes } = useGetUnitsQuery();
  const { data: categoriesRes } = useGetQuestionCategoriesQuery();
  const [createQuestions] = useCreateQuestionsMutation();
  const [uploadImage] = useUploadImageMutation();
  const [imageUploading, setImageUploading] = useState(false);
  useEffect(() => {
    setLines(linesRes?.data || []);
    setMachines(machinesRes?.data || []);
    setProcesses(processesRes?.data || []);
    setUnits(unitsRes?.data || []);
  }, [linesRes, machinesRes, processesRes, unitsRes]);

  const addQuestion = () =>
    setQuestions([
      ...questions,
      {
        questionText: "",
        isGlobal: false,
        questionType: "yes_no",
        options: [""],
        correctOptionIndex: null,
        imageUrl: "",
      },
    ]);

  const removeQuestion = (idx) =>
    setQuestions(questions.filter((_, i) => i !== idx));

  const handleQuestionChange = (idx, value) => {
    const newQ = [...questions];
    newQ[idx].questionText = value;
    setQuestions(newQ);
  };

  const handleQuestionTypeChange = (idx, value) => {
    const newQ = [...questions];
    newQ[idx].questionType = value;

    // Reset type-specific fields when changing type
    if (value === "mcq" || value === "dropdown") {
      newQ[idx].options = newQ[idx].options && newQ[idx].options.length ? newQ[idx].options : [""];
    } else {
      newQ[idx].options = [];
    }

    if (value !== "image") {
      newQ[idx].imageUrl = "";
    }

    // Reset correct option when type changes
    newQ[idx].correctOptionIndex = null;

    setQuestions(newQ);
  };

  const handleOptionChange = (qIdx, optIdx, value) => {
    const newQ = [...questions];
    if (!Array.isArray(newQ[qIdx].options)) newQ[qIdx].options = [];
    newQ[qIdx].options[optIdx] = value;
    setQuestions(newQ);
  };

  const handleCorrectOptionChange = (qIdx, optIdx) => {
    const newQ = [...questions];
    newQ[qIdx].correctOptionIndex = optIdx;
    setQuestions(newQ);
  };

  const addOption = (qIdx) => {
    const newQ = [...questions];
    if (!Array.isArray(newQ[qIdx].options)) newQ[qIdx].options = [];
    newQ[qIdx].options.push("");
    setQuestions(newQ);
  };

  const removeOption = (qIdx, optIdx) => {
    const newQ = [...questions];
    if (!Array.isArray(newQ[qIdx].options)) return;
    newQ[qIdx].options = newQ[qIdx].options.filter((_, i) => i !== optIdx);

    // Adjust correct option index when an option is removed
    const currentCorrect = newQ[qIdx].correctOptionIndex;
    if (typeof currentCorrect === "number") {
      if (currentCorrect === optIdx) {
        newQ[qIdx].correctOptionIndex = null;
      } else if (currentCorrect > optIdx) {
        newQ[qIdx].correctOptionIndex = currentCorrect - 1;
      }
    }

    if (newQ[qIdx].options.length === 0) newQ[qIdx].options.push("");
    setQuestions(newQ);
  };

  const handleImageUrlChange = (idx, value) => {
    const newQ = [...questions];
    newQ[idx].imageUrl = value;
    setQuestions(newQ);
  };

  const handleImageFileChange = async (idx, file) => {
    if (!file) return;
    try {
      setImageUploading(true);
      const result = await uploadImage(file).unwrap();
      const data = result?.data;
      const url = data?.url;
      if (!url) {
        throw new Error("Upload succeeded but URL is missing");
      }
      handleImageUrlChange(idx, url);
      toast.success("Image uploaded successfully");
    } catch (err) {
      const msg = err?.data?.message || err?.message || "Failed to upload image";
      toast.error(msg);
    } finally {
      setImageUploading(false);
    }
  };

  const handleGlobalToggle = (idx) => {
    const newQ = [...questions];
    newQ[idx].isGlobal = !newQ[idx].isGlobal;
    setQuestions(newQ);
  };

  const handleAddFromCategory = () => {
    if (!selectedCategoryId) {
      toast.error("Select a category first");
      return;
    }

    const categories = Array.isArray(categoriesRes?.data) ? categoriesRes.data : [];
    const category = categories.find((c) => c._id === selectedCategoryId);
    if (!category) {
      toast.error("Category not found");
      return;
    }

    const incoming = Array.isArray(category.questions) ? category.questions : [];
    if (!incoming.length) {
      toast.error("This category has no questions");
      return;
    }

    const mapped = incoming.map((q) => ({
      questionText: q.questionText || "",
      isGlobal: !!q.isGlobal,
      questionType: q.questionType || "yes_no",
      options: Array.isArray(q.options) && q.options.length ? q.options : [""],
      correctOptionIndex: null,
      imageUrl: q.imageUrl || "",
    }));

    setQuestions((prev) => [...prev, ...mapped]);
    toast.success(`Added ${mapped.length} question(s) from category`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!questions.length) return toast.error("Add at least one question!");
    if (!selectedLine || !selectedMachine || !selectedProcess || !selectedUnit) {
      return toast.error("Select a Line, Machine, Process, and Unit before adding questions!");
    }

    try {
      setLoading(true);

      // Basic validation for type-specific requirements
      for (const q of questions) {
        if (!q.questionText || !q.questionText.trim()) {
          toast.error("Each question must have text");
          setLoading(false);
          return;
        }

        const type = q.questionType || "yes_no";

        if ((type === "mcq" || type === "dropdown") && (!Array.isArray(q.options) || q.options.filter((o) => o && o.trim()).length < 2)) {
          toast.error("MCQ/Dropdown questions must have at least two options");
          setLoading(false);
          return;
        }

        if (type === "mcq" || type === "dropdown") {
          const idx = q.correctOptionIndex;
          const rawOptions = Array.isArray(q.options) ? q.options : [];
          const trimmed = rawOptions.map((o) => (o || "").trim());
          if (
            !Number.isInteger(idx) ||
            idx < 0 ||
            idx >= trimmed.length ||
            !trimmed[idx]
          ) {
            toast.error("Please select a correct option for all MCQ/Dropdown questions");
            setLoading(false);
            return;
          }
        }

        if (type === "image" && (!q.imageUrl || !q.imageUrl.trim())) {
          toast.error("Image questions must have an image URL");
          setLoading(false);
          return;
        }
      }

      const payload = questions.map((q) => {
        const type = q.questionType || "yes_no";
        const cleanOptions = Array.isArray(q.options)
          ? q.options.map((o) => (o || "").trim()).filter(Boolean)
          : [];
        const cleanImageUrl = (q.imageUrl || "").trim();

        const base = {
          questionText: q.questionText,
          isGlobal: q.isGlobal,
          questionType: type,
          line: selectedLine,
          machine: selectedMachine,
          process: selectedProcess,
          unit: selectedUnit,
        };

        if ((type === "mcq" || type === "dropdown") && cleanOptions.length) {
          base.options = cleanOptions;

          if (Number.isInteger(q.correctOptionIndex)) {
            const rawOptions = Array.isArray(q.options)
              ? q.options.map((o) => (o || "").trim())
              : [];
            const rawIndex = q.correctOptionIndex;
            if (rawIndex >= 0 && rawIndex < rawOptions.length && rawOptions[rawIndex]) {
              let cleanedIndex = -1;
              let count = 0;
              for (let i = 0; i < rawOptions.length; i++) {
                if (!rawOptions[i]) continue;
                if (i === rawIndex) {
                  cleanedIndex = count;
                  break;
                }
                count++;
              }
              if (cleanedIndex >= 0 && cleanedIndex < cleanOptions.length) {
                base.correctOptionIndex = cleanedIndex;
              }
            }
          }
        }

        if (type === "image" && cleanImageUrl) {
          base.imageUrl = cleanImageUrl;
        }

        return base;
      });

      await createQuestions(payload).unwrap();

      toast.success("Template created!");
      navigate("/admin/questions");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create template");
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser || !["admin", "superadmin"].includes(currentUser.role)) return <div>Access Denied</div>;

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-6">
      <ToastContainer theme="light" />

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Page header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Create Audit Template</h1>
            <p className="text-sm text-muted-foreground">
              Define simple, reusable questions for a specific Line, Machine, Process and Unit.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin/audits")}
          >
            Cancel &amp; go back
          </Button>
        </div>

        <Card className="shadow-sm border-border/60">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Inspection Context</CardTitle>
            <CardDescription>
              Choose where this template will be used. These settings keep audits focused and relevant.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Select Options */}
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Production Line
                  </Label>
                  <Select value={selectedLine} onValueChange={setSelectedLine}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select line" />
                    </SelectTrigger>
                    <SelectContent>
                      {lines.map((line) => (
                        <SelectItem key={line._id} value={line._id}>{line.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Machine
                  </Label>
                  <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select machine" />
                    </SelectTrigger>
                    <SelectContent>
                      {machines.map((m) => (
                        <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Process
                  </Label>
                  <Select value={selectedProcess} onValueChange={setSelectedProcess}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select process" />
                    </SelectTrigger>
                    <SelectContent>
                      {processes.map((p) => (
                        <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Unit
                  </Label>
                  <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Questions Section */}
              <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base font-semibold">Questions</h2>
                    <p className="text-xs text-muted-foreground">
                      Keep questions short and focused. Use global questions for templates that apply everywhere.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedCategoryId}
                        onValueChange={setSelectedCategoryId}
                      >
                        <SelectTrigger className="w-[180px] h-9 text-xs">
                          <SelectValue placeholder="Category (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {(categoriesRes?.data || []).map((cat) => (
                            <SelectItem key={cat._id} value={cat._id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddFromCategory}
                      >
                        Add from category
                      </Button>
                    </div>
                    <Button type="button" size="sm" onClick={addQuestion}>
                      <FiPlus className="mr-2 h-4 w-4" /> Add Question
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  {questions.map((q, idx) => {
                    const type = q.questionType || "yes_no";
                    const isChoiceType = type === "mcq" || type === "dropdown";

                    return (
                      <Card key={idx} className="shadow-xs border-border/70">
                        <CardContent className="space-y-4 p-4 md:p-5">
                          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] items-center">
                            <Input
                              placeholder={`Question ${idx + 1}`}
                              value={q.questionText}
                              onChange={(e) => handleQuestionChange(idx, e.target.value)}
                              required
                            />

                            <Select
                              value={type}
                              onValueChange={(val) => handleQuestionTypeChange(idx, val)}
                            >
                              <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Question type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="yes_no">Yes / No</SelectItem>
                                <SelectItem value="mcq">MCQ (radio)</SelectItem>
                                <SelectItem value="dropdown">Dropdown</SelectItem>
                                <SelectItem value="short_text">Short description</SelectItem>
                                <SelectItem value="image">Image + Yes / No</SelectItem>
                              </SelectContent>
                            </Select>

                            <div className="flex items-center gap-2 justify-end">
                              <Checkbox
                                id={`global_${idx}`}
                                checked={q.isGlobal}
                                onCheckedChange={() => handleGlobalToggle(idx)}
                              />
                              <Label htmlFor={`global_${idx}`} className="text-xs text-muted-foreground">
                                Global
                              </Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeQuestion(idx)}
                              >
                                <FiTrash2 className="mr-2 h-4 w-4" /> Remove
                              </Button>
                            </div>
                          </div>

                          {isChoiceType && (
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-muted-foreground">Options</Label>
                              <div className="space-y-2">
                                {(q.options || [""]).map((opt, optIdx) => (
                              <div
                                key={optIdx}
                                className="flex items-center gap-2"
                              >
                                <input
                                  type="radio"
                                  name={`correct-${idx}`}
                                  checked={q.correctOptionIndex === optIdx}
                                  onChange={() => handleCorrectOptionChange(idx, optIdx)}
                                  className="h-4 w-4 text-primary"
                                />
                                <Input
                                  placeholder={`Option ${optIdx + 1}`}
                                  value={opt}
                                  onChange={(e) =>
                                    handleOptionChange(idx, optIdx, e.target.value)
                                  }
                                  required={optIdx < 2}
                                />
                                <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      onClick={() => removeOption(idx, optIdx)}
                                    >
                                      <FiTrash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => addOption(idx)}
                              >
                                <FiPlus className="mr-2 h-4 w-4" /> Add Option
                              </Button>
                            </div>
                          )}

                          {type === "image" && (
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">Image URL</Label>
                                <Input
                                  placeholder="Paste image URL for this question or upload below"
                                  value={q.imageUrl || ""}
                                  onChange={(e) => handleImageUrlChange(idx, e.target.value)}
                                  required
                                />
                              </div>

                              <div className="flex flex-wrap items-center gap-3">
                                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/60">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      handleImageFileChange(idx, file);
                                      e.target.value = "";
                                    }}
                                  />
                                  {imageUploading ? "Uploading..." : "Upload image"}
                                </label>

                                {q.imageUrl && (
                                  <img
                                    src={q.imageUrl}
                                    alt="Preview"
                                    className="h-16 w-16 rounded-md border object-cover"
                                  />
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end border-t pt-4 mt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating..." : "Create Template"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
 }
