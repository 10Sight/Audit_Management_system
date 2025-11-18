import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  useGetQuestionsQuery,
  useGetQuestionCategoriesQuery,
  useCreateQuestionCategoryMutation,
  useUpdateQuestionCategoryMutation,
  useDeleteQuestionCategoryMutation,
} from "@/store/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Search, FolderPlus, Trash2 } from "lucide-react";
import Loader from "@/components/ui/Loader";

export default function AdminQuestionCategoriesPage() {
  const { user: currentUser } = useAuth();

  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedQuestions, setSelectedQuestions] = useState([]); // array of question ids
  const [searchTerm, setSearchTerm] = useState("");

  const { data: questionsRes, isLoading: questionsLoading } = useGetQuestionsQuery({ includeGlobal: "true" });
  const { data: categoriesRes, isLoading: categoriesLoading, refetch: refetchCategories } =
    useGetQuestionCategoriesQuery();

  const [createCategory, { isLoading: creating }] = useCreateQuestionCategoryMutation();
  const [updateCategory, { isLoading: updating }] = useUpdateQuestionCategoryMutation();
  const [deleteCategory, { isLoading: deleting }] = useDeleteQuestionCategoryMutation();

  const questions = useMemo(
    () => (Array.isArray(questionsRes?.data) ? questionsRes.data : []),
    [questionsRes]
  );
  const categories = useMemo(
    () => (Array.isArray(categoriesRes?.data) ? categoriesRes.data : []),
    [categoriesRes]
  );

  useEffect(() => {
    // When categories load, if none selected, select first
    if (!selectedCategoryId && categories.length > 0) {
      const first = categories[0];
      setSelectedCategoryId(first._id);
      setName(first.name || "");
      setDescription(first.description || "");
      setSelectedQuestions((first.questions || []).map((q) => q._id));
    }
  }, [categories, selectedCategoryId]);

  const resetForm = () => {
    setSelectedCategoryId(null);
    setName("");
    setDescription("");
    setSelectedQuestions([]);
  };

  const handleSelectCategory = (cat) => {
    setSelectedCategoryId(cat._id);
    setName(cat.name || "");
    setDescription(cat.description || "");
    setSelectedQuestions((cat.questions || []).map((q) => q._id));
  };

  const handleToggleQuestion = (id) => {
    setSelectedQuestions((prev) =>
      prev.includes(id) ? prev.filter((qId) => qId !== id) : [...prev, id]
    );
  };

  const filteredQuestions = useMemo(() => {
    if (!searchTerm.trim()) return questions;
    const q = searchTerm.toLowerCase();
    return questions.filter((question) =>
      question.questionText?.toLowerCase().includes(q)
    );
  }, [questions, searchTerm]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Category name is required");
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      questionIds: selectedQuestions,
    };

    try {
      if (selectedCategoryId) {
        await updateCategory({ id: selectedCategoryId, ...payload }).unwrap();
        toast.success("Category updated");
      } else {
        await createCategory(payload).unwrap();
        toast.success("Category created");
      }
      await refetchCategories();
      if (!selectedCategoryId) resetForm();
    } catch (err) {
      const msg = err?.data?.message || err?.message || "Failed to save category";
      toast.error(msg);
    }
  };

  const handleDelete = async () => {
    if (!selectedCategoryId) return;
    if (!window.confirm("Delete this category? This will not delete the questions themselves."))
      return;

    try {
      await deleteCategory(selectedCategoryId).unwrap();
      toast.success("Category deleted");
      resetForm();
      await refetchCategories();
    } catch (err) {
      const msg = err?.data?.message || err?.message || "Failed to delete category";
      toast.error(msg);
    }
  };

  if (!currentUser || !["admin", "superadmin"].includes(currentUser.role)) {
    return <div>Access Denied</div>;
  }

  const loading = questionsLoading || categoriesLoading;

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Question Categories</h1>
          <p className="text-sm text-muted-foreground">
            Group questions into reusable categories for your question bank.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={resetForm}>
          <FolderPlus className="mr-2 h-4 w-4" />
          New Category
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
        {/* Category list */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-base">Categories</CardTitle>
            <CardDescription>
              Select a category to edit its details and questions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {categories.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No categories yet. Create one to start grouping questions.
              </p>
            )}
            {categories.map((cat) => {
              const count = cat.questions?.length || 0;
              const isActive = selectedCategoryId === cat._id;
              return (
                <button
                  key={cat._id}
                  type="button"
                  onClick={() => handleSelectCategory(cat)}
                  className={`w-full text-left rounded-md border px-3 py-2 text-sm transition hover:bg-accent hover:text-accent-foreground flex items-center justify-between gap-2 ${
                    isActive ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <span className="truncate font-medium">{cat.name}</span>
                  <Badge variant="outline" className="shrink-0 text-[11px]">
                    {count} questions
                  </Badge>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Category detail & question selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selectedCategoryId ? "Edit Category" : "New Category"}
            </CardTitle>
            <CardDescription>
              Set a name and choose which questions belong to this category.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category-name">Name</Label>
                  <Input
                    id="category-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Safety Checks"
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="category-description">Description</Label>
                  <Input
                    id="category-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Label>Questions in this category</Label>
                    <p className="text-xs text-muted-foreground">
                      Use the checkboxes to include or remove questions from this category.
                    </p>
                  </div>
                  <div className="relative w-full max-w-xs">
                    <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search questions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="max-h-[360px] overflow-y-auto rounded-md border bg-muted/40 p-2 space-y-2">
                  {filteredQuestions.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-1 py-2">
                      No questions match your search.
                    </p>
                  ) : (
                    filteredQuestions.map((q) => {
                      const checked = selectedQuestions.includes(q._id);
                      return (
                        <label
                          key={q._id}
                          className="flex cursor-pointer items-start gap-2 rounded-md bg-background px-2 py-2 text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
                        >
                          <Checkbox
                            className="mt-0.5"
                            checked={checked}
                            onCheckedChange={() => handleToggleQuestion(q._id)}
                          />
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="font-medium leading-snug break-words">
                              {q.questionText}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                              <Badge variant="outline" className="text-[10px]">
                                {q.questionType || "yes_no"}
                              </Badge>
                              {q.isGlobal && (
                                <Badge variant="secondary" className="text-[10px]">
                                  Global
                                </Badge>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={!selectedCategoryId || deleting}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete category
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={resetForm}
                  >
                    Reset
                  </Button>
                  <Button type="submit" size="sm" disabled={creating || updating}>
                    {creating || updating ? "Saving..." : "Save Category"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
