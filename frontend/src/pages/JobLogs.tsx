import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Activity, CheckCircle2, XCircle, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { DEFAULT_PAGE_SIZE } from "@/constants/pagination";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

const JobLogs = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const PAGE_SIZE = DEFAULT_PAGE_SIZE;

  const { data: logs, isLoading } = useQuery({
    queryKey: ["job-logs", searchTerm, sourceFilter, actionFilter],
    queryFn: async () => {
      const params: Record<string, any> = {
        limit: 200,
        search: searchTerm || undefined,
      };
      if (sourceFilter !== "all") params.table = sourceFilter;
      if (actionFilter !== "all") params.action = actionFilter;

      const response = await apiClient.get("/audit-logs", { params });
      return response.data?.data ?? response.data ?? [];
    },
  });

  const totalLogs = logs?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalLogs / PAGE_SIZE) || 1);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, sourceFilter, actionFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const startIndex = (page - 1) * PAGE_SIZE;
  const visibleLogs = logs?.slice(startIndex, startIndex + PAGE_SIZE) ?? [];
  const showingFrom = totalLogs === 0 ? 0 : startIndex + 1;
  const showingTo = Math.min(totalLogs, startIndex + visibleLogs.length);

  const getActionIcon = (action: string) => {
    switch (action) {
      case "RUN":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "FAIL":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      RUN: "default",
      FAIL: "destructive",
    };
    return <Badge variant={variants[action] || "secondary"}>{action}</Badge>;
  };

  const getSourceLabel = (tableName: string) => {
    if (tableName === "scheduler") return "Scheduler";
    if (tableName === "queue_jobs") return "Queue Job";
    return tableName || "System";
  };

  const getJobLabel = (log: any) => {
    const raw = log?.new_data?.command || log?.new_data?.job || log?.record_id || "";
    if (typeof raw !== "string") return String(raw ?? "");
    return raw.split("\\").pop() ?? raw;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Activity className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Scheduler & Job Logs</h2>
          <p className="text-muted-foreground mt-2">
            Background tasks, queue runs, and failure traces.
          </p>
        </div>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <div className="flex gap-4">
            <Input
              placeholder="Search by command or record id..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="scheduler">Scheduler</SelectItem>
                <SelectItem value="queue_jobs">Queue Jobs</SelectItem>
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="RUN">Run</SelectItem>
                <SelectItem value="FAIL">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Job / Command</TableHead>
                  <TableHead>Record ID</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {format(new Date(log.performed_at), "MMM d, yyyy HH:mm:ss")}
                    </TableCell>
                    <TableCell className="text-sm">{getSourceLabel(log.table_name)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        {getActionBadge(log.action)}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{getJobLabel(log)}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {log.record_id}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={() => setSelectedLog(log)}
                      >
                        <Info className="w-4 h-4" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {totalLogs === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No job logs found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          {!isLoading && totalLogs > 0 && (
            <div className="flex flex-col gap-4 border-t pt-4 mt-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {`${showingFrom} - ${showingTo}`} of {totalLogs} job records
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Job Details</DialogTitle>
            <DialogDescription>Complete snapshot for this job run.</DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="flex items-center gap-2">
                    {getActionBadge(selectedLog.action)}
                    <span className="font-mono text-xs">{getSourceLabel(selectedLog.table_name)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">When</p>
                  <p className="font-medium">
                    {format(new Date(selectedLog.performed_at), "MMM d, yyyy HH:mm:ss")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Job / Command</p>
                  <p className="font-mono text-xs break-all">{getJobLabel(selectedLog)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Record ID</p>
                  <p className="font-mono text-xs break-all">{selectedLog.record_id}</p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Old Data</p>
                  <div className="rounded-md border bg-muted/40 p-2 text-xs">
                    <ScrollArea className="h-48">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(selectedLog.old_data ?? {}, null, 2)}
                      </pre>
                    </ScrollArea>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">New Data</p>
                  <div className="rounded-md border bg-muted/40 p-2 text-xs">
                    <ScrollArea className="h-48">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(selectedLog.new_data ?? {}, null, 2)}
                      </pre>
                    </ScrollArea>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JobLogs;
