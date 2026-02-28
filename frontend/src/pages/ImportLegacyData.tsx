import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Upload, CheckCircle, AlertTriangle, Database, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type ImportStatus = "pending" | "running" | "completed" | "failed";

interface ImportJobPayload {
  job_id: string;
  status: ImportStatus;
  meta?: Record<string, any>;
  stats?: {
    processed_rows?: number;
    customers_created?: number;
    customers_updated?: number;
    connections_created?: number;
    connections_updated?: number;
    errors?: string[];
  };
  error?: string | null;
}

const REQUIRED_COLUMNS = ["connection_id", "name", "phone", "address", "area", "billing_group", "package", "box_number"];
const OPTIONAL_COLUMNS = ["email", "nic", "agreement_number", "status"];

const ExportButton = ({ label, endpoint }: { label: string; endpoint: string }) => {
  const handleDownload = async () => {
    try {
      const response = await apiClient.get(endpoint, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${label.toLowerCase().replace(/\s+/g, "-")}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error: any) {
      toast.error(error.message || "Failed to export file");
    }
  };

  return (
    <Button variant="outline" className="gap-2" onClick={handleDownload}>
      <Download className="h-4 w-4" />
      {label}
    </Button>
  );
};

export default function ImportLegacyData() {
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState<ImportJobPayload | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const startPolling = (jobId: string) => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const { data } = await apiClient.get<ImportJobPayload>(`/import/legacy/${jobId}`);
        setJob(data);
        if (data.status === "completed" || data.status === "failed") {
          stopPolling();
          toast.success(`Import ${data.status}`);
        }
      } catch (error: any) {
        stopPolling();
        toast.error(error.message || "Failed to fetch job status");
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  useEffect(() => stopPolling, []);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Select a CSV/Excel file first.");
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await apiClient.post<ImportJobPayload>("/import/legacy", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
    onSuccess: (data) => {
      setJob(data);
      startPolling(data.job_id);
      toast.success("Import started in background");
    },
    onError: (error: any) => toast.error(error.message || "Import failed to start"),
  });

  const handleTemplateDownload = () => {
    const header = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS].join(",");
    const sample = [
      "C-0001,John Doe,0771234567,123 Main St,Central,Default,Standard,BOX-101,john@example.com,771234567V,AGR-001,active",
      "C-0002,Jane Smith,0779998888,45 Second St,Central,Default,Standard,BOX-102,jane@example.com,,AGR-002,pending",
    ].join("\n");
    const csv = `${header}\n${sample}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "import_template.csv");
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  };

  const progress = useMemo(() => {
    if (!job?.stats?.processed_rows) return 0;
    return Math.min(100, job.stats.processed_rows); // No total row count yet, treat processed as linear progress
  }, [job]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Data Import & Export</h1>
          <p className="text-sm text-muted-foreground">
            Upload bulk customer + connection data via CSV/Excel and download finance extracts.
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleTemplateDownload}>
          <FileSpreadsheet className="h-4 w-4" />
          Download Template
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Bulk Import (queued)</CardTitle>
            <CardDescription>
              Supported columns: {REQUIRED_COLUMNS.join(", ")}. Upload CSV (save from Excel) and a background job keeps the UI responsive.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="file">Upload CSV</Label>
              <Input
                id="file"
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className="gap-2"
                onClick={() => uploadMutation.mutate()}
                disabled={!file || uploadMutation.isPending}
              >
                <Upload className="h-4 w-4" />
                {uploadMutation.isPending ? "Starting import..." : "Start Import"}
              </Button>
              {job?.job_id && (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => startPolling(job.job_id)}
                  disabled={uploadMutation.isPending}
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh Status
                </Button>
              )}
            </div>

            {job && (
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {job.status === "completed" ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : job.status === "failed" ? (
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    ) : (
                      <Database className="h-5 w-5 text-blue-500" />
                    )}
                    <div>
                      <p className="font-medium">Job: {job.job_id}</p>
                      <p className="text-xs text-muted-foreground">
                        {job.meta?.original_name ?? "Uploaded file"}
                      </p>
                    </div>
                  </div>
                  <Badge variant={job.status === "completed" ? "default" : job.status === "failed" ? "destructive" : "secondary"}>
                    {job.status}
                  </Badge>
                </div>
                {job.status !== "completed" && (
                  <Progress value={progress} className="h-2" />
                )}
                <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
                  <div className="rounded-md border p-2">
                    <p className="text-xs text-muted-foreground">Rows processed</p>
                    <p className="font-semibold">{job.stats?.processed_rows ?? 0}</p>
                  </div>
                  <div className="rounded-md border p-2">
                    <p className="text-xs text-muted-foreground">Customers created / updated</p>
                    <p className="font-semibold">
                      {(job.stats?.customers_created ?? 0)} / {(job.stats?.customers_updated ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-md border p-2">
                    <p className="text-xs text-muted-foreground">Connections created / updated</p>
                    <p className="font-semibold">
                      {(job.stats?.connections_created ?? 0)} / {(job.stats?.connections_updated ?? 0)}
                    </p>
                  </div>
                </div>
                {job.error && (
                  <Alert variant="destructive">
                    <AlertTitle>Import failed</AlertTitle>
                    <AlertDescription>{job.error}</AlertDescription>
                  </Alert>
                )}
                {job.stats?.errors && job.stats.errors.length > 0 && (
                  <Alert variant="secondary">
                    <AlertTitle>Row issues</AlertTitle>
                    <AlertDescription className="max-h-48 overflow-auto space-y-1">
                      {job.stats.errors.slice(0, 10).map((err, idx) => (
                        <div key={idx} className="text-xs">
                          {err}
                        </div>
                      ))}
                      {job.stats.errors.length > 10 && (
                        <div className="text-xs text-muted-foreground">
                          + {job.stats.errors.length - 10} more
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Finance Exports</CardTitle>
            <CardDescription>Download CSV snapshots for payables, receivables, and payments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ExportButton label="Supplier Payables" endpoint="/export/payables" />
            <ExportButton label="Customer Receivables" endpoint="/export/receivables" />
            <ExportButton label="Payments" endpoint="/export/payments" />
            <Alert variant="secondary">
              <AlertDescription className="text-xs">
                CSV files can be opened in Excel or Google Sheets. Use filters to slice balances, payables, and payment history.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How the import works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ol className="list-decimal list-inside space-y-1">
            <li>Download the template and fill required columns. Optional columns: {OPTIONAL_COLUMNS.join(", ")}.</li>
            <li>Packages will be created if missing (price defaults to 0). Billing groups and areas are created automatically.</li>
            <li>Upload the CSV/Excel file. A background queue job will process rows and update customers + connections.</li>
            <li>You can refresh the job status anytime; UI stays responsive while the queue runs.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
