import React, { useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useGetAllUsersQuery, useGetDepartmentsQuery } from "@/store/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users, Building2, ChevronLeft } from "lucide-react"

export default function DepartmentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: deptRes } = useGetDepartmentsQuery({ page: 1, limit: 1000 })
  const { data: usersRes, isLoading } = useGetAllUsersQuery({ page: 1, limit: 1000 })

  const department = useMemo(() => {
    return (deptRes?.data?.departments || []).find((d) => d._id === id)
  }, [deptRes, id])

  const employees = useMemo(() => {
    const list = Array.isArray(usersRes?.data?.users) ? usersRes.data.users : []
    return list.filter((u) => (u.role?.toLowerCase?.() || "") === "employee")
      .filter((u) => {
        if (!u.department) return false
        if (typeof u.department === "string") return u.department === id
        return u.department?._id === id
      })
  }, [usersRes, id])

  const getInitials = (name) => name ? name.split(" ").map((n) => n[0]).join("").toUpperCase() : "?"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              {department?.name || "Department"}
            </h1>
            <p className="text-muted-foreground">Employees in this department</p>
          </div>
        </div>
        <Badge variant="secondary">{employees.length} members</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Members
          </CardTitle>
          <CardDescription>List of employees assigned to this department</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length > 0 ? (
                  employees.map((emp) => (
                    <TableRow key={emp._id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src="" />
                            <AvatarFallback className="text-xs">{getInitials(emp.fullName)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{emp.fullName}</div>
                            <div className="text-sm text-muted-foreground">ID: {emp.employeeId}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{emp.emailId}</div>
                          <div className="text-muted-foreground">{emp.phoneNumber}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{emp.role}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(emp.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Users className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No employees in this department</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
