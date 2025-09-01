import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
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

// react-icons
import { FaChartLine, FaChartBar, FaChartPie, FaUsers } from "react-icons/fa";
import { MdPrecisionManufacturing } from "react-icons/md";
import { FaCogs } from "react-icons/fa";

export default function AdminDashboard() {
  const [audits, setAudits] = useState([]);
  const [lines, setLines] = useState([]);
  const [machines, setMachines] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [answerType, setAnswerType] = useState("Yes");
  const [selectedLine, setSelectedLine] = useState("");
  const [selectedMachine, setSelectedMachine] = useState("");
  const [selectedProcess, setSelectedProcess] = useState("");
  const [timeframe, setTimeframe] = useState("daily");

  const [lineData, setLineData] = useState([]);
  const [barData, setBarData] = useState([]);
  const [pieData, setPieData] = useState([]);

  const COLORS = ["#00C49F", "#FF8042"];

  const api = axios.create({
    baseURL: "https://audit-management-system-server.onrender.com",
    withCredentials: true,
  });

  const getTimeframeKey = (date, timeframe) => {
    const d = new Date(date);
    if (timeframe === "daily") return format(d, "yyyy-MM-dd");
    if (timeframe === "weekly")
      return format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
    if (timeframe === "monthly") return format(startOfMonth(d), "yyyy-MM");
    if (timeframe === "yearly") return format(startOfYear(d), "yyyy");
    return format(d, "yyyy-MM-dd");
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [auditsRes, linesRes, machinesRes, processesRes, employeesRes] =
          await Promise.all([
            api.get("/audits"),
            api.get("/lines"),
            api.get("/machines"),
            api.get("/processes"),
            axios.get("https://audit-management-system-server.onrender.com", {
              withCredentials: true,
            }),
          ]);

        setAudits(auditsRes.data.data || []);
        setLines(linesRes.data.data || []);
        setMachines(machinesRes.data.data || []);
        setProcesses(processesRes.data.data || []);
        setEmployees(
          Array.isArray(employeesRes.data.data.employees)
            ? employeesRes.data.data.employees
            : []
        );
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    fetchData();
  }, []);

  // Line Chart Data
  useEffect(() => {
    const countsByPeriod = {};
    audits.forEach((audit) => {
      if (selectedLine && audit.line?._id !== selectedLine) return;
      if (selectedMachine && audit.machine?._id !== selectedMachine) return;
      if (selectedProcess && audit.process?._id !== selectedProcess) return;

      const key = getTimeframeKey(audit.date, timeframe);
      if (!countsByPeriod[key]) countsByPeriod[key] = { Yes: 0, No: 0 };
      audit.answers?.forEach((ans) => {
        countsByPeriod[key][ans.answer] =
          (countsByPeriod[key][ans.answer] || 0) + 1;
      });
    });

    setLineData(
      Object.keys(countsByPeriod)
        .sort((a, b) => new Date(a) - new Date(b))
        .map((period) => ({ date: period, ...countsByPeriod[period] }))
    );
  }, [audits, timeframe, selectedLine, selectedMachine, selectedProcess]);

  // Bar Chart Data
  useEffect(() => {
    const counts = {};
    audits.forEach((audit) => {
      audit.answers?.forEach((ans) => {
        if (selectedLine && audit.line?._id !== selectedLine) return;
        if (selectedMachine && audit.machine?._id !== selectedMachine) return;
        if (selectedProcess && audit.process?._id !== selectedProcess) return;

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
    let yesCount = 0;
    let noCount = 0;

    audits.forEach((audit) => {
      if (selectedLine && audit.line?._id !== selectedLine) return;
      if (selectedMachine && audit.machine?._id !== selectedMachine) return;
      if (selectedProcess && audit.process?._id !== selectedProcess) return;

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
    () => employees.filter((emp) => emp.role === "employee").length,
    [employees]
  );

  const filteredCounts = useMemo(() => {
    const filteredAudits = audits.filter((audit) => {
      if (selectedLine && audit.line?._id !== selectedLine) return false;
      if (selectedMachine && audit.machine?._id !== selectedMachine) return false;
      if (selectedProcess && audit.process?._id !== selectedProcess) return false;
      return true;
    });

    const employeeIds = new Set();
    filteredAudits.forEach((audit) => {
      if (audit.auditor?._id) employeeIds.add(audit.auditor._id);
    });

    return {
      filteredEmployees: employeeIds.size,
      lines: selectedLine ? 1 : lines.length,
      machines: selectedMachine ? 1 : machines.length,
      processes: selectedProcess ? 1 : processes.length,
    };
  }, [audits, selectedLine, selectedMachine, selectedProcess, lines, machines, processes]);

  return (
    <div className="p-6 bg-gray-100 min-h-screen text-gray-900 space-y-6">
      <h1 className="text-3xl font-bold mb-4 flex items-center gap-2">
        <FaChartLine className="text-blue-600" /> Admin Dashboard
      </h1>

      {/* Number Boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Employees", value: totalEmployees, icon: <FaUsers /> },
          { label: "Filtered Auditors", value: filteredCounts.filteredEmployees, icon: <FaUsers /> },
          { label: "Lines", value: filteredCounts.lines, icon: <FaCogs /> },
          { label: "Machines", value: filteredCounts.machines, icon: <MdPrecisionManufacturing /> },
          { label: "Processes", value: filteredCounts.processes, icon: <FaChartBar /> },
        ].map((box) => (
          <div
            key={box.label}
            className="bg-gray-200 shadow rounded-xl p-4 flex flex-col items-center sm:items-start"
          >
            <div className="flex items-center gap-2 text-gray-700">
              {box.icon} <p className="text-sm">{box.label}</p>
            </div>
            <p className="text-2xl font-bold mt-2">{box.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 bg-gray-200 shadow p-4 rounded-xl">
        {["Answer Type", "Line", "Machine", "Process", "Timeframe"].map((label, idx) => {
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
            <div key={idx} className="flex flex-col w-full sm:w-40">
              <label className="mb-1 text-gray-700 text-sm font-medium">{label}</label>
              <select
                className="p-2 rounded-lg border border-gray-300 bg-white text-gray-900 shadow-sm"
                value={valueMap[label]}
                onChange={(e) => setValueMap[label](e.target.value)}
              >
                <option value="">
                  {label === "Answer Type" ? "Select Answer" : `All ${label}s`}
                </option>
                {optionsMap[label].map((opt) => (
                  <option key={opt._id || opt} value={opt._id || opt}>
                    {opt.name || opt}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Line Chart */}
        <div className="bg-gray-200 shadow rounded-xl p-4 w-full">
          <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
            <FaChartLine className="text-green-600" /> Trend Over Time ({answerType})
          </h2>
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value, name) => [`${value} audits`, name]} />
                <Legend />
                <Line type="monotone" dataKey="Yes" stroke="#00C49F" />
                <Line type="monotone" dataKey="No" stroke="#FF8042" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-gray-200 shadow rounded-xl p-4 w-full">
          <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
            <FaChartPie className="text-purple-600" /> Overall Yes/No Ratio
          </h2>
          <div className="w-full h-80">
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
                  outerRadius={120}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bar Chart Full Width */}
      <div className="bg-gray-200 shadow rounded-xl p-4 w-full">
        <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
          <FaChartBar className="text-orange-600" /> Yes/No per Line
        </h2>
        <div className="w-full h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Yes" fill="#00C49F" />
              <Bar dataKey="No" fill="#FF8042" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
