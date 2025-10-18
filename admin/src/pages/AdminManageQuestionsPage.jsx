import React, { useEffect, useState } from "react";
import { 
  HelpCircle, 
  Filter, 
  Trash2, 
  Globe, 
  Building2,
  Cog,
  Settings,
  Search,
  Plus,
  AlertCircle
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "@/utils/axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Loader from "@/components/ui/Loader";
import { toast } from "sonner";

export default function AdminManageQuestionsPage() {
  const { user: currentUser } = useAuth();

  const [lines, setLines] = useState([]);
  const [machines, setMachines] = useState([]);
  const [processes, setProcesses] = useState([]);

  const [selectedLine, setSelectedLine] = useState("all");
  const [selectedMachine, setSelectedMachine] = useState("all");
  const [selectedProcess, setSelectedProcess] = useState("all");
  const [includeGlobal, setIncludeGlobal] = useState(true);
  const [fetchAll, setFetchAll] = useState(false);

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch dropdown options
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [linesRes, machinesRes, processesRes] = await Promise.all([
          api.get("/api/lines",),
          api.get("/api/machines",),
          api.get("/api/processes",),
        ]);
        setLines(linesRes.data.data || []);
        setMachines(machinesRes.data.data || []);
        setProcesses(processesRes.data.data || []);
      } catch (err) {
        toast.error("Failed to load dropdown options");
      }
    };
    fetchOptions();
  }, []);

  // Fetch questions based on filters
  useEffect(() => {
    if (!currentUser || currentUser.role !== "admin") return;

    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (!fetchAll) {
          if (selectedLine && selectedLine !== "all") query.append("line", selectedLine);
          if (selectedMachine && selectedMachine !== "all") query.append("machine", selectedMachine);
          if (selectedProcess && selectedProcess !== "all") query.append("process", selectedProcess);
        }
        query.append("includeGlobal", includeGlobal ? "true" : "false");

        const { data } = await api.get(
          `/api/questions?${query.toString()}`
        );

        setQuestions(data.data);
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to fetch questions");
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [selectedLine, selectedMachine, selectedProcess, includeGlobal, fetchAll, currentUser]);

  // Delete question
  const handleDelete = async (id, questionText) => {
    try {
      await api.delete(`/api/questions/${id}`);
      toast.success("Question deleted successfully!");
      setQuestions(questions.filter((q) => q._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete question");
    }
  };

  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="h-16 w-16 text-destructive mb-4" />
            <p className="text-lg font-medium text-destructive">Access Denied</p>
            <p className="text-sm text-muted-foreground mt-2">You don't have permission to access this page</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Questions</h1>
          <p className="text-muted-foreground">Configure and manage audit questions</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          {questions.length} Total Questions
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Filter questions by line, machine, process, or view all questions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Dropdown Filters */}
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Production Line
                  </Label>
                  <Select 
                    value={selectedLine} 
                    onValueChange={setSelectedLine}
                    disabled={fetchAll}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Lines" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Lines</SelectItem>
                      {lines.map((line) => (
                        <SelectItem key={line._id} value={line._id}>
                          {line.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Cog className="h-4 w-4" />
                    Machine
                  </Label>
                  <Select 
                    value={selectedMachine} 
                    onValueChange={setSelectedMachine}
                    disabled={fetchAll}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Machines" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Machines</SelectItem>
                      {machines.map((machine) => (
                        <SelectItem key={machine._id} value={machine._id}>
                          {machine.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Process
                  </Label>
                  <Select 
                    value={selectedProcess} 
                    onValueChange={setSelectedProcess}
                    disabled={fetchAll}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Processes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Processes</SelectItem>
                      {processes.map((process) => (
                        <SelectItem key={process._id} value={process._id}>
                          {process.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Checkbox Options */}
            <div className="space-y-4">
              <div className="space-y-3">
                <Label>Display Options</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeGlobal"
                    checked={includeGlobal}
                    onCheckedChange={setIncludeGlobal}
                  />
                  <Label htmlFor="includeGlobal" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Include Global Questions
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="fetchAll"
                    checked={fetchAll}
                    onCheckedChange={setFetchAll}
                  />
                  <Label htmlFor="fetchAll" className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Fetch All Questions
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Questions Library</CardTitle>
              <CardDescription>
                {loading ? "Loading questions..." : `Found ${questions.length} questions`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-16">
              <HelpCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No questions found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Try adjusting your filters or create new questions
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {questions.map((q) => (
                <Card 
                  key={q._id} 
                  className={`group hover:shadow-md transition-all ${
                    q.isGlobal 
                      ? "border-l-4 border-l-amber-500 bg-amber-50/50" 
                      : "border-l-4 border-l-blue-500"
                  }`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <p className="font-medium text-sm leading-relaxed">
                          {q.questionText}
                        </p>
                        {q.isGlobal && (
                          <Badge variant="secondary" className="ml-2 flex-shrink-0">
                            <Globe className="h-3 w-3 mr-1" />
                            Global
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          <span>Line: {q.lines?.[0]?.name || "Any"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Cog className="h-3 w-3" />
                          <span>Machine: {q.machines?.[0]?.name || "Any"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Settings className="h-3 w-3" />
                          <span>Process: {q.processes?.[0]?.name || "Any"}</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between pt-1">
                      <Badge variant="outline" className="text-xs">
                        ID: {q._id.slice(-6)}
                      </Badge>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Question?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the question "{q.questionText.slice(0, 50)}..." 
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleDelete(q._id, q.questionText)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
