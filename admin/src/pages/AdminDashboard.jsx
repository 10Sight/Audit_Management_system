import React, { useEffect, useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { startOfWeek, startOfMonth, startOfYear, format } from "date-fns";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Building2, 
  Cog, 
  Calendar,
  Filter
} from "lucide-react";
import { useGetAuditsQuery, useGetLinesQuery, useGetMachinesQuery, useGetProcessesQuery, useGetAllUsersQuery, useGetEmployeesQuery } from "@/store/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function AdminDashboard() {
  const [audits, setAudits] = useState([]);
  const [lines, setLines] = useState([]);
  const [machines, setMachines] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [answerType, setAnswerType] = useState("all");
  const [selectedLine, setSelectedLine] = useState("all");
  const [selectedMachine, setSelectedMachine] = useState("all");
  const [selectedProcess, setSelectedProcess] = useState("all");
  const [timeframe, setTimeframe] = useState("daily");

  const [lineData, setLineData] = useState([]);
  const [barData, setBarData] = useState([]);
  const [pieData, setPieData] = useState([]);

  // Modern vibrant color palette for charts
  const CHART_COLORS = {
    success: '#10B981',     // Emerald green
    warning: '#F59E0B',     // Amber
    error: '#EF4444',       // Red
    info: '#3B82F6',        // Blue
    primary: '#8B5CF6',     // Purple
    secondary: '#06B6D4',   // Cyan
    accent: '#EC4899',      // Pink
    neutral: '#6B7280'      // Gray
  };
  
  const PIE_COLORS = [CHART_COLORS.success, CHART_COLORS.error];

  const getTimeframeKey = (date, timeframe) => {
    const d = new Date(date);
    if (timeframe === "daily") return format(d, "yyyy-MM-dd");
    if (timeframe === "weekly")
      return format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
    if (timeframe === "monthly") return format(startOfMonth(d), "yyyy-MM");
    if (timeframe === "yearly") return format(startOfYear(d), "yyyy");
    return format(d, "yyyy-MM-dd");
  };

  // Fetch data with RTK Query (poll audits every 30s)
  const { data: auditsRes } = useGetAuditsQuery({ page: 1, limit: 1000 }, { pollingInterval: 30000 });
  const { data: linesRes } = useGetLinesQuery();
  const { data: machinesRes } = useGetMachinesQuery();
  const { data: processesRes } = useGetProcessesQuery();
  const { data: usersRes } = useGetAllUsersQuery({ page: 1, limit: 1000 });
  // Query only employees to get accurate total count from backend
  const { data: employeesCountRes } = useGetEmployeesQuery({ page: 1, limit: 1 });

  useEffect(() => {
    const auditData = auditsRes?.data?.audits || auditsRes?.data || [];
    setAudits(Array.isArray(auditData) ? auditData : []);
    setLines(linesRes?.data || []);
    setMachines(machinesRes?.data || []);
    setProcesses(processesRes?.data || []);
    setEmployees(Array.isArray(usersRes?.data?.users) ? usersRes.data.users : []);
  }, [auditsRes, linesRes, machinesRes, processesRes, usersRes]);

  // RTK Query polling handles refresh; no manual interval needed


  // Line Chart Data
  useEffect(() => {
    if (!Array.isArray(audits)) return;
    
    const countsByPeriod = {};
    audits.forEach((audit) => {
      
      if (selectedLine && selectedLine !== "all" && audit.line?._id !== selectedLine) return;
      if (selectedMachine && selectedMachine !== "all" && audit.machine?._id !== selectedMachine) return;
      if (selectedProcess && selectedProcess !== "all" && audit.process?._id !== selectedProcess) return;

      const key = getTimeframeKey(audit.date, timeframe);
      if (!countsByPeriod[key]) countsByPeriod[key] = { Yes: 0, No: 0 };
      
      audit.answers?.forEach((ans) => {
        if (ans.answer === 'Yes' || ans.answer === 'No') {
          countsByPeriod[key][ans.answer] = (countsByPeriod[key][ans.answer] || 0) + 1;
        }
      });
    });

    const lineChartData = Object.keys(countsByPeriod)
      .sort((a, b) => new Date(a) - new Date(b))
      .map((period) => ({ date: period, ...countsByPeriod[period] }));
    setLineData(lineChartData);
  }, [audits, timeframe, selectedLine, selectedMachine, selectedProcess]);

  // Bar Chart Data
  useEffect(() => {
    if (!Array.isArray(audits)) return;
    
    const counts = {};
    audits.forEach((audit) => {
      audit.answers?.forEach((ans) => {
        if (selectedLine && selectedLine !== "all" && audit.line?._id !== selectedLine) return;
        if (selectedMachine && selectedMachine !== "all" && audit.machine?._id !== selectedMachine) return;
        if (selectedProcess && selectedProcess !== "all" && audit.process?._id !== selectedProcess) return;

        const lineName = audit.line?.name || "N/A";
        if (!counts[lineName]) counts[lineName] = { Yes: 0, No: 0 };
        counts[lineName][ans.answer] =
          (counts[lineName][ans.answer] || 0) + 1;
      });
    });

    setBarData(Object.keys(counts).map((k) => ({ name: k, ...counts[k] })));
  }, [audits, selectedLine, selectedMachine, selectedProcess]);

  // Pie Chart Data
  useEffect(() => {
    if (!Array.isArray(audits)) return;
    
    let yesCount = 0;
    let noCount = 0;

    audits.forEach((audit) => {
      if (selectedLine && selectedLine !== "all" && audit.line?._id !== selectedLine) return;
      if (selectedMachine && selectedMachine !== "all" && audit.machine?._id !== selectedMachine) return;
      if (selectedProcess && selectedProcess !== "all" && audit.process?._id !== selectedProcess) return;

      audit.answers?.forEach((ans) => {
        if (ans.answer === "Yes") yesCount++;
        if (ans.answer === "No") noCount++;
      });
    });

    setPieData([
      { name: "Yes", value: yesCount },
      { name: "No", value: noCount },
    ]);
  }, [audits, selectedLine, selectedMachine, selectedProcess]);

  const totalEmployees = useMemo(
    () => {
      const backendTotal = employeesCountRes?.data?.total;
      if (typeof backendTotal === 'number') return backendTotal;
      // Fallback: filter current users list
      return Array.isArray(employees) ? employees.filter(u => u.role === 'employee').length : 0;
    },
    [employeesCountRes, employees]
  );

  const filteredCounts = useMemo(() => {
    if (!Array.isArray(audits)) {
      return {
        filteredEmployees: 0,
        lines: lines.length,
        machines: machines.length,
        processes: processes.length,
      };
    }
    
    const filteredAudits = audits.filter((audit) => {
      if (selectedLine && selectedLine !== "all" && audit.line?._id !== selectedLine) return false;
      if (selectedMachine && selectedMachine !== "all" && audit.machine?._id !== selectedMachine) return false;
      if (selectedProcess && selectedProcess !== "all" && audit.process?._id !== selectedProcess) return false;
      return true;
    });

    const employeeIds = new Set();
    filteredAudits.forEach((audit) => {
      if (audit.auditor?._id) employeeIds.add(audit.auditor._id);
    });

    return {
      filteredEmployees: employeeIds.size,
      lines: selectedLine && selectedLine !== "all" ? 1 : lines.length,
      machines: selectedMachine && selectedMachine !== "all" ? 1 : machines.length,
      processes: selectedProcess && selectedProcess !== "all" ? 1 : processes.length,
    };
  }, [audits, selectedLine, selectedMachine, selectedProcess, lines, machines, processes]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your inspection system</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {format(new Date(), "MMM dd, yyyy")}
        </Badge>
      </div>


      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { 
            title: "Total Audits", 
            value: audits.length, 
            icon: BarChart3,
            description: "Total audit records",
            trend: "All time"
          },
          { 
            title: "Total Employees", 
            value: totalEmployees, 
            icon: Users,
            description: "Active users in system",
            trend: "+2.1% from last month"
          },
          { 
            title: "Production Lines", 
            value: filteredCounts.lines, 
            icon: Building2,
            description: "Operational lines",
            trend: "2 new lines added"
          },
          { 
            title: "Machines", 
            value: filteredCounts.machines, 
            icon: Cog,
            description: "Total machinery",
            trend: "Stable"
          },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title} className="">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <p className="text-xs text-muted-foreground">{metric.description}</p>
                <p className="text-xs text-green-600 mt-1">{metric.trend}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Filter data to focus on specific metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {["Answer Type", "Line", "Machine", "Process", "Timeframe"].map((label) => {
              const valueMap = {
                "Answer Type": answerType,
                Line: selectedLine,
                Machine: selectedMachine,
                Process: selectedProcess,
                Timeframe: timeframe,
              };
              const setValueMap = {
                "Answer Type": setAnswerType,
                Line: setSelectedLine,
                Machine: setSelectedMachine,
                Process: setSelectedProcess,
                Timeframe: setTimeframe,
              };
              const optionsMap = {
                "Answer Type": ["Yes", "No"],
                Line: lines,
                Machine: machines,
                Process: processes,
                Timeframe: ["daily", "weekly", "monthly", "yearly"],
              };

              return (
                <div key={label} className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {label}
                  </label>
                  <Select value={valueMap[label]} onValueChange={setValueMap[label]}>
                    <SelectTrigger>
                      <SelectValue 
                        placeholder={label === "Answer Type" ? "Select Answer" : `All ${label}s`} 
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {label === "Answer Type" ? "Select Answer" : `All ${label}s`}
                      </SelectItem>
                      {optionsMap[label].map((opt) => (
                        <SelectItem key={opt._id || opt} value={opt._id || opt}>
                          {opt.name || opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Trend Over Time
            </CardTitle>
            <CardDescription>
              Tracking {answerType || 'all'} responses over selected timeframe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="hsl(var(--muted))" 
                    opacity={0.3}
                  />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    formatter={(value, name) => [`${value} audits`, name]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px hsl(var(--foreground) / 0.15)'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="Yes" 
                    stroke={CHART_COLORS.success} 
                    strokeWidth={3}
                    dot={{ r: 5, fill: CHART_COLORS.success }}
                    activeDot={{ r: 7, fill: CHART_COLORS.success }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="No" 
                    stroke={CHART_COLORS.error} 
                    strokeWidth={3}
                    dot={{ r: 5, fill: CHART_COLORS.error }}
                    activeDot={{ r: 7, fill: CHART_COLORS.error }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Overall Distribution
            </CardTitle>
            <CardDescription>
              Yes/No response ratio across all filtered data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={100}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={PIE_COLORS[index]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px hsl(var(--foreground) / 0.15)'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart Full Width */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance by Production Line
          </CardTitle>
          <CardDescription>
            Comparison of Yes/No responses across different production lines
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="hsl(var(--muted))" 
                  opacity={0.3}
                />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px hsl(var(--foreground) / 0.15)'
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="Yes" 
                  fill={CHART_COLORS.success} 
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="No" 
                  fill={CHART_COLORS.error} 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
