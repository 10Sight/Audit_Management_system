import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "../context/AuthContext";
import { FiPlus, FiEdit, FiTrash2, FiArrowLeft, FiArrowRight } from "react-icons/fi";
import * as XLSX from "xlsx";
import api from "@/utils/axios";
import { useGetAuditsQuery, useDeleteAuditMutation, useGetLinesQuery, useGetMachinesQuery, useGetProcessesQuery, useGetUnitsQuery, useGetDepartmentsQuery } from "@/store/api";
import Loader from "@/components/ui/Loader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AuditsPage() {
  const [audits, setAudits] = useState([]);

  const getAverageRatingPercent = (audit) => {
    const values = [
      audit.lineRating,
      audit.machineRating,
      audit.processRating,
      audit.unitRating,
    ].filter((v) => typeof v === 'number');
    if (!values.length) return null;
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    return Math.round((avg / 10) * 100);
  };

  const getRatingColor = (percent) => {
    if (percent == null) return '#9ca3af'; // gray
    if (percent < 40) return '#ef4444';    // red
    if (percent < 75) return '#f59e0b';    // amber
    return '#22c55e';                      // green
  };
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalRecords: 0, count: 0 });
  const auditsPerPage = 10;
  // Filters
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedLine, setSelectedLine] = useState('all');
  const [selectedMachine, setSelectedMachine] = useState('all');
  const [selectedProcess, setSelectedProcess] = useState('all');
  const [selectedUnit, setSelectedUnit] = useState('all');
  const [selectedShift, setSelectedShift] = useState('all');
  const [resultFilter, setResultFilter] = useState('any');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const navigate = useNavigate();
  const { user: currentUser, loading: authLoading } = useAuth();

  const { data: linesRes } = useGetLinesQuery();
  const { data: machinesRes } = useGetMachinesQuery();
  const { data: processesRes } = useGetProcessesQuery();
  const { data: unitsRes } = useGetUnitsQuery();
  const { data: departmentsRes } = useGetDepartmentsQuery({ page: 1, limit: 1000 });
  const { data: auditsRes, isLoading: auditsLoading } = useGetAuditsQuery({
    page: currentPage,
    limit: auditsPerPage,
    department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
    line: selectedLine !== 'all' ? selectedLine : undefined,
    machine: selectedMachine !== 'all' ? selectedMachine : undefined,
    process: selectedProcess !== 'all' ? selectedProcess : undefined,
    unit: selectedUnit !== 'all' ? selectedUnit : undefined,
    shift: selectedShift !== 'all' ? selectedShift : undefined,
    result: resultFilter !== 'any' ? resultFilter : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });
  const [deleteAudit] = useDeleteAuditMutation();

  useEffect(() => {
    setLoading(auditsLoading);
    if (auditsRes?.data?.audits) {
      setAudits(auditsRes.data.audits);
      setPagination(auditsRes.data.pagination);
    } else if (Array.isArray(auditsRes?.data)) {
      const sortedAudits = auditsRes.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setAudits(sortedAudits.slice((currentPage - 1) * auditsPerPage, currentPage * auditsPerPage));
      setPagination({
        total: Math.ceil(sortedAudits.length / auditsPerPage),
        totalRecords: sortedAudits.length,
        count: Math.min(auditsPerPage, sortedAudits.length)
      });
    }
  }, [auditsRes, auditsLoading, currentPage]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this audit?")) return;

    try {
      setProcessing(true);
      await deleteAudit(id).unwrap();
      toast.success("Audit deleted successfully");
      // Refresh current page after deletion
      await fetchAudits(currentPage);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to delete audit");
    } finally {
      setProcessing(false);
    }
  };

  const goToPage = (page) => {
    if (page < 1 || page > pagination.total) return;
    setCurrentPage(page);
  };

  const handleExport = async () => {
    try {
      setProcessing(true);

      const params = {
        page: 1,
        limit: 100000,
        department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
        line: selectedLine !== 'all' ? selectedLine : undefined,
        machine: selectedMachine !== 'all' ? selectedMachine : undefined,
        process: selectedProcess !== 'all' ? selectedProcess : undefined,
        unit: selectedUnit !== 'all' ? selectedUnit : undefined,
        shift: selectedShift !== 'all' ? selectedShift : undefined,
        result: resultFilter !== 'any' ? resultFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      const res = await api.get('/api/audits', { params });
      const exportAudits = res?.data?.data?.audits || [];

      if (!exportAudits.length) {
        toast.info('No audits to export for selected filters');
        return;
      }

      const data = exportAudits.map((audit) => {
        const answers = Array.isArray(audit.answers) ? audit.answers : [];
        const yes = answers.filter((a) => a.answer === 'Yes').length;
        const no = answers.filter((a) => a.answer === 'No').length;
        const total = answers.length;

        return {
          Date: audit.date ? new Date(audit.date).toLocaleDateString() : 'N/A',
          CreatedAt: audit.createdAt ? new Date(audit.createdAt).toLocaleString() : 'N/A',
          Department: audit.department?.name || 'N/A',
          Line: audit.line?.name || 'N/A',
          Machine: audit.machine?.name || 'N/A',
          Process: audit.process?.name || 'N/A',
          Unit: audit.unit?.name || 'N/A',
          Shift: audit.shift || 'N/A',
          LineLeader: audit.lineLeader || 'N/A',
          ShiftIncharge: audit.shiftIncharge || 'N/A',
          Auditor: audit.auditor?.fullName || 'N/A',
          AuditorEmail: audit.auditor?.emailId || 'N/A',
          LineRating: typeof audit.lineRating === 'number' ? audit.lineRating : '',
          MachineRating: typeof audit.machineRating === 'number' ? audit.machineRating : '',
          ProcessRating: typeof audit.processRating === 'number' ? audit.processRating : '',
          UnitRating: typeof audit.unitRating === 'number' ? audit.unitRating : '',
          YesCount: yes,
          NoCount: no,
          TotalAnswers: total,
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Audits');
      XLSX.writeFile(workbook, `audits_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to export audits');
    } finally {
      setProcessing(false);
    }
  };

  if (loading || authLoading)
    return <Loader />;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Audits</h1>
            <p className="text-muted-foreground">Review and manage inspection audits</p>
          </div>
          {currentUser?.role === "admin" && (
            <Button onClick={() => navigate("/admin/audits/create")} size="sm" disabled={processing}>
              <FiPlus className="mr-2 h-4 w-4" /> Add Audit
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="space-y-4 border-b pb-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-lg font-semibold tracking-tight">Audit List</CardTitle>
                <CardDescription>
                  Click a row to view details. Ratings show overall performance (10/10 = 100%).
                </CardDescription>
              </div>
            {/* Filters */}
            <div className="flex flex-col gap-3 w-full md:w-auto bg-slate-50/80 dark:bg-slate-900/40 border rounded-lg p-3 md:p-4">
              <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-9">
              <div className="space-y-1">
                <Label>Department</Label>
                <Select value={selectedDepartment} onValueChange={(v) => { setSelectedDepartment(v); setCurrentPage(1); }}>
                  <SelectTrigger className="min-w-[160px]"><SelectValue placeholder="All Departments" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {(departmentsRes?.data?.departments || []).map((d) => (
                      <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Line</Label>
                <Select value={selectedLine} onValueChange={(v) => { setSelectedLine(v); setCurrentPage(1); }}>
                  <SelectTrigger className="min-w-[160px]"><SelectValue placeholder="All Lines" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Lines</SelectItem>
                    {(linesRes?.data || []).map((l) => (
                      <SelectItem key={l._id} value={l._id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Machine Filter */}
              <div className="space-y-1">
                <Label>Machine</Label>
                <Select value={selectedMachine} onValueChange={(v) => { setSelectedMachine(v); setCurrentPage(1); }}>
                  <SelectTrigger className="min-w-[160px]"><SelectValue placeholder="All Machines" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Machines</SelectItem>
                    {(machinesRes?.data || []).map((m) => (
                      <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Process Filter */}
              <div className="space-y-1">
                <Label>Process</Label>
                <Select value={selectedProcess} onValueChange={(v) => { setSelectedProcess(v); setCurrentPage(1); }}>
                  <SelectTrigger className="min-w-[160px]"><SelectValue placeholder="All Processes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Processes</SelectItem>
                    {(processesRes?.data || []).map((p) => (
                      <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Unit Filter */}
              <div className="space-y-1">
                <Label>Unit</Label>
                <Select value={selectedUnit} onValueChange={(v) => { setSelectedUnit(v); setCurrentPage(1); }}>
                  <SelectTrigger className="min-w-[160px]"><SelectValue placeholder="All Units" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Units</SelectItem>
                    {(unitsRes?.data || []).map((u) => (
                      <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Shift Filter */}
              <div className="space-y-1">
                <Label>Shift</Label>
                <Select value={selectedShift} onValueChange={(v) => { setSelectedShift(v); setCurrentPage(1); }}>
                  <SelectTrigger className="min-w-[140px]"><SelectValue placeholder="All Shifts" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shifts</SelectItem>
                    <SelectItem value="Shift 1">Shift 1</SelectItem>
                    <SelectItem value="Shift 2">Shift 2</SelectItem>
                    <SelectItem value="Shift 3">Shift 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Result</Label>
                <Select value={resultFilter} onValueChange={(v) => { setResultFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="min-w-[140px]"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="allYes">All Yes</SelectItem>
                    <SelectItem value="allNo">All No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Date range */}
              <div className="space-y-1">
                <Label>From Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                  className="min-w-[160px]"
                />
              </div>
              <div className="space-y-1">
                <Label>To Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                  className="min-w-[160px]"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 shadow-sm hover:shadow-md transition-shadow"
                onClick={handleExport}
                disabled={processing || loading}
              >
                <span>Export Excel</span>
              </Button>
            </div>
          </div>
        </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {audits.length > 0 ? (
            <div className="w-full overflow-x-auto rounded-md border bg-white shadow-sm">
            <Table className="min-w-[960px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Line</TableHead>
                  <TableHead>Machine</TableHead>
                  <TableHead>Process</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Auditor</TableHead>
                  <TableHead className="text-center">Rating</TableHead>
                  <TableHead className="text-center">Answers</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audits.map((audit) => {
                  const yes = Array.isArray(audit.answers)
                    ? audit.answers.filter(a => a.answer === 'Yes').length
                    : 0;
                  const no = Array.isArray(audit.answers)
                    ? audit.answers.filter(a => a.answer === 'No').length
                    : 0;
                  const total = yes + no;
                  const ratingPercent = getAverageRatingPercent(audit);
                  const ratingColor = getRatingColor(ratingPercent);
                  const hasIssues = no > 0;
                  const ratingTooltipParts = [];
                  if (typeof audit.lineRating === 'number') ratingTooltipParts.push(`Line: ${audit.lineRating}/10`);
                  if (typeof audit.machineRating === 'number') ratingTooltipParts.push(`Machine: ${audit.machineRating}/10`);
                  if (typeof audit.processRating === 'number') ratingTooltipParts.push(`Process: ${audit.processRating}/10`);
                  if (typeof audit.unitRating === 'number') ratingTooltipParts.push(`Unit: ${audit.unitRating}/10`);
                  if (ratingPercent !== null) ratingTooltipParts.push(`Average: ${ratingPercent}%`);
                  if (total > 0) ratingTooltipParts.push(`Answers - Yes: ${yes}, No: ${no}`);
                  const ratingTooltip = ratingTooltipParts.join(' | ');
                  return (
                    <TableRow
                      key={audit._id}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => navigate(`/admin/audits/${audit._id}`)}
                    >
                      <TableCell className="whitespace-nowrap text-sm text-gray-700">
                        {audit.date ? new Date(audit.date).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-gray-700">
                        {audit.shift || 'N/A'}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {audit.line?.name || 'N/A'}
                      </TableCell>
                      <TableCell>{audit.machine?.name || 'N/A'}</TableCell>
                      <TableCell>{audit.process?.name || 'N/A'}</TableCell>
                      <TableCell>{audit.unit?.name || 'N/A'}</TableCell>
                      <TableCell className="text-sm">
                        {audit.auditor?.fullName || 'N/A'}
                      </TableCell>
                      <TableCell className="text-center">
                        {ratingPercent !== null ? (
                          <div
                            className="flex flex-col items-center justify-center gap-1"
                            title={ratingTooltip}
                          >
                            <div className="relative w-12 h-12">
                              {(() => {
                                const radius = 18;
                                const circumference = 2 * Math.PI * radius;
                                const offset = circumference - (ratingPercent / 100) * circumference;
                                return (
                                  <svg
                                    className="w-12 h-12 rotate-[-90deg]"
                                    viewBox="0 0 50 50"
                                  >
                                    <circle
                                      cx="25"
                                      cy="25"
                                      r={radius}
                                      stroke="#e5e7eb"
                                      strokeWidth="4"
                                      fill="transparent"
                                    />
                                    <circle
                                      cx="25"
                                      cy="25"
                                      r={radius}
                                      stroke={ratingColor}
                                      strokeWidth="4"
                                      fill="transparent"
                                      strokeDasharray={circumference}
                                      strokeDashoffset={offset}
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                );
                              })()}
                              <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-800">
                                {ratingPercent}%
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-gray-500">Avg rating</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                  hasIssues
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : 'bg-green-50 text-green-700 border-green-200'
                                }`}
                              >
                                {hasIssues ? 'Issues' : 'OK'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No rating</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex items-center justify-center gap-2 rounded-full bg-gray-50 px-3 py-1 text-xs">
                          <span className="font-medium text-gray-700">Yes {yes}</span>
                          <span className={hasIssues ? "font-semibold text-red-600" : "text-gray-500"}>
                            No {no}
                          </span>
                          <span className="text-gray-400">·</span>
                          <span className="text-gray-500">Total {total}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">Actions</Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => navigate(`/admin/audits/${audit._id}`)}>
                              View details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/admin/audits/edit/${audit._id}`)}>
                              <FiEdit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(audit._id)}>
                              <FiTrash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No audits found.</p>
          )}

          {pagination.total > 1 && (
            <div className="flex flex-wrap justify-between items-center mt-6 gap-2">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * auditsPerPage) + 1} to {Math.min(currentPage * auditsPerPage, pagination.totalRecords)} of {pagination.totalRecords}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1 || loading}>
                  <FiArrowLeft className="mr-2 h-4 w-4" /> Prev
                </Button>
                {Array.from({ length: Math.min(pagination.total, 5) }, (_, i) => {
                  let pageNum;
                  if (pagination.total <= 5) pageNum = i + 1;
                  else if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= pagination.total - 2) pageNum = pagination.total - 4 + i;
                  else pageNum = currentPage - 2 + i;
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(pageNum)}
                      disabled={loading}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button variant="outline" size="sm" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === pagination.total || loading}>
                  Next <FiArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
