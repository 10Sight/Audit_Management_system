import React, { useEffect, useMemo, useState } from "react";
import {
  HelpCircle,
  Filter,
  Trash2,
  Globe,
  Building2,
  Cog,
  Settings,
  Search,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  useGetLinesQuery,
  useGetMachinesQuery,
  useGetProcessesQuery,
  useGetUnitsQuery,
  useGetQuestionsQuery,
  useDeleteQuestionMutation,
} from "@/store/api";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Loader from "@/components/ui/Loader";
import { toast } from "sonner";

export default function AdminManageQuestionsPage() {
  const { user: currentUser } = useAuth();

  const [lines, setLines] = useState([]);
  const [machines, setMachines] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [units, setUnits] = useState([]);

  const [selectedLine, setSelectedLine] = useState("all");
  const [selectedMachine, setSelectedMachine] = useState("all");
  const [selectedProcess, setSelectedProcess] = useState("all");
  const [selectedUnit, setSelectedUnit] = useState("all");
  const [includeGlobal, setIncludeGlobal] = useState(true);
  const [fetchAll, setFetchAll] = useState(false);

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const rowsPerPage = 12;

  const { data: linesRes } = useGetLinesQuery();
  const { data: machinesRes } = useGetMachinesQuery();
  const { data: processesRes } = useGetProcessesQuery();
  const { data: unitsRes } = useGetUnitsQuery();
  const [deleteQuestion] = useDeleteQuestionMutation();

  useEffect(() => {
    setLines(linesRes?.data || []);
    setMachines(machinesRes?.data || []);
    setProcesses(processesRes?.data || []);
    setUnits(unitsRes?.data || []);
  }, [linesRes, machinesRes, processesRes, unitsRes]);

  // Fetch questions based on filters via RTK Query
  const queryParams = {
    ...(fetchAll
      ? {}
      : {
          ...(selectedLine && selectedLine !== "all" ? { line: selectedLine } : {}),
          ...(selectedMachine && selectedMachine !== "all" ? { machine: selectedMachine } : {}),
          ...(selectedProcess && selectedProcess !== "all" ? { process: selectedProcess } : {}),
          ...(selectedUnit && selectedUnit !== "all" ? { unit: selectedUnit } : {}),
        }),
    includeGlobal: includeGlobal ? "true" : "false",
  };

  const { data: questionsRes, isLoading: questionsLoading } = useGetQuestionsQuery(queryParams);

  useEffect(() => {
    setLoading(questionsLoading);
    if (Array.isArray(questionsRes?.data)) setQuestions(questionsRes.data);
  }, [questionsRes, questionsLoading]);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedLine, selectedMachine, selectedProcess, selectedUnit, includeGlobal, fetchAll]);

  const filteredQuestions = useMemo(() => {
    if (!searchTerm.trim()) return questions;
    const query = searchTerm.toLowerCase();
    return questions.filter((q) => q.questionText?.toLowerCase().includes(query));
  }, [questions, searchTerm]);

  const total = filteredQuestions.length;
  const totalGlobal = useMemo(
    () => filteredQuestions.filter((q) => q.isGlobal).length,
    [filteredQuestions]
  );
  const totalScoped = total - totalGlobal;

  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
  const startIndex = (page - 1) * rowsPerPage;
  const paginatedQuestions = filteredQuestions.slice(
    startIndex,
    startIndex + rowsPerPage
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // Delete question
  const handleDelete = async (id, questionText) => {
    try {
      await deleteQuestion(id).unwrap();
      toast.success("Question deleted successfully!");
      setQuestions((prev) => prev.filter((q) => q._id !== id));
    } catch (err) {
      toast.error(
        err?.data?.message || err?.message || "Failed to delete question"
      );
    }
  };

  if (!currentUser || !["admin", "superadmin"].includes(currentUser.role)) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="mb-4 h-16 w-16 text-destructive" />
            <p className="text-lg font-medium text-destructive">Access Denied</p>
            <p className="mt-2 text-sm text-muted-foreground">
              You don't have permission to access this page
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Questions</h1>
          <p className="text-muted-foreground">
            Browse, filter and maintain your audit question library
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <HelpCircle className="h-4 w-4" />
            {total} total
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Globe className="h-4 w-4" />
            {totalGlobal} global
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Settings className="h-4 w-4" />
            {totalScoped} scoped
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Narrow down questions by line, machine, process or include global
            questions.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
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
                    <SelectTrigger className="w-full">
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
                    <SelectTrigger className="w-full">
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
                    <SelectTrigger className="w-full">
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
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Unit
                  </Label>
                  <Select
                    value={selectedUnit}
                    onValueChange={setSelectedUnit}
                    disabled={fetchAll}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Units" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Units</SelectItem>
                      {units.map((unit) => (
                        <SelectItem key={unit._id} value={unit._id}>
                          {unit.name}
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
                  <Label
                    htmlFor="includeGlobal"
                    className="flex items-center gap-2"
                  >
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Questions Library</CardTitle>
              <CardDescription>
                {loading
                  ? "Loading questions..."
                  : `Showing ${paginatedQuestions.length} of ${total} questions`}
              </CardDescription>
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader />
            </div>
          ) : total === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <HelpCircle className="mb-4 h-16 w-16 text-muted-foreground" />
              <p className="text-lg font-medium text-muted-foreground">
                No questions found
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try adjusting filters or search terms, or create new questions.
              </p>
            </div>
          ) : (
            <>
              <div className="border-t">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Question</TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Scope
                      </TableHead>
                      <TableHead className="hidden md:table-cell">
                        Type
                      </TableHead>
                      <TableHead className="hidden md:table-cell">
                        Created
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedQuestions.map((q) => (
                      <TableRow
                        key={q._id}
                        className={q.isGlobal ? "bg-amber-50/40" : undefined}
                      >
                        <TableCell className="align-top">
                          <div className="space-y-1">
                            <p className="max-w-xl text-sm font-medium leading-relaxed">
                              {q.questionText}
                            </p>
                            <div className="flex flex-wrap gap-1 text-xs text-muted-foreground md:hidden">
                              <span>
                                Line: {q.lines?.[0]?.name || "Any"}
                              </span>
                              <span>•</span>
                              <span>
                                Machine: {q.machines?.[0]?.name || "Any"}
                              </span>
                              <span>•</span>
                              <span>
                                Process: {q.processes?.[0]?.name || "Any"}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell align-top">
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              <span>{q.lines?.[0]?.name || "Any"}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Cog className="h-3 w-3" />
                              <span>{q.machines?.[0]?.name || "Any"}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Settings className="h-3 w-3" />
                              <span>{q.processes?.[0]?.name || "Any"}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Settings className="h-3 w-3" />
                              <span>{q.units?.[0]?.name || "Any"}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell align-top">
                          <Badge
                            variant={q.isGlobal ? "secondary" : "outline"}
                            className="flex w-fit items-center gap-1"
                          >
                            {q.isGlobal ? (
                              <>
                                <Globe className="h-3 w-3" /> Global
                              </>
                            ) : (
                              <>Scoped</>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell align-top text-xs text-muted-foreground">
                          {q.createdAt
                            ? new Date(q.createdAt).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell className="w-[80px] text-right align-top">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete question?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the question "
                                  {q.questionText?.slice(0, 80)}
                                  {q.questionText?.length > 80 ? "..." : ""}
                                  ". This action cannot be undone.
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col gap-3 border-t bg-muted/30 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Showing
                  <span className="mx-1 font-medium">
                    {total === 0 ? 0 : startIndex + 1}–
                    {Math.min(startIndex + rowsPerPage, total)}
                  </span>
                  of <span className="font-medium">{total}</span> questions
                </p>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                  >
                    <span className="sr-only">Go to first page</span>
                    <ChevronLeft className="h-3 w-3" />
                    <ChevronLeft className="-ml-2 h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                    disabled={page === 1}
                  >
                    <span className="sr-only">Go to previous page</span>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={page >= totalPages}
                  >
                    <span className="sr-only">Go to next page</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage(totalPages)}
                    disabled={page >= totalPages}
                  >
                    <span className="sr-only">Go to last page</span>
                    <ChevronRight className="h-3 w-3" />
                    <ChevronRight className="-ml-2 h-3 w-3" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
