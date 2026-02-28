import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { DEFAULT_PAGE_SIZE } from "@/constants/pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState, useMemo, useEffect } from "react";
import { Cable, Search, History, Pencil, Trash2, FileText, User } from "lucide-react";
import { toast } from "sonner";
import { SuspendDialog } from "@/components/SuspendDialog";
import { ResumeDialog } from "@/components/ResumeDialog";
import { SuspensionHistoryDialog } from "@/components/SuspensionHistoryDialog";
import { EditConnectionDialog } from "@/components/EditConnectionDialog";
import { GenerateInvoiceDialog } from "@/components/GenerateInvoiceDialog";
import { ConnectionFilters, FilterState } from "@/components/ConnectionFilters";
import { ActivateConnectionDialog } from "@/components/ActivateConnectionDialog";
import { DisconnectConnectionDialog } from "@/components/DisconnectConnectionDialog";
import { PostponeConnectionDialog } from "@/components/PostponeConnectionDialog";
import { useNavigate } from "react-router-dom";

const Connections = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>({});
  const [selectedConnections, setSelectedConnections] = useState<string[]>([]);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [historyConnectionId, setHistoryConnectionId] = useState<string | null>(null);
  const [editConnectionId, setEditConnectionId] = useState<string | null>(null);
  const [deleteConnectionId, setDeleteConnectionId] = useState<string | null>(null);
  const [generateInvoiceConnectionId, setGenerateInvoiceConnectionId] = useState<string | null>(null);
  const [activateConnection, setActivateConnection] = useState<{ id: string; boxNumber: string } | null>(null);
  const [disconnectConnection, setDisconnectConnection] = useState<{ id: string; boxNumber: string; currentBalance: number } | null>(null);
  const [postponeConnection, setPostponeConnection] = useState<{ id: string; boxNumber: string } | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = DEFAULT_PAGE_SIZE;

  const { data: connections, isLoading } = useQuery({
    queryKey: ["connections", search],
    queryFn: async () => {
      const response = await apiClient.get("/connections", {
        params: {
          search: search || undefined,
          per_page: 1000,
        },
      });
      const rows = response.data?.data ?? response.data ?? [];
      return rows.map((connection: any) => {
        const customer = connection.customer ?? connection.customers ?? null;
        const pkg = connection.package ?? connection.packages ?? null;
        return {
          ...connection,
          customer,
          customers: customer,
          package: pkg,
          packages: pkg,
          current_balance: Number(connection.current_balance || 0),
          special_amount: connection.special_amount ?? null,
        };
      });
    },
  });

  // Apply filters
  const filteredConnections = useMemo(() => {
    if (!connections) return [];

    return connections.filter((conn) => {
      if (filters.status && conn.status !== filters.status) return false;
      if (filters.packageId && conn.package_id !== filters.packageId) return false;
      if (filters.areaId && conn.customers?.area?.id !== filters.areaId) return false;
      if (filters.dueThreshold && conn.current_balance < filters.dueThreshold) return false;
      return true;
    });
  }, [connections, filters]);

  useEffect(() => {
    setPage(1);
  }, [search, filters]);

  const totalConnections = filteredConnections.length;
  const totalPages = Math.max(1, Math.ceil(totalConnections / PAGE_SIZE) || 1);
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const startIndex = (page - 1) * PAGE_SIZE;
  const visibleConnections = filteredConnections.slice(startIndex, startIndex + PAGE_SIZE);
  const showingFrom = totalConnections === 0 ? 0 : startIndex + 1;
  const showingTo = Math.min(totalConnections, startIndex + visibleConnections.length);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      pending: "outline",
      inactive: "secondary",
      suspended: "destructive",
      disconnect: "destructive",
      postpone: "secondary",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const toggleSelectConnection = (connectionId: string) => {
    setSelectedConnections((prev) =>
      prev.includes(connectionId)
        ? prev.filter((id) => id !== connectionId)
        : [...prev, connectionId]
    );
  };

  const toggleSelectAll = () => {
    if (visibleConnections.length === 0) {
      return;
    }

    const pageIds = visibleConnections.map((c) => c.id);
    const allSelected = pageIds.every((id) => selectedConnections.includes(id));

    if (allSelected) {
      setSelectedConnections((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedConnections((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/connections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      toast.success("Connection deleted successfully!");
      setDeleteConnectionId(null);
    },
    onError: (error: any) => {
      toast.error(error.message);
      setDeleteConnectionId(null);
    },
  });

  const handleBulkAction = (action: "suspend" | "resume") => {
    if (selectedConnections.length === 0) {
      toast.error("No connections selected");
      return;
    }
    
    if (action === "suspend") {
      setSuspendDialogOpen(true);
    } else {
      setResumeDialogOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Connections</h2>
        <p className="text-muted-foreground mt-2">Manage all box connections</p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by box number or customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {selectedConnections.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedConnections.length} selected
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleBulkAction("suspend")}
                >
                  Bulk Suspend
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleBulkAction("resume")}
                >
                  Bulk Resume
                </Button>
              </div>
            )}
          </CardTitle>
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
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        visibleConnections.length > 0 &&
                        visibleConnections.every((conn) => selectedConnections.includes(conn.id))
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Box Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Monthly Amount</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleConnections.map((connection: any) => {
                  const customer = connection.customers || connection.customer || {};
                  const pkg = connection.packages || connection.package || {};
                  const monthlyAmount = Number(
                    connection.special_amount ??
                      pkg?.price ??
                      0,
                  );
                  return (
                  <TableRow key={connection.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedConnections.includes(connection.id)}
                        onCheckedChange={() => toggleSelectConnection(connection.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Cable className="h-4 w-4 text-primary" />
                        <span className="font-medium">{connection.box_number}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{customer?.name || "Unnamed"}</div>
                        <div className="text-sm text-muted-foreground">
                          {customer?.connection_id || ""}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{pkg?.name || "Custom Package"}</TableCell>
                    <TableCell className="font-medium">
                      LKR{monthlyAmount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <span className={connection.current_balance > 0 ? "text-destructive font-medium" : "text-muted-foreground"}>
                        LKR{Number(connection.current_balance).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(connection.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {connection.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => setActivateConnection({ id: connection.id, boxNumber: connection.box_number })}
                          >
                            Activate
                          </Button>
                        )}
                        {connection.status === 'active' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedConnections([connection.id]);
                                setSuspendDialogOpen(true);
                              }}
                            >
                              Suspend
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPostponeConnection({ id: connection.id, boxNumber: connection.box_number })}
                            >
                              Postpone
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDisconnectConnection({ id: connection.id, boxNumber: connection.box_number, currentBalance: connection.current_balance })}
                            >
                              Disconnect
                            </Button>
                          </>
                        )}
                        {connection.status === 'suspended' && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => {
                                setSelectedConnections([connection.id]);
                                setResumeDialogOpen(true);
                              }}
                            >
                              Resume
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDisconnectConnection({ id: connection.id, boxNumber: connection.box_number, currentBalance: connection.current_balance })}
                            >
                              Disconnect
                            </Button>
                          </>
                        )}
                        {connection.status === 'postpone' && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => {
                                setSelectedConnections([connection.id]);
                                setResumeDialogOpen(true);
                              }}
                            >
                              Resume
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDisconnectConnection({ id: connection.id, boxNumber: connection.box_number, currentBalance: connection.current_balance })}
                            >
                              Disconnect
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setGenerateInvoiceConnectionId(connection.id)}
                          title="Generate Invoice"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setHistoryConnectionId(connection.id)}
                          title="View History"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditConnectionId(connection.id)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteConnectionId(connection.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
                })}
                {filteredConnections.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No connections found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          {!isLoading && (
            <div className="flex flex-col gap-4 border-t pt-4 mt-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {totalConnections === 0 ? 0 : `${showingFrom} - ${showingTo}`} of {totalConnections} connections
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
                  disabled={page >= totalPages || totalConnections === 0}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <SuspendDialog
        open={suspendDialogOpen}
        onOpenChange={setSuspendDialogOpen}
        connectionIds={selectedConnections}
        onSuccess={() => setSelectedConnections([])}
      />

      <ResumeDialog
        open={resumeDialogOpen}
        onOpenChange={setResumeDialogOpen}
        connectionIds={selectedConnections}
        onSuccess={() => setSelectedConnections([])}
      />

      <SuspensionHistoryDialog
        open={!!historyConnectionId}
        onOpenChange={(open) => !open && setHistoryConnectionId(null)}
        connectionId={historyConnectionId || ""}
      />

      <EditConnectionDialog
        connectionId={editConnectionId}
        open={!!editConnectionId}
        onOpenChange={(open) => !open && setEditConnectionId(null)}
      />

      <GenerateInvoiceDialog
        connectionId={generateInvoiceConnectionId || ""}
        open={!!generateInvoiceConnectionId}
        onOpenChange={(open) => !open && setGenerateInvoiceConnectionId(null)}
      />

      <ActivateConnectionDialog
        open={!!activateConnection}
        onOpenChange={(open) => !open && setActivateConnection(null)}
        connectionId={activateConnection?.id || ""}
        boxNumber={activateConnection?.boxNumber || ""}
        onSuccess={() => {
          setActivateConnection(null);
          queryClient.invalidateQueries({ queryKey: ["connections"] });
        }}
      />

      <DisconnectConnectionDialog
        open={!!disconnectConnection}
        onOpenChange={(open) => !open && setDisconnectConnection(null)}
        connectionId={disconnectConnection?.id || ""}
        boxNumber={disconnectConnection?.boxNumber || ""}
        currentBalance={disconnectConnection?.currentBalance || 0}
        onSuccess={() => {
          setDisconnectConnection(null);
          queryClient.invalidateQueries({ queryKey: ["connections"] });
        }}
      />

      <PostponeConnectionDialog
        open={!!postponeConnection}
        onOpenChange={(open) => !open && setPostponeConnection(null)}
        connectionId={postponeConnection?.id || ""}
        boxNumber={postponeConnection?.boxNumber || ""}
        onSuccess={() => {
          setPostponeConnection(null);
          queryClient.invalidateQueries({ queryKey: ["connections"] });
        }}
      />

      <AlertDialog open={!!deleteConnectionId} onOpenChange={(open) => !open && setDeleteConnectionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Connection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this connection? This action cannot be undone.
              Connections with existing invoices or payments cannot be deleted to maintain data integrity.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConnectionId && deleteMutation.mutate(deleteConnectionId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Connections;
