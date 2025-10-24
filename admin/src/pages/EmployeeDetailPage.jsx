import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Edit, Trash2, User, Mail, Phone, IdCard } from "lucide-react";
import { useGetEmployeeByIdQuery, useDeleteEmployeeByIdMutation } from "@/store/api";
import Loader from "@/components/ui/Loader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { data: empRes, isLoading: empLoading } = useGetEmployeeByIdQuery(id, { skip: !id });
  const [deleteEmployee] = useDeleteEmployeeByIdMutation();
  useEffect(() => {
    setLoading(empLoading);
    setEmployee(empRes?.data?.employee || null);
  }, [empRes, empLoading]);


  const handleEdit = () => navigate(`/admin/employee/edit/${id}`);
  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this employee?")) return;

    try {
      await deleteEmployee(id).unwrap();
      alert("Employee deleted successfully!");
      navigate("/admin/employees");
    } catch (err) {
      alert(err?.data?.message || err?.message || "Failed to delete employee");
    }
  };

  if (loading) return <Loader />;
  if (error) return <div className="text-red-500 p-6 text-center">{error}</div>;
  if (!employee)
    return <div className="text-gray-500 p-6 text-center">Employee not found</div>;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src="" />
              <AvatarFallback>{(employee.fullName || '?').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}</AvatarFallback>
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
            <Badge variant="outline" className="capitalize">{employee.department?.name || employee.department || 'N/A'}</Badge>
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-3">
              <IdCard className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Employee ID</p>
                <p className="font-medium">{employee.employeeId}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="font-medium">{employee.phoneNumber || 'N/A'}</p>
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
    </div>
  );
}
