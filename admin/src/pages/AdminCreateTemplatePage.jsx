import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "../context/AuthContext";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { useGetLinesQuery, useGetMachinesQuery, useGetProcessesQuery, useCreateQuestionsMutation } from "@/store/api";
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

  const [selectedLine, setSelectedLine] = useState("");
  const [selectedMachine, setSelectedMachine] = useState("");
  const [selectedProcess, setSelectedProcess] = useState("");

  const [questions, setQuestions] = useState([{ questionText: "", isGlobal: false }]);

  const { data: linesRes } = useGetLinesQuery();
  const { data: machinesRes } = useGetMachinesQuery();
  const { data: processesRes } = useGetProcessesQuery();
  const [createQuestions] = useCreateQuestionsMutation();
  useEffect(() => {
    setLines(linesRes?.data || []);
    setMachines(machinesRes?.data || []);
    setProcesses(processesRes?.data || []);
  }, [linesRes, machinesRes, processesRes]);

  const addQuestion = () =>
    setQuestions([...questions, { questionText: "", isGlobal: false }]);
  const removeQuestion = (idx) =>
    setQuestions(questions.filter((_, i) => i !== idx));

  const handleQuestionChange = (idx, value) => {
    const newQ = [...questions];
    newQ[idx].questionText = value;
    setQuestions(newQ);
  };

  const handleGlobalToggle = (idx) => {
    const newQ = [...questions];
    newQ[idx].isGlobal = !newQ[idx].isGlobal;
    setQuestions(newQ);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!questions.length) return toast.error("Add at least one question!");
    if (!selectedLine || !selectedMachine || !selectedProcess) {
      return toast.error("Select a Line, Machine, and Process before adding questions!");
    }

    try {
      setLoading(true);
      const payload = questions.map((q) => ({
        questionText: q.questionText,
        isGlobal: q.isGlobal,
        line: selectedLine,
        machine: selectedMachine,
        process: selectedProcess,
      }));

      await createQuestions(payload).unwrap();

      toast.success("Template created!");
      navigate("/admin/questions");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create template");
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser || currentUser.role !== "admin") return <div>Access Denied</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <ToastContainer theme="light" />

      <Card>
        <CardHeader>
          <CardTitle>Create Inspection Template</CardTitle>
          <CardDescription>Define contextual questions for a Line, Machine and Process.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Select Options */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Production Line</Label>
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
                <Label>Machine</Label>
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
                <Label>Process</Label>
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
            </div>

            {/* Questions Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Questions</h2>
                <Button type="button" size="sm" onClick={addQuestion}>
                  <FiPlus className="mr-2 h-4 w-4" /> Add Question
                </Button>
              </div>

              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <div key={idx} className="grid gap-3 md:grid-cols-[1fr_auto_auto] items-center">
                    <Input
                      placeholder="Enter question text"
                      value={q.questionText}
                      onChange={(e) => handleQuestionChange(idx, e.target.value)}
                      required
                    />
                    <div className="flex items-center gap-2">
                      <Checkbox id={`global_${idx}`} checked={q.isGlobal} onCheckedChange={() => handleGlobalToggle(idx)} />
                      <Label htmlFor={`global_${idx}`}>Global</Label>
                    </div>
                    <Button type="button" variant="destructive" size="sm" onClick={() => removeQuestion(idx)}>
                      <FiTrash2 className="mr-2 h-4 w-4" /> Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Template"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
