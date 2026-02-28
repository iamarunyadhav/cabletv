import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Cable, MessageSquare, Eye, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AddConnectionDialog } from "@/components/AddConnectionDialog";
import { SendSMSDialog } from "@/components/SendSMSDialog";
import { EditCustomerDialog } from "@/components/EditCustomerDialog";
import { CustomerFilters, FilterState } from "@/components/CustomerFilters";
import { Money } from "@/components/common/Money";
import { apiClient } from "@/lib/apiClient";
import { DEFAULT_PAGE_SIZE } from "@/constants/pagination";
import { cn } from "@/lib/utils";

interface LookupResponse {
  areas: Array<{ id: string; name: string; code: string }>;
  billing_groups: Array<{ id: string; name: string; area?: { id: string; name: string; code: string } }>;
}

interface ApiConnection {
  id: string;
  box_number: string | null;
  current_balance: number;
  status: string;
  packages?: { name: string; price: number };
}

interface ApiCustomer {
  id: string;
  connection_id: string;
  name: string;
  email?: string;
  phone: string;
  address: string;
  status: string;
  connections?: ApiConnection[];
  billing_group?: { id: string; name: string };
  total_due?: number;
}

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from?: number | null;
  to?: number | null;
}

interface PaginatedResponse<T> {
  data: T[];
  meta?: PaginationMeta;
}

const Customers = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get("search") || "");
  const [addConnectionCustomerId, setAddConnectionCustomerId] = useState<string | null>(null);
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [editCustomerId, setEditCustomerId] = useState<string | null>(null);
  const [deleteCustomerId, setDeleteCustomerId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    areaId: searchParams.get("area_id") || undefined,
    billingGroupId: searchParams.get("billing_group_id") || undefined,
    status: searchParams.get("status") || undefined,
    packageId: searchParams.get("package_id") || undefined,
    dueThreshold: searchParams.get("due_threshold")
      ? Number(searchParams.get("due_threshold"))
      : undefined,
  });
  const [page, setPage] = useState(() => Number(searchParams.get("page") || 1));
  const PAGE_SIZE = DEFAULT_PAGE_SIZE;
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    nic: "",
    address: "",
    billing_group_id: "",
  });
  const [agreementNumber, setAgreementNumber] = useState<string>("");
  const [selectedAreaName, setSelectedAreaName] = useState<string>("");
  const [selectedAreaCode, setSelectedAreaCode] = useState<string>("");
  const [selectedGroupCode, setSelectedGroupCode] = useState<string>("");
  const [connectionPrefix, setConnectionPrefix] = useState<string>("");
  const [connectionNumber, setConnectionNumber] = useState<string>("");
  const [generatedConnectionId, setGeneratedConnectionId] = useState<string>("");

  const { data: lookupData } = useQuery<LookupResponse>({
    queryKey: ["lookups"],
    queryFn: async () => {
      const response = await apiClient.get("/lookups");
      return response.data;
    },
  });

  const billingGroups = lookupData?.billing_groups ?? [];

  const resetGuard = useRef(false);

  useEffect(() => {
    if (!resetGuard.current) {
      resetGuard.current = true;
      return;
    }
    setPage(1);
  }, [searchTerm, filters]);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (searchTerm) params.search = searchTerm;
    if (filters.areaId) params.area_id = filters.areaId;
    if (filters.billingGroupId) params.billing_group_id = filters.billingGroupId;
    if (filters.status) params.status = filters.status;
    if (filters.packageId) params.package_id = filters.packageId;
    if (filters.dueThreshold !== undefined) params.due_threshold = String(filters.dueThreshold);
    params.page = String(page);
    setSearchParams(params, { replace: true });
  }, [searchTerm, filters, page, setSearchParams]);

  const { data: customersResponse, isLoading } = useQuery<PaginatedResponse<ApiCustomer>>({
    queryKey: ["customers", searchTerm, filters, page],
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      if (searchTerm) params.search = searchTerm;
      if (filters.areaId) params.area_id = filters.areaId;
      if (filters.billingGroupId) params.billing_group_id = filters.billingGroupId;
      if (filters.status) params.status = filters.status;
      if (filters.packageId) params.package_id = filters.packageId;
      if (filters.dueThreshold) params.due_threshold = filters.dueThreshold;
      params.per_page = PAGE_SIZE;
      params.page = page;

      const response = await apiClient.get("/customers", { params });
      return response.data;
    },
  });

  const customers = customersResponse?.data ?? [];
  const pagination = customersResponse?.meta;

  const buildPrefix = (areaCode?: string, groupCode?: string) => {
    const parts = [areaCode, groupCode].filter(Boolean);
    return parts.join("-");
  };

  const fetchNextConnectionId = async (billingGroupId: string) => {
    if (!billingGroupId) {
      setGeneratedConnectionId("");
      setConnectionPrefix("");
      setConnectionNumber("");
      return;
    }
    try {
      const response = await apiClient.get("/customers/next-connection-id", {
        params: { billing_group_id: billingGroupId },
      });
      const areaCode = response.data.area_code || "";
      const groupCode = response.data.billing_group_code || "";
      const prefix = response.data.prefix || buildPrefix(areaCode, groupCode);
      setSelectedAreaCode(areaCode);
      setSelectedGroupCode(groupCode);
      setConnectionPrefix(prefix);
      setConnectionNumber(String(response.data.sequence));
      setGeneratedConnectionId(response.data.connection_id);
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Unable to generate connection ID");
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const connectionId =
        generatedConnectionId ||
        (connectionPrefix && connectionNumber
          ? `${connectionPrefix}-${connectionNumber}`
          : "");
      if (!connectionId) {
        throw new Error("Please select a billing group and connection number");
      }
      await apiClient.post("/customers", {
        ...data,
        connection_id: connectionId,
        agreement_number: agreementNumber || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer created successfully!");
      setOpen(false);
      setFormData({
        name: "",
        email: "",
        phone: "",
        nic: "",
        address: "",
        billing_group_id: "",
      });
      setAgreementNumber("");
      setSelectedAreaName("");
      setSelectedAreaCode("");
      setSelectedGroupCode("");
      setConnectionNumber("");
      setConnectionPrefix("");
      setGeneratedConnectionId("");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? error.message ?? "Failed to create customer");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (customerId: string) => {
      await apiClient.delete(`/customers/${customerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer deleted successfully!");
      setDeleteCustomerId(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? "Failed to delete customer");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleBillingGroupSelect = (billingGroupId: string) => {
    const group = billingGroups.find((item) => item.id === billingGroupId);
    setFormData({ ...formData, billing_group_id: billingGroupId });
    setSelectedAreaName(group?.area?.name || "");
    setSelectedAreaCode(group?.area?.code || "");
    setSelectedGroupCode(group?.name ? group.name.toUpperCase().replace(/[^A-Z0-9]/g, "") : "");
    setConnectionPrefix("");
    fetchNextConnectionId(billingGroupId);
  };

  const handleConnectionNumberChange = (value: string) => {
    const sanitized = value.replace(/[^0-9]/g, "");
    setConnectionNumber(sanitized);
    const prefix = connectionPrefix || buildPrefix(selectedAreaCode, selectedGroupCode);
    if (prefix && sanitized) {
      setGeneratedConnectionId(`${prefix}-${sanitized}`);
    } else {
      setGeneratedConnectionId("");
    }
  };

  const handleDelete = () => {
    if (deleteCustomerId) {
      deleteMutation.mutate(deleteCustomerId);
    }
  };

  useEffect(() => {
    const primeAgreementNumber = async () => {
      if (!open) return;
      try {
        const response = await apiClient.get("/customers/agreement-number");
        setAgreementNumber(response.data.agreement_number);
      } catch (error: any) {
        toast.error(error?.response?.data?.agreement_number ?? "Unable to generate agreement number");
      }
    };
    if (open) {
      primeAgreementNumber();
    } else {
      setSelectedAreaName("");
      setSelectedAreaCode("");
      setSelectedGroupCode("");
      setConnectionNumber("");
      setConnectionPrefix("");
      setGeneratedConnectionId("");
    }
  }, [open]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      active: "default",
      inactive: "secondary",
      suspended: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const totalCustomers = pagination?.total ?? customers.length;
  const showingFrom =
    pagination?.from ??
    (customers.length ? (page - 1) * PAGE_SIZE + 1 : 0);
  const showingTo =
    pagination?.to ??
    (customers.length ? (page - 1) * PAGE_SIZE + customers.length : 0);

  const renderConnections = (customer: ApiCustomer) => {
    if (!customer.connections?.length) {
      return <span className="text-sm text-muted-foreground">No connections</span>;
    }
    return (
      <div className="space-y-2">
        {customer.connections?.map((conn) => (
          <div
            key={conn.id}
            className={cn(
              "flex items-center justify-between rounded border px-2 py-1 text-xs",
              (conn.status === "postpone" || conn.box_number === "NO_DATA") &&
                "border-red-200 bg-red-50 text-red-900",
            )}
          >
            <div>
              <p className="font-semibold">{conn.box_number || conn.id}</p>
              <p className="text-muted-foreground">
                {(conn as any).package?.name || (conn as any).packages?.name || "Package"}
              </p>
            </div>
            <div className="text-right">
              <Money amount={Number(conn.current_balance || 0)} />
              <Badge
                variant={
                  conn.status === "postpone" || conn.box_number === "NO_DATA"
                    ? "destructive"
                    : "outline"
                }
                className="ml-2 text-[10px] capitalize"
              >
                {conn.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Customers</h2>
          <p className="text-muted-foreground mt-2">
            Manage your cable TV subscribers ({totalCustomers})
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSmsDialogOpen(true)} className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Send SMS
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Customer</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone *</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>NIC Number</Label>
                    <Input
                      placeholder="National Identity Card Number"
                      value={formData.nic}
                      onChange={(e) => setFormData({ ...formData, nic: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Billing Group *</Label>
                    <Select
                      value={formData.billing_group_id}
                      onValueChange={handleBillingGroupSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                      <SelectContent>
                        {billingGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Area</Label>
                    <Input value={selectedAreaName} readOnly />
                    {selectedAreaCode && (
                      <p className="text-xs text-muted-foreground">Area code: {selectedAreaCode}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Connection Number *</Label>
                    <Input
                      placeholder="e.g., 1"
                      value={connectionNumber}
                      onChange={(e) => handleConnectionNumberChange(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Generated ID:{" "}
                      {generatedConnectionId ||
                        (connectionPrefix
                          ? `${connectionPrefix}-${connectionNumber || "?"}`
                          : "Select billing group + number")}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Agreement Number</Label>
                    <Input
                      value={agreementNumber}
                      onChange={(e) => setAgreementNumber(e.target.value)}
                      placeholder="e.g., AGR-000123"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Address *</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Customer"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <CustomerFilters onFilterChange={setFilters} />

      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search customers by name, ID, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Connection ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Billing Group</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Connections</TableHead>
                  <TableHead className="text-right">Total Due</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => {
                  const totalDue =
                    customer.total_due ??
                    customer.connections?.reduce(
                      (sum, conn) => sum + Number(conn.current_balance || 0),
                      0,
                    ) ??
                    0;

                  const isPlaceholder =
                    customer.connections?.some(
                      (conn) => conn.status === "postpone" || conn.box_number === "NO_DATA",
                    );

                  return (
                    <TableRow
                      key={customer.id}
                      className={cn(isPlaceholder && "bg-red-50/80")}
                    >
                      <TableCell className={cn("font-medium", isPlaceholder && "text-red-900")}>
                        {customer.connection_id}
                      </TableCell>
                      <TableCell className={cn(isPlaceholder && "text-red-900")}>
                        {customer.name}
                      </TableCell>
                      <TableCell className={cn(isPlaceholder && "text-red-900")}>
                        {customer.phone}
                      </TableCell>
                      <TableCell>{customer.billing_group?.name ?? "—"}</TableCell>
                      <TableCell>{getStatusBadge(customer.status)}</TableCell>
                      <TableCell>{renderConnections(customer)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        <Money amount={Number(totalDue)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/dashboard/customers/${customer.id}${
                                  searchParams.toString() ? `?${searchParams.toString()}` : ""
                                }`,
                              )
                            }
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditCustomerId(customer.id)}
                            title="Edit Customer"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setAddConnectionCustomerId(customer.id)}
                            title="Add Connection"
                          >
                            <Cable className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSmsDialogOpen(true)}
                            title="Send SMS"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteCustomerId(customer.id)}
                            title="Delete Customer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {customers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No customers found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
              <div className="flex flex-col gap-4 border-t pt-4 mt-4 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {totalCustomers === 0 ? "0" : `${showingFrom} - ${showingTo}`} of {totalCustomers} customers
                </p>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    disabled={page <= 1 || isLoading}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    disabled={
                      isLoading || (pagination?.current_page ?? page) >= (pagination?.last_page ?? page)
                    }
                    onClick={() =>
                      setPage((prev) =>
                        pagination?.last_page ? Math.min(pagination.last_page, prev + 1) : prev + 1,
                      )
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AddConnectionDialog
        customerId={addConnectionCustomerId || ""}
        open={!!addConnectionCustomerId}
        onOpenChange={(dialogOpen) => !dialogOpen && setAddConnectionCustomerId(null)}
      />

      <EditCustomerDialog
        customerId={editCustomerId}
        open={!!editCustomerId}
        onOpenChange={(dialogOpen) => !dialogOpen && setEditCustomerId(null)}
      />

      <AlertDialog open={!!deleteCustomerId} onOpenChange={(dialogOpen) => !dialogOpen && setDeleteCustomerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this customer? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SendSMSDialog open={smsDialogOpen} onOpenChange={setSmsDialogOpen} />
    </div>
  );
};

export default Customers;
