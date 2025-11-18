import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Settings, Mail, Info, CheckCircle2 } from "lucide-react";
import api from "@/utils/axios";
import { toast } from "sonner";

export default function AuditEmailSettingsPage() {
  const [toEmails, setToEmails] = useState("");
  const [ccEmails, setCcEmails] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get("/api/audits/email-settings");
        const setting = res?.data?.data;
        if (setting) {
          setToEmails(setting.to || "");
          setCcEmails(setting.cc || "");
          const updatedAt = setting.updatedAt || setting.createdAt;
          if (updatedAt) {
            setLastUpdated(new Date(updatedAt));
          }
        }
      } catch (error) {
        // Silently ignore if not configured yet
        console.error("Failed to load audit email settings", error);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!toEmails.trim()) {
      toast.error("Please enter at least one primary email address");
      return;
    }

    setLoading(true);
    try {
      const res = await api.put("/api/audits/email-settings", {
        to: toEmails,
        cc: ccEmails,
      });
      const setting = res?.data?.data;
      if (setting) {
        const updatedAt = setting.updatedAt || setting.createdAt;
        if (updatedAt) {
          setLastUpdated(new Date(updatedAt));
        }
      }
      toast.success("Audit email settings updated");
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to update email settings";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-7 w-7 text-primary" />
            Audit Email Settings
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Define where completed audit inspection reports are delivered when employees click
            <span className="mx-1 font-medium">"Share via Email"</span>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            Global routing active
          </Badge>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground">
              Last updated: {lastUpdated.toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Main settings card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Recipients
            </CardTitle>
            <CardDescription>
              Enter one or more email addresses. Use commas to separate multiple recipients.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSave}>
              <div className="space-y-2">
                <Label htmlFor="to-emails">To (required)</Label>
                <Input
                  id="to-emails"
                  placeholder="e.g. quality.head@example.com, plant.manager@example.com"
                  value={toEmails}
                  onChange={(e) => setToEmails(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Primary recipients for audit reports. You can add multiple addresses separated by commas.
                </p>

                {toEmails.trim() && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {toEmails
                      .split(",")
                      .map((e) => e.trim())
                      .filter(Boolean)
                      .map((email) => (
                        <Badge key={email} variant="secondary" className="text-xs">
                          {email}
                        </Badge>
                      ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cc-emails">CC (optional)</Label>
                <Input
                  id="cc-emails"
                  placeholder="e.g. supervisor1@example.com, supervisor2@example.com"
                  value={ccEmails}
                  onChange={(e) => setCcEmails(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Additional recipients to be copied on every shared audit report.
                </p>

                {ccEmails.trim() && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {ccEmails
                      .split(",")
                      .map((e) => e.trim())
                      .filter(Boolean)
                      .map((email) => (
                        <Badge key={email} variant="outline" className="text-xs">
                          {email}
                        </Badge>
                      ))}
                  </div>
                )}
              </div>

              <Separator className="my-2" />

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Changes apply immediately for all future audit shares.
                </p>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Helper / info card */}
        <Card className="bg-muted/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Info className="h-4 w-4 text-primary" />
              How this works
            </CardTitle>
            <CardDescription className="text-xs">
              These settings control the recipients for all "Share via Email" actions on the employee audit submission page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <ul className="list-disc pl-4 space-y-1">
              <li>
                Employees do <span className="font-semibold">not</span> choose emails manually; reports always go to these
                configured addresses.
              </li>
              <li>
                Use the <span className="font-mono">To</span> field for primary owners (e.g. Quality Head, Plant Manager).
              </li>
              <li>
                Use the <span className="font-mono">CC</span> field for supervisors or stakeholders who should be kept in the
                loop.
              </li>
            </ul>
            <Separator />
            <div>
              <p className="font-medium text-xs mb-1 text-foreground">Example configuration</p>
              <p className="font-mono text-[11px] bg-background border rounded px-2 py-1 break-all">
                To: quality.head@company.com, plant.manager@company.com
                <br />
                CC: supervisor.line1@company.com
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
