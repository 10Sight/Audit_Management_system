import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useGetQuestionsQuery } from "@/store/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Loader from "@/components/ui/Loader";

export default function AdminTemplateQuestionsPage() {
  const { user: currentUser } = useAuth();
  const { title: encodedTitle } = useParams();
  const navigate = useNavigate();

  const templateTitle = decodeURIComponent(encodedTitle || "");

  const { data: questionsRes, isLoading } = useGetQuestionsQuery({
    fetchAll: "true",
    includeGlobal: "true",
  });

  const allQuestions = useMemo(
    () => (Array.isArray(questionsRes?.data) ? questionsRes.data : []),
    [questionsRes]
  );

  const questions = useMemo(
    () => allQuestions.filter((q) => (q.templateTitle || "") === templateTitle),
    [allQuestions, templateTitle]
  );

  const meta = useMemo(() => {
    const first = questions[0];
    if (!first) return null;
    return {
      unit: first.units?.[0]?.name || "Any",
      department: first.department?.name || "Any",
      machine: first.machines?.[0]?.name || "Any",
      process: first.processes?.[0]?.name || "Any",
    };
  }, [questions]);

  if (!currentUser || currentUser.role !== "admin") {
    return <div>Access Denied</div>;
  }

  if (isLoading) return <Loader />;

  if (!templateTitle || questions.length === 0) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-0 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <HelpCircle className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium">No questions found for this template</p>
            <p className="text-xs text-muted-foreground">
              It may have been removed or no questions were created under this title.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 px-0 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">{templateTitle}</h1>
          <p className="text-sm text-muted-foreground">
            All questions defined under this audit template.
          </p>
        </div>
        {meta && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Unit: {meta.unit}</Badge>
            <Badge variant="outline">Department: {meta.department}</Badge>
            <Badge variant="outline">Machine: {meta.machine}</Badge>
            <Badge variant="outline">Process: {meta.process}</Badge>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Questions in this template</CardTitle>
          <CardDescription>
            These questions will be used when this audit template is selected in inspections.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {questions.map((q, idx) => (
              <div
                key={q._id}
                className="rounded-lg border bg-background px-3 py-3 text-sm shadow-sm"
              >
                <p className="font-medium leading-snug">
                  {idx + 1}. {q.questionText}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
