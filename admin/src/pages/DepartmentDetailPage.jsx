import React, { useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { 
  useGetAllUsersQuery,
  useGetDepartmentsQuery,
  useGetLinesQuery,
  useCreateLineMutation,
  useDeleteLineMutation,
} from "@/store/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Users, Building2, ChevronLeft, Factory } from "lucide-react"
import { toast } from "sonner"

export default function DepartmentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: deptRes } = useGetDepartmentsQuery({ page: 1, limit: 1000 })
  const { data: usersRes } = useGetAllUsersQuery({ page: 1, limit: 1000 })

  // Local state for department-scoped lines
  const [lineName, setLineName] = useState("")
  const [lineDescription, setLineDescription] = useState("")

  const { data: linesRes } = useGetLinesQuery({ department: id })
  const [createLine] = useCreateLineMutation()
  const [deleteLine] = useDeleteLineMutation()

  const department = useMemo(() => {
    return (deptRes?.data?.departments || []).find((d) => d._id === id)
  }, [deptRes, id])

  const lines = useMemo(() => {
    return Array.isArray(linesRes?.data) ? linesRes.data : []
  }, [linesRes])

  const employees = useMemo(() => {
    const list = Array.isArray(usersRes?.data?.users) ? usersRes.data.users : []
    return list
      .filter((u) => (u.role?.toLowerCase?.() || "") === "employee")
      .filter((u) => {
        if (!u.department) return false
        if (typeof u.department === "string") return u.department === id
        return u.department?._id === id
      })
  }, [usersRes, id])

  const getInitials = (name) =>
    name ? name.split(" ").map((n) => n[0]).join("").toUpperCase() : "?"

  const handleCreateLine = async () => {
    const name = lineName.trim()
    if (!name) {
      toast.error("Please enter a line name")
      return
    }
    try {
      await createLine({ name, description: lineDescription.trim(), department: id }).unwrap()
      toast.success("Line created successfully")
      setLineName("")
      setLineDescription("")
    } catch (err) {
      console.error("Failed to create line", err)
      toast.error(err?.data?.message || err?.message || "Failed to create line")
    }
  }

  const handleDeleteLine = async (lineId) => {
    try {
      await deleteLine(lineId).unwrap()
    } catch (err) {
      console.error("Failed to delete line", err)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header / Overview */}
      <Card className="border-none bg-gradient-to-r from-background via-background/95 to-muted/60 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-4 sm:p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="shrink-0">
              <ChevronLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                {department?.name || "Department"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage lines and team members for this department.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-end">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Factory className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{lines.length} lines</span>
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{employees.length} members</span>
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Lines Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Lines in this department
          </CardTitle>
          <CardDescription>
            Create and manage production lines. Click a line to manage its machines on the next screen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-3 sm:p-4 space-y-3">
            <div className="grid gap-2 md:grid-cols-2">
              <Input
                placeholder="Line name (e.g., Assembly Line)"
                value={lineName}
                onChange={(e) => setLineName(e.target.value)}
              />
              <Textarea
                placeholder="Description (optional)"
                value={lineDescription}
                onChange={(e) => setLineDescription(e.target.value)}
                rows={1}
              />
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={handleCreateLine}>
                Add Line
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {lines.length ? (
              <div className="divide-y rounded-md border bg-card">
                {lines.map((line) => (
                  <button
                    key={line._id}
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/60 transition-colors"
                    onClick={() => navigate(`/admin/departments/${id}/lines/${line._id}`)}
                  >
                    <div>
                      <div className="font-medium">{line.name}</div>
                      {line.description && (
                        <div className="text-xs text-muted-foreground">{line.description}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={line.isActive ? "default" : "secondary"}>
                        {line.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteLine(line._id)
                        }}
                        aria-label="Delete line"
                      >
                        
                      </Button>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No lines defined for this department yet. Start by creating the first one above.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Employees Section */}
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
