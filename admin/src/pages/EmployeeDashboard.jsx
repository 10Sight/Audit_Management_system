import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import * as XLSX from "xlsx";
import { 
  Download, 
  FileText, 
  Calendar,
  CheckCircle2,
  XCircle,
  Eye,
  Activity,
  BarChart3,
  TrendingUp,
  User,
  Clock
} from "lucide-react";
import api from "@/utils/axios";
import Loader from "@/components/ui/Loader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function EmployeeDashboard() {
  const { user: currentUser } = useAuth();
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const auditsPerPage = 10;

  const getInitials = (name) => {
    return name ? name.split(" ").map((n) => n[0]).join("").toUpperCase() : "?";
  };

  const getStatusInfo = (audit) => {
    // Safety check for answers array
    if (!audit.answers || !Array.isArray(audit.answers)) {
      return {
        isCompleted: false,
        completedCount: 0,
        totalCount: 0,
        percentage: 0
      };
    }
    
    const completedCount = audit.answers.filter((a) => a.answer === "Yes").length;
    const totalCount = audit.answers.length;
    const isCompleted = completedCount === totalCount;
    
    return {
      isCompleted,
      completedCount,
      totalCount,
      percentage: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
    };
  };

  useEffect(() => {
    const fetchAudits = async () => {
      try {
        const res = await api.get(`/api/audits?auditor=${currentUser?._id}`);
        const fetchedAudits = res.data?.data?.audits || [];
        // Ensure fetchedAudits is an array before sorting
        if (Array.isArray(fetchedAudits)) {
          fetchedAudits.sort((a, b) => new Date(b.date) - new Date(a.date));
          setAudits(fetchedAudits);
        } else {
          console.warn('Fetched audits is not an array:', fetchedAudits);
          setAudits([]);
        }
      } catch (err) {
        console.error("Error fetching audits:", err);
        toast.error("Failed to load audits");
      } finally {
        setLoading(false);
      }
    };
    fetchAudits();
  }, [currentUser]);

  const downloadExcel = () => {
    if (audits.length === 0) {
      toast.info("No audits to download");
      return;
    }

    const data = audits.map((audit) => ({
      Date: new Date(audit.date).toLocaleDateString(),
      Line: audit.line?.name || "N/A",
      Machine: audit.machine?.name || "N/A",
      Process: audit.process?.name || "N/A",
      LineLeader: audit.lineLeader || "N/A",
      ShiftIncharge: audit.shiftIncharge || "N/A",
      Status: (audit.answers && Array.isArray(audit.answers) && audit.answers.every((a) => a.answer === "Yes")) ? "Completed" : "Issues Found",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Audits");
    XLSX.writeFile(workbook, `Audits_${currentUser?.fullName || "user"}.xlsx`);
  };

  if (loading) return <Loader />;

  // Statistics calculations
  const totalAudits = audits.length;
  const completedAudits = audits.filter(audit => {
    return audit.answers && Array.isArray(audit.answers) && audit.answers.every(a => a.answer === "Yes");
  }).length;
  const issuesFound = totalAudits - completedAudits;
  const thisMonthAudits = audits.filter(audit => {
    const auditDate = new Date(audit.date);
    const now = new Date();
    return auditDate.getMonth() === now.getMonth() && auditDate.getFullYear() === now.getFullYear();
  }).length;

  // Pagination logic
  const indexOfLastAudit = currentPage * auditsPerPage;
  const indexOfFirstAudit = indexOfLastAudit - auditsPerPage;
  const currentAudits = audits.slice(indexOfFirstAudit, indexOfLastAudit);
  const totalPages = Math.ceil(audits.length / auditsPerPage);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(currentUser?.fullName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {currentUser?.fullName}</h1>
            <p className="text-muted-foreground">Here's your audit activity overview</p>
          </div>
        </div>
        <Button onClick={downloadExcel} disabled={audits.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export Data
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Audits</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAudits}</div>
            <p className="text-xs text-muted-foreground">Audits completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedAudits}</div>
            <p className="text-xs text-muted-foreground">Without issues</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issues Found</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{issuesFound}</div>
            <p className="text-xs text-muted-foreground">Requiring attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisMonthAudits}</div>
            <p className="text-xs text-muted-foreground">Audits completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Audit History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Audits
          </CardTitle>
          <CardDescription>
            Your audit history and performance tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          {audits.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No audits completed yet</p>
              <p className="text-sm text-muted-foreground mt-2">Your completed audits will appear here</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Production Line</TableHead>
                      <TableHead>Machine</TableHead>
                      <TableHead>Process</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentAudits.map((audit) => {
                      const statusInfo = getStatusInfo(audit);
                      return (
                        <TableRow key={audit._id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {new Date(audit.date).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>{audit.line?.name || "N/A"}</TableCell>
                          <TableCell>{audit.machine?.name || "N/A"}</TableCell>
                          <TableCell>{audit.process?.name || "N/A"}</TableCell>
                          <TableCell>
                            {statusInfo.isCompleted ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200">
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Completed
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <XCircle className="mr-1 h-3 w-3" />
                                Issues Found
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {statusInfo.completedCount}/{statusInfo.totalCount}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {statusInfo.percentage}%
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedAudit(audit);
                                setDialogOpen(true);
                              }}
                            >
                              <Eye className="mr-1 h-3 w-3" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 mt-4">
                  <div className="flex items-center space-x-6 lg:space-x-8">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium">Rows per page</p>
                      <span className="text-sm text-muted-foreground">{auditsPerPage}</span>
                    </div>
                    <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                      >
                        <span className="sr-only">Go to first page</span>
                        ««
                      </Button>
                      <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        <span className="sr-only">Go to previous page</span>
                        ‹
                      </Button>
                      <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage((prev) => prev + 1)}
                        disabled={currentPage >= totalPages}
                      >
                        <span className="sr-only">Go to next page</span>
                        ›
                      </Button>
                      <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage >= totalPages}
                      >
                        <span className="sr-only">Go to last page</span>
                        »»
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Audit Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedAudit && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Audit Details
                </DialogTitle>
                <DialogDescription>
                  Complete audit information and responses
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Audit Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Audit Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Date:</span>
                        <span>{new Date(selectedAudit.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Line:</span>
                        <Badge variant="outline">{selectedAudit.line?.name || "N/A"}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Machine:</span>
                        <Badge variant="outline">{selectedAudit.machine?.name || "N/A"}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Process:</span>
                        <Badge variant="outline">{selectedAudit.process?.name || "N/A"}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Line Leader:</span>
                        <span>{selectedAudit.lineLeader || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Shift Incharge:</span>
                        <span>{selectedAudit.shiftIncharge || "N/A"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Responses */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Audit Responses ({selectedAudit.answers?.length || 0} questions)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {(selectedAudit.answers || []).map((answer, idx) => (
                        <div key={idx} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="font-medium mb-2">
                                {idx + 1}. {answer.question?.questionText || "N/A"}
                              </p>
                              <div className="flex items-center gap-2">
                                {answer.answer === "Yes" ? (
                                  <Badge className="bg-green-100 text-green-800 border-green-200">
                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                    Yes
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive">
                                    <XCircle className="mr-1 h-3 w-3" />
                                    No
                                  </Badge>
                                )}
                              </div>
                              {answer.answer === "No" && answer.remark && (
                                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                                  <p className="text-sm">
                                    <span className="font-medium text-red-800">Remark:</span>
                                    <span className="text-red-700 ml-2">{answer.remark}</span>
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
