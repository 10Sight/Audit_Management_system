import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useGetDepartmentsQuery, useGetUserStatsQuery, useGetAuditsQuery, useGetAllUsersQuery } from "@/store/api";
import { useNavigate } from "react-router-dom";
import { Plus, Users, ShieldCheck, ClipboardCheck } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { data: statsRes } = useGetUserStatsQuery();
  const { data: usersRes } = useGetAllUsersQuery({ page: 1, limit: 100 });
  const { data: deptRes } = useGetDepartmentsQuery({ page: 1, limit: 1 });

  const usersList = usersRes?.data?.users || [];
  const fallbackCounts = useMemo(() => ({
    total: usersRes?.data?.total ?? usersList.length,
    admins: usersList.filter(u => u.role === 'admin').length,
    employees: usersList.filter(u => u.role === 'employee').length,
    superadmins: usersList.filter(u => u.role === 'superadmin').length,
    recentUsers: usersList.slice(0,5),
  }), [usersRes, usersList]);

  const totalUsers = statsRes?.data?.total ?? fallbackCounts.total ?? 0;
  const admins = statsRes?.data?.admins ?? fallbackCounts.admins ?? 0;
  const employees = statsRes?.data?.employees ?? fallbackCounts.employees ?? 0;
  const superadmins = statsRes?.data?.superadmins ?? fallbackCounts.superadmins ?? 0;
  const recentUsers = statsRes?.data?.recentUsers ?? fallbackCounts.recentUsers ?? [];
  const totalDepartments = deptRes?.data?.total || (deptRes?.data?.departments?.length ?? 0);

  // Audits last 7 days chart
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  const primaryAudits = useGetAuditsQuery({ startDate: start.toISOString(), endDate: end.toISOString(), limit: 100 });
  const fallbackAudits = useGetAuditsQuery({ limit: 100 }, { skip: (primaryAudits?.data?.data?.audits?.length ?? 0) > 0 });
  const auditsRes = (primaryAudits?.data?.data?.audits?.length ?? 0) > 0 ? primaryAudits.data : fallbackAudits.data;
  const chartData = useMemo(() => {
    const map = new Map();
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, 0);
    }
    const list = auditsRes?.data?.audits || [];
    list.forEach((a) => {
      const ts = a?.createdAt || a?.updatedAt || new Date().toISOString();
      const key = new Date(ts).toISOString().slice(0, 10);
      if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
  }, [auditsRes]);

  return (
    <div className="space-y-6">
      {/* Top stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">All roles</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{admins}</div>
            <p className="text-xs text-muted-foreground">Manage system</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{employees}</div>
            <p className="text-xs text-muted-foreground">Operational users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Departments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalDepartments}</div>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => navigate('/superadmin/add-user')}>
          <Plus className="h-4 w-4 mr-2"/> Add User
        </Button>
        <Button variant="outline" onClick={() => navigate('/superadmin/users')}>
          <Users className="h-4 w-4 mr-2"/> Manage Users
        </Button>
        <Button variant="outline" onClick={() => navigate('/admin/dashboard')}>
          <ShieldCheck className="h-4 w-4 mr-2"/> Open Admin Panel
        </Button>
        <Button variant="outline" onClick={() => navigate('/admin/audits')}>
          <ClipboardCheck className="h-4 w-4 mr-2"/> View Audits
        </Button>
      </div>

      {/* Audits last 7 days */}
      <Card>
        <CardHeader>
          <CardTitle>Audits (last 7 days)</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent users */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Contact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentUsers.map((u) => (
                  <TableRow key={u._id} className="cursor-pointer" onClick={() => navigate('/superadmin/users')}>
                    <TableCell>{u.fullName}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'admin' ? 'destructive' : u.role === 'superadmin' ? 'outline' : 'default'}>
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{typeof u.department === 'object' ? (u.department?.name || 'N/A') : (u.department || 'N/A')}</TableCell>
                    <TableCell className="text-sm">
                      <div>{u.emailId}</div>
                      <div className="text-muted-foreground">{u.phoneNumber}</div>
                    </TableCell>
                  </TableRow>
                ))}
                {!recentUsers.length && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No users yet</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
