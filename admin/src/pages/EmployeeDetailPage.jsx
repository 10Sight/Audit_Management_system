import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Edit, Trash2, User, Mail, Phone, IdCard, Activity, Calendar, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { useGetEmployeeByIdQuery, useDeleteEmployeeByIdMutation, useGetAuditsQuery } from "@/store/api";
import Loader from "@/components/ui/Loader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { data: empRes, isLoading: empLoading } = useGetEmployeeByIdQuery(id, { skip: !id });
  const { data: auditsRes, isLoading: auditsLoading } = useGetAuditsQuery({ auditor: id, page: 1, limit: 20 }, { skip: !id });
  const [deleteEmployee] = useDeleteEmployeeByIdMutation();

  const getAverageRatingPercent = (audit) => {
    const values = [
      audit.lineRating,
      audit.machineRating,
      audit.processRating,
      audit.unitRating,
    ].filter((v) => typeof v === "number");
    if (!values.length) return null;
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    return Math.round((avg / 10) * 100);
  };

  const getAnswersSummary = (audit) => {
    if (!Array.isArray(audit.answers)) return { yes: 0, no: 0, total: 0, percentage: 0 };
    const yes = audit.answers.filter((a) => a.answer === "Yes").length;
    const no = audit.answers.filter((a) => a.answer === "No").length;
    const total = audit.answers.length;
    const percentage = total > 0 ? Math.round((yes / total) * 100) : 0;
    return { yes, no, total, percentage };
  };

  useEffect(() => {
    setLoading(empLoading);
    setEmployee(empRes?.data?.employee || null);
  }, [empRes, empLoading]);

  const handleBack = () => navigate("/admin/employees");
  const handleEdit = () => navigate(`/admin/employee/edit/${id}`);
  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this auditor?")) return;

    try {
      await deleteEmployee(id).unwrap();
      alert("Auditor deleted successfully!");
      navigate("/admin/employees");
    } catch (err) {
      alert(err?.data?.message || err?.message || "Failed to delete auditor");
    }
  };

  const audits = auditsRes?.data?.audits || [];

  if (loading) return <Loader />;
  if (error) return <div className="text-red-500 p-6 text-center">{error}</div>;
  if (!employee)
    return <div className="text-gray-500 p-6 text-center">Auditor not found</div>;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
        onClick={handleBack}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Auditors
      </Button>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src="" />
              <AvatarFallback>{(employee.fullName || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">{employee.fullName}</CardTitle>
              <CardDescription>{employee.emailId}</CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleEdit} size="sm">
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Button onClick={handleDelete} variant="destructive" size="sm">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="capitalize">{employee.role}</Badge>
            <Badge variant="outline" className="capitalize">{employee.department?.name || employee.department || "N/A"}</Badge>
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-3">
              <IdCard className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Auditor ID</p>
                <p className="font-medium">{employee.employeeId}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="font-medium">{employee.phoneNumber || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium break-all">{employee.emailId}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Joined</p>
                <p className="font-medium">{new Date(employee.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-lg">Audit History & Scores</CardTitle>
                <CardDescription>All audits performed by this auditor and their scores.</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {auditsLoading ? (
            <Loader />
          ) : audits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audits found for this auditor.</p>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Line</TableHead>
                    <TableHead>Machine</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead className="text-center">Rating Score</TableHead>
                    <TableHead className="text-center">Answers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audits.map((audit) => {
                    const ratingPercent = getAverageRatingPercent(audit);
                    const { yes, no, total, percentage } = getAnswersSummary(audit);
                    const hasIssues = no > 0;
                    return (
                      <TableRow
                        key={audit._id}
                        className="cursor-pointer hover:bg-muted/60"
                        onClick={() => navigate(`/admin/audits/${audit._id}`)}
                      >
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {audit.date ? new Date(audit.date).toLocaleDateString() : "N/A"}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{audit.line?.name || "N/A"}</TableCell>
                        <TableCell className="whitespace-nowrap">{audit.machine?.name || "N/A"}</TableCell>
                        <TableCell className="whitespace-nowrap">{audit.shift || "N/A"}</TableCell>
                        <TableCell className="text-center">
                          {ratingPercent !== null ? (
                            <Badge variant="outline" className="text-xs">
                              {ratingPercent}%
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">No rating</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="inline-flex items-center gap-2 text-xs">
                            <span className="flex items-center gap-1 text-green-700">
                              <CheckCircle2 className="h-3 w-3" /> {yes}
                            </span>
                            <span className={`flex items-center gap-1 ${hasIssues ? "text-red-600" : "text-gray-500"}`}>
                              <XCircle className="h-3 w-3" /> {no}
                            </span>
                            <span className="text-muted-foreground">({percentage}% Yes of {total})</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
