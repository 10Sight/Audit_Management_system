import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "../context/AuthContext";
import { FiPlus, FiEdit, FiTrash2, FiArrowLeft, FiArrowRight } from "react-icons/fi";
import { useGetAuditsQuery, useDeleteAuditMutation, useGetLinesQuery, useGetMachinesQuery, useGetProcessesQuery, useGetUnitsQuery } from "@/store/api";
import Loader from "@/components/ui/Loader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalRecords: 0, count: 0 });
  const auditsPerPage = 10;
  // Filters
  const [selectedLine, setSelectedLine] = useState('all');
  const [selectedMachine, setSelectedMachine] = useState('all');
  const [selectedProcess, setSelectedProcess] = useState('all');
  const [selectedUnit, setSelectedUnit] = useState('all');
  const [resultFilter, setResultFilter] = useState('any');
  const navigate = useNavigate();
  const { user: currentUser, loading: authLoading } = useAuth();

  const { data: linesRes } = useGetLinesQuery();
  const { data: machinesRes } = useGetMachinesQuery();
  const { data: processesRes } = useGetProcessesQuery();
  const { data: unitsRes } = useGetUnitsQuery();
  const { data: auditsRes, isLoading: auditsLoading } = useGetAuditsQuery({
    page: currentPage,
    limit: auditsPerPage,
    line: selectedLine !== 'all' ? selectedLine : undefined,
    machine: selectedMachine !== 'all' ? selectedMachine : undefined,
    process: selectedProcess !== 'all' ? selectedProcess : undefined,
    unit: selectedUnit !== 'all' ? selectedUnit : undefined,
    result: resultFilter !== 'any' ? resultFilter : undefined,
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
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-lg">Audit List</CardTitle>
              <CardDescription>Click a row to view details. Use actions to edit or delete.</CardDescription>
            </div>
            {/* Filters */}
            <div className="grid gap-3 md:grid-cols-5 w-full md:w-auto">
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {audits.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Line</TableHead>
                  <TableHead>Machine</TableHead>
                  <TableHead>Process</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Auditor</TableHead>
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
                  return (
                    <TableRow key={audit._id} className="cursor-pointer" onClick={() => navigate(`/admin/audits/${audit._id}`)}>
                      <TableCell className="whitespace-nowrap">
                        {audit.date ? new Date(audit.date).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell className="font-medium">{audit.line?.name || 'N/A'}</TableCell>
                      <TableCell>{audit.machine?.name || 'N/A'}</TableCell>
                      <TableCell>{audit.process?.name || 'N/A'}</TableCell>
                      <TableCell>{audit.unit?.name || 'N/A'}</TableCell>
                      <TableCell>{audit.auditor?.fullName || 'N/A'}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Badge variant="secondary">Yes {yes}</Badge>
                          <Badge variant={no > 0 ? "destructive" : "secondary"}>No {no}</Badge>
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
