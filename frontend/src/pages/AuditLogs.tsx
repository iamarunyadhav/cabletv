import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Shield, Eye, Trash2, Edit, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { DEFAULT_PAGE_SIZE } from "@/constants/pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

const AuditLogs = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [tableFilter, setTableFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const PAGE_SIZE = DEFAULT_PAGE_SIZE;

  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs", searchTerm, tableFilter, actionFilter],
    queryFn: async () => {
      const params: Record<string, any> = {
        limit: 100,
        search: searchTerm || undefined,
      };
      if (tableFilter !== "all") params.table = tableFilter;
      if (actionFilter !== "all") params.action = actionFilter;

      const response = await apiClient.get("/audit-logs", { params });
      return response.data?.data ?? response.data ?? [];
    },
  });

  const totalLogs = logs?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalLogs / PAGE_SIZE) || 1);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, tableFilter, actionFilter]);

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
      case "INSERT":
        return <Edit className="w-4 h-4 text-green-600" />;
      case "UPDATE":
        return <Edit className="w-4 h-4 text-blue-600" />;
      case "DELETE":
        return <Trash2 className="w-4 h-4 text-red-600" />;
      default:
        return <Eye className="w-4 h-4" />;
    }
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      INSERT: "default",
      UPDATE: "secondary",
      DELETE: "destructive",
    };
    return <Badge variant={variants[action] || "secondary"}>{action}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Audit Trail</h2>
          <p className="text-muted-foreground mt-2">Complete activity log for compliance and security</p>
        </div>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <div className="flex gap-4">
            <Input
              placeholder="Search by user email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            <Select value={tableFilter} onValueChange={setTableFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Table" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tables</SelectItem>
                <SelectItem value="customers">Customers</SelectItem>
                <SelectItem value="connections">Connections</SelectItem>
                <SelectItem value="invoices">Invoices</SelectItem>
                <SelectItem value="payments">Payments</SelectItem>
                <SelectItem value="packages">Packages</SelectItem>
                <SelectItem value="areas">Areas</SelectItem>
                <SelectItem value="billing_groups">Billing Groups</SelectItem>
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="INSERT">Created</SelectItem>
                <SelectItem value="UPDATE">Updated</SelectItem>
                <SelectItem value="DELETE">Deleted</SelectItem>
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
                  <TableHead>Action</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>User</TableHead>
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
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        {getActionBadge(log.action)}
                      </div>
                </TableCell>
                <TableCell className="font-mono text-sm">{log.table_name}</TableCell>
                <TableCell className="text-sm">{log.user_email || "System"}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {log.record_id.substring(0, 8)}...
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="gap-1" onClick={() => setSelectedLog(log)}>
                    <Info className="w-4 h-4" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
                {totalLogs === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No audit logs found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          {!isLoading && totalLogs > 0 && (
            <div className="flex flex-col gap-4 border-t pt-4 mt-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {`${showingFrom} - ${showingTo}`} of {totalLogs} audit records
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
            <DialogTitle>Audit Details</DialogTitle>
            <DialogDescription>Complete change snapshot for this record.</DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Action</p>
                  <div className="flex items-center gap-2">
                    {getActionBadge(selectedLog.action)}
                    <span className="font-mono text-xs">{selectedLog.table_name}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">When</p>
                  <p className="font-medium">
                    {format(new Date(selectedLog.performed_at), "MMM d, yyyy HH:mm:ss")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">User</p>
                  <p className="font-medium">{selectedLog.user_email || "System"}</p>
                  {selectedLog.ip_address && (
                    <p className="text-xs text-muted-foreground">IP: {selectedLog.ip_address}</p>
                  )}
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
              {selectedLog.user_agent && (
                <>
                  <Separator />
                  <div className="text-xs text-muted-foreground">
                    User Agent: {selectedLog.user_agent}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditLogs;
