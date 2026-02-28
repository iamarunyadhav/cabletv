import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Phone, History, PlayCircle, Mail, Download, TrendingUp, TrendingDown } from "lucide-react";
import { formatDistanceToNow, differenceInDays, format } from "date-fns";
import { toast } from "sonner";
import { ResumeDialog } from "@/components/ResumeDialog";
import { SuspensionHistoryDialog } from "@/components/SuspensionHistoryDialog";
import { SendSMSDialog } from "@/components/SendSMSDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_PAGE_SIZE } from "@/constants/pagination";

const Suspensions = () => {
  const [selectedConnections, setSelectedConnections] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [reasonFilter, setReasonFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [minBalance, setMinBalance] = useState("");
  const [maxBalance, setMaxBalance] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = DEFAULT_PAGE_SIZE;
  
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);

  // Fetch suspended connections
  const { data: connections, isLoading } = useQuery({
    queryKey: ["suspended-connections", searchTerm, reasonFilter, typeFilter, areaFilter, minBalance, maxBalance],
    queryFn: async () => {
      const response = await apiClient.get("/suspensions", {
        params: {
          search: searchTerm || undefined,
          reason: reasonFilter !== "all" ? reasonFilter : undefined,
          type: typeFilter !== "all" ? typeFilter : undefined,
          area_id: areaFilter !== "all" ? areaFilter : undefined,
          min_balance: minBalance || undefined,
          max_balance: maxBalance || undefined,
        },
      });
      return response.data ?? [];
    },
  });
  const totalConnections = connections?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalConnections / PAGE_SIZE) || 1);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, reasonFilter, typeFilter, areaFilter, minBalance, maxBalance, totalConnections]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const startIndex = (page - 1) * PAGE_SIZE;
  const visibleConnections = connections?.slice(startIndex, startIndex + PAGE_SIZE) ?? [];
  const showingFrom = totalConnections === 0 ? 0 : startIndex + 1;
  const showingTo = Math.min(totalConnections, startIndex + visibleConnections.length);
  const allPageSelected =
    visibleConnections.length > 0 &&
    visibleConnections.every((conn) => selectedConnections.includes(conn.id));

  // Fetch areas for filter
  const { data: areas } = useQuery({
    queryKey: ["areas"],
    queryFn: async () => {
      const response = await apiClient.get("/areas");
      return response.data?.data ?? response.data ?? [];
    },
  });

  // Calculate stats
  const stats = {
    total: connections?.length || 0,
    todaySuspensions: connections?.filter(c => 
      differenceInDays(new Date(), new Date(c.suspended_at!)) === 0
    ).length || 0,
    autoSuspended: connections?.filter(c => 
      c.suspension_history?.[0]?.is_automated
    ).length || 0,
    totalBalance: connections?.reduce((sum, c) => sum + Number(c.current_balance), 0) || 0,
    avgDaysSuspended: connections?.length 
      ? Math.round(connections.reduce((sum, c) => 
          sum + differenceInDays(new Date(), new Date(c.suspended_at!)), 0
        ) / connections.length)
      : 0,
  };

  const handleBuLKResume = () => {
    if (selectedConnections.length === 0) {
      toast.error("Please select connections to resume");
      return;
    }
    setResumeDialogOpen(true);
  };

  const handleBulkSMS = () => {
    if (selectedConnections.length === 0) {
      toast.error("Please select connections to send SMS");
      return;
    }
    setSmsDialogOpen(true);
  };

  const handleExport = () => {
    if (!connections) return;

    const csv = [
      [
        "Box Number",
        "Customer",
        "Phone",
        "Reason",
        "Reason Notes",
        "Suspended Date",
        "Days Suspended",
        "Balance",
        "Area",
        "Type",
      ],
      ...connections.map(c => [
        c.box_number,
        c.customer?.name,
        c.customer?.phone,
        c.suspension_reason || "N/A",
        getReasonNotes(c),
        format(new Date(c.suspended_at!), "yyyy-MM-dd HH:mm"),
        differenceInDays(new Date(), new Date(c.suspended_at!)),
        c.current_balance,
        c.customer?.area?.name || c.customer?.billing_group?.area?.name,
        c.suspension_history?.[0]?.is_automated ? "Auto" : "Manual"
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `suspended-connections-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    toast.success("Export completed");
  };

  const toggleSelection = (id: string) => {
    setSelectedConnections(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (!visibleConnections.length) {
      return;
    }

    if (allPageSelected) {
      setSelectedConnections((prev) => prev.filter((id) => !visibleConnections.some((conn) => conn.id === id)));
      return;
    }

    const idsToAdd = visibleConnections.map((conn) => conn.id);
    setSelectedConnections((prev) => Array.from(new Set([...prev, ...idsToAdd])));
  };

  const reasonBadgeColor = (reason: string) => {
    const colors: Record<string, string> = {
      non_payment: "bg-red-500/10 text-red-700 border-red-300",
      customer_request: "bg-blue-500/10 text-blue-700 border-blue-300",
      technical_issues: "bg-yellow-500/10 text-yellow-700 border-yellow-300",
      policy_violation: "bg-orange-500/10 text-orange-700 border-orange-300",
      maintenance: "bg-purple-500/10 text-purple-700 border-purple-300",
      other: "bg-gray-500/10 text-gray-700 border-gray-300",
    };
    return colors[reason] || colors.other;
  };

  const getReasonNotes = (connection: any) =>
    connection?.suspension_notes ||
    connection?.suspension_note ||
    connection?.notes ||
    connection?.suspension_history?.[0]?.notes ||
    "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-8 h-8 text-destructive" />
            Suspension Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage all suspended connections
          </p>
        </div>
        <Button onClick={handleExport} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export All
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Currently Suspended</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Suspensions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.todaySuspensions}</div>
            {stats.todaySuspensions > 0 && <TrendingUp className="w-4 h-4 text-destructive mt-1" />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Auto-Suspended</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{stats.autoSuspended}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Balance Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              LKR{stats.totalBalance.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Days Suspended</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.avgDaysSuspended}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <Input
              placeholder="Search box/customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={reasonFilter} onValueChange={setReasonFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reasons</SelectItem>
                <SelectItem value="non_payment">Non-Payment</SelectItem>
                <SelectItem value="customer_request">Customer Request</SelectItem>
                <SelectItem value="technical_issues">Technical Issues</SelectItem>
                <SelectItem value="policy_violation">Policy Violation</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="auto">Auto-Suspended</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Area" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Areas</SelectItem>
                {areas?.map(area => (
                  <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Min Balance"
              value={minBalance}
              onChange={(e) => setMinBalance(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Max Balance"
              value={maxBalance}
              onChange={(e) => setMaxBalance(e.target.value)}
            />
          </div>
          {!isLoading && totalConnections > 0 && (
            <div className="flex flex-col gap-4 border-t pt-4 px-6 pb-6 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {`${showingFrom} - ${showingTo}`} of {totalConnections} suspensions
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

      {/* Bulk Actions */}
      {selectedConnections.length > 0 && (
        <Card className="bg-primary/5 border-primary">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">{selectedConnections.length} connection(s) selected</span>
              <div className="flex gap-2">
                <Button onClick={handleBuLKResume} size="sm" className="gap-2">
                  <PlayCircle className="w-4 h-4" />
                  Bulk Resume
                </Button>
                <Button onClick={handleBulkSMS} size="sm" variant="outline" className="gap-2">
                  <Mail className="w-4 h-4" />
                  Bulk SMS
                </Button>
                <Button onClick={handleExport} size="sm" variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={allPageSelected}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Box Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Reason Notes</TableHead>
                <TableHead>Suspended</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={12}>
                      <Skeleton className="h-12 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : totalConnections === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                    No suspended connections found
                  </TableCell>
                </TableRow>
              ) : (
                visibleConnections.map((connection) => {
                  const daysSuspended = differenceInDays(new Date(), new Date(connection.suspended_at!));
                  const isAuto = connection.suspension_history?.[0]?.is_automated;
                  const reasonNotes = getReasonNotes(connection);
                  
                  return (
                    <TableRow key={connection.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedConnections.includes(connection.id)}
                          onCheckedChange={() => toggleSelection(connection.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono">{connection.box_number}</TableCell>
                      <TableCell className="font-medium">{connection.customer?.name}</TableCell>
                      <TableCell>{connection.customer?.phone}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={reasonBadgeColor(connection.suspension_reason || "other")}>
                          {connection.suspension_reason?.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[220px] whitespace-pre-wrap text-sm text-muted-foreground">
                        {reasonNotes || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(connection.suspended_at!), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={daysSuspended > 7 ? "destructive" : "secondary"}>
                          {daysSuspended}d
                        </Badge>
                      </TableCell>
                      <TableCell className={Number(connection.current_balance) > 5000 ? "text-red-600 font-semibold" : ""}>
                        LKR{Number(connection.current_balance).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {connection.customer?.area?.name || connection.customer?.billing_group?.area?.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isAuto ? "default" : "outline"}>
                          {isAuto ? "Auto" : "Manual"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedConnectionId(connection.id);
                              setResumeDialogOpen(true);
                            }}
                            className="gap-1"
                          >
                            <PlayCircle className="w-3 h-3" />
                            Resume
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedConnectionId(connection.id);
                              setHistoryDialogOpen(true);
                            }}
                          >
                            <History className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedConnectionId(connection.id);
                              setSmsDialogOpen(true);
                            }}
                          >
                            <Phone className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ResumeDialog
        open={resumeDialogOpen}
        onOpenChange={setResumeDialogOpen}
        connectionIds={selectedConnectionId ? [selectedConnectionId] : selectedConnections}
        onSuccess={() => {
          setSelectedConnections([]);
          setSelectedConnectionId(null);
        }}
      />

      <SuspensionHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        connectionId={selectedConnectionId || ""}
      />

      <SendSMSDialog
        open={smsDialogOpen}
        onOpenChange={setSmsDialogOpen}
      />
    </div>
  );
};

export default Suspensions;
