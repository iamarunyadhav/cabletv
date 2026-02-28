import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isSameMonth } from "date-fns";
import { toast } from "sonner";
import { Money } from "@/components/common/Money";
import { PlusCircle, FileText, Wallet, TrendingDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { DEFAULT_PAGE_SIZE } from "@/constants/pagination";

interface SupplierForm {
  name: string;
  code: string;
  contact_person: string;
  phone: string;
  email: string;
  billing_email: string;
  billing_cycle_start: string;
  billing_cycle_end: string;
  contract_amount: string;
  notes: string;
  address: string;
}

interface BillForm {
  supplier_id: string;
  amount_due: string;
  period_start: string;
  period_end: string;
  due_date: string;
  reference_number: string;
  description: string;
}

interface PaymentForm {
  supplier_id: string;
  supplier_bill_id: string;
  amount: string;
  payment_date: string;
  payment_method: string;
  reference_number: string;
  notes: string;
}

const defaultSupplierForm: SupplierForm = {
  name: "",
  code: "",
  contact_person: "",
  phone: "",
  email: "",
  billing_email: "",
  billing_cycle_start: "",
  billing_cycle_end: "",
  contract_amount: "",
  notes: "",
  address: "",
};

const defaultBillForm: BillForm = {
  supplier_id: "",
  amount_due: "",
  period_start: "",
  period_end: "",
  due_date: "",
  reference_number: "",
  description: "",
};

const defaultPaymentForm: PaymentForm = {
  supplier_id: "",
  supplier_bill_id: "",
  amount: "",
  payment_date: new Date().toISOString().slice(0, 10),
  payment_method: "bank_transfer",
  reference_number: "",
  notes: "",
};

const Suppliers = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [supplierForm, setSupplierForm] = useState<SupplierForm>(defaultSupplierForm);
  const [billForm, setBillForm] = useState<BillForm>(defaultBillForm);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(defaultPaymentForm);
  const [supplierPage, setSupplierPage] = useState(1);
  const [billPage, setBillPage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const PAGE_SIZE = DEFAULT_PAGE_SIZE;

  const { data: suppliers, isLoading: suppliersLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const response = await apiClient.get("/suppliers");
      return response.data?.data ?? response.data ?? [];
    },
  });

  const { data: bills, isLoading: billsLoading } = useQuery({
    queryKey: ["supplier-bills"],
    queryFn: async () => {
      const response = await apiClient.get("/supplier-bills");
      return response.data?.data ?? response.data ?? [];
    },
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["supplier-payments"],
    queryFn: async () => {
      const response = await apiClient.get("/supplier-payments");
      return response.data?.data ?? response.data ?? [];
    },
  });

  const supplierCount = suppliers?.length ?? 0;
  const billsCount = bills?.length ?? 0;
  const paymentsCount = payments?.length ?? 0;

  useEffect(() => {
    setSupplierPage(1);
  }, [supplierCount]);

  useEffect(() => {
    setBillPage(1);
  }, [billsCount]);

  useEffect(() => {
    setPaymentPage(1);
  }, [paymentsCount]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(supplierCount / PAGE_SIZE) || 1);
    if (supplierPage > maxPage) {
      setSupplierPage(maxPage);
    }
  }, [supplierPage, supplierCount, PAGE_SIZE]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(billsCount / PAGE_SIZE) || 1);
    if (billPage > maxPage) {
      setBillPage(maxPage);
    }
  }, [billPage, billsCount, PAGE_SIZE]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(paymentsCount / PAGE_SIZE) || 1);
    if (paymentPage > maxPage) {
      setPaymentPage(maxPage);
    }
  }, [paymentPage, paymentsCount, PAGE_SIZE]);

  const totals = useMemo(() => {
    const outstanding =
      suppliers?.reduce((sum: number, supplier: any) => sum + Number(supplier.outstanding_balance ?? 0), 0) || 0;

    const monthDue =
      suppliers?.reduce((sum: number, supplier: any) => sum + Number(supplier.month_due ?? 0), 0) || 0;

    const monthPaid =
      suppliers?.reduce((sum: number, supplier: any) => sum + Number(supplier.month_paid ?? 0), 0) || 0;

    return { outstanding, monthDue, monthPaid };
  }, [suppliers]);

  const toSupplierPayload = (payload: SupplierForm) => ({
    name: payload.name,
    code: payload.code || null,
    contact_person: payload.contact_person || null,
    phone: payload.phone || null,
    email: payload.email || null,
    billing_email: payload.billing_email || null,
    billing_cycle_start: payload.billing_cycle_start ? Number(payload.billing_cycle_start) : null,
    billing_cycle_end: payload.billing_cycle_end ? Number(payload.billing_cycle_end) : null,
    contract_amount: payload.contract_amount ? Number(payload.contract_amount) : 0,
    notes: payload.notes || null,
    address: payload.address || null,
  });

  const createSupplierMutation = useMutation({
    mutationFn: async (payload: SupplierForm) => {
      await apiClient.post("/suppliers", toSupplierPayload(payload));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Supplier added");
      setSupplierDialogOpen(false);
      setSupplierForm(defaultSupplierForm);
    },
    onError: (error) => toast.error(error.message),
  });

  const updateSupplierMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: SupplierForm }) => {
      await apiClient.put(`/suppliers/${id}`, toSupplierPayload(payload));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Supplier updated");
      setSupplierDialogOpen(false);
      setSupplierForm(defaultSupplierForm);
      setEditingSupplierId(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const createBillMutation = useMutation({
    mutationFn: async (payload: BillForm) => {
      await apiClient.post("/supplier-bills", {
        supplier_id: payload.supplier_id,
        reference_number: payload.reference_number || `BILL-${Date.now()}`,
        amount_due: Number(payload.amount_due),
        period_start: payload.period_start || null,
        period_end: payload.period_end || null,
        due_date: payload.due_date || new Date().toISOString().split("T")[0],
        description: payload.description || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-bills"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Supplier bill recorded");
      setBillDialogOpen(false);
      setBillForm(defaultBillForm);
    },
    onError: (error) => toast.error(error.message),
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (payload: PaymentForm) => {
      await apiClient.post("/supplier-payments", {
        supplier_id: payload.supplier_id,
        supplier_bill_id: payload.supplier_bill_id || null,
        amount: Number(payload.amount),
        payment_date: payload.payment_date,
        payment_method: payload.payment_method || "bank_transfer",
        reference_number: payload.reference_number || null,
        notes: payload.notes || null,
        recorded_by: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-payments"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-bills"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Payment recorded");
      setPaymentDialogOpen(false);
      setPaymentForm(defaultPaymentForm);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: async (supplierId: string) => {
      await apiClient.delete(`/suppliers/${supplierId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Supplier deleted");
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteBillMutation = useMutation({
    mutationFn: async (billId: string) => {
      await apiClient.delete(`/supplier-bills/${billId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-bills"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Bill deleted");
    },
    onError: (error) => toast.error(error.message),
  });

  const markBillPaidMutation = useMutation({
    mutationFn: async (bill: any) => {
      await apiClient.put(`/supplier-bills/${bill.id}`, {
        bill_number: bill.bill_number || null,
        reference_number: bill.reference_number || null,
        bill_date: bill.bill_date || null,
        period_start: bill.period_start || null,
        period_end: bill.period_end || null,
        due_date: bill.due_date || new Date().toISOString().slice(0, 10),
        amount_due: bill.amount_due,
        amount_paid: bill.amount_due,
        status: "paid",
        description: bill.description || null,
        notes: bill.notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-bills"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-payments"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Bill marked as paid");
    },
    onError: (error) => toast.error(error.message),
  });

  const supplierOptions = suppliers || [];
  const billsForSelectedSupplier = useMemo(() => {
    if (!paymentForm.supplier_id) return [];
    return (
      bills?.filter((bill) => bill.supplier_id === paymentForm.supplier_id) || []
    );
  }, [paymentForm.supplier_id, bills]);

  const handleSupplierSubmit = () => {
    if (editingSupplierId) {
      updateSupplierMutation.mutate({ id: editingSupplierId, payload: supplierForm });
    } else {
      createSupplierMutation.mutate(supplierForm);
    }
  };

  const openCreateSupplier = () => {
    setEditingSupplierId(null);
    setSupplierForm(defaultSupplierForm);
    setSupplierDialogOpen(true);
  };

  const startEditSupplier = (supplier: any) => {
    setEditingSupplierId(supplier.id);
    setSupplierForm({
      name: supplier.name || "",
      code: supplier.code || "",
      contact_person: supplier.contact_person || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      billing_email: supplier.billing_email || "",
      billing_cycle_start: supplier.billing_cycle_start ? String(supplier.billing_cycle_start) : "",
      billing_cycle_end: supplier.billing_cycle_end ? String(supplier.billing_cycle_end) : "",
      contract_amount: supplier.contract_amount ? String(supplier.contract_amount) : "",
      notes: supplier.notes || "",
      address: supplier.address || "",
    });
    setSupplierDialogOpen(true);
  };

  const handleDeleteSupplier = (supplier: any) => {
    const confirmed = window.confirm(`Delete supplier "${supplier.name}"? This cannot be undone.`);
    if (confirmed) {
      deleteSupplierMutation.mutate(supplier.id);
    }
  };

  const handleDeleteBill = (bill: any) => {
    const confirmed = window.confirm("Delete this supplier bill?");
    if (confirmed) {
      deleteBillMutation.mutate(bill.id);
    }
  };

  const handleMarkBillPaid = (bill: any) => {
    markBillPaidMutation.mutate(bill);
  };

  const outstandingBySupplier = useMemo(() => {
    const map = new Map<string, number>();
    suppliers?.forEach((supplier: any) => {
      map.set(supplier.id, Number(supplier.outstanding_balance ?? 0));
    });
    return map;
  }, [suppliers]);

  const isSavingSupplier = createSupplierMutation.isPending || updateSupplierMutation.isPending;

  const renderSupplierTable = () => {
    if (suppliersLoading) {
      return (
        <div className="space-y-2">
          {[1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-14 w-full" />
          ))}
        </div>
      );
    }

    if (!suppliers || suppliers.length === 0) {
      return <div className="py-10 text-center text-muted-foreground">No suppliers yet</div>;
    }

    const totalPages = Math.max(1, Math.ceil(supplierCount / PAGE_SIZE) || 1);
    const startIndex = (supplierPage - 1) * PAGE_SIZE;
    const visibleSuppliers = suppliers.slice(startIndex, startIndex + PAGE_SIZE);
    const showingFrom = supplierCount === 0 ? 0 : startIndex + 1;
    const showingTo = Math.min(supplierCount, startIndex + visibleSuppliers.length);

    return (
      <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Billing Cycle</TableHead>
              <TableHead>Monthly Contract</TableHead>
              <TableHead>Outstanding</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleSuppliers.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-semibold">{supplier.name}</span>
                    {supplier.code && (
                      <span className="text-xs text-muted-foreground">Code: {supplier.code}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col text-sm">
                    {supplier.contact_person && <span>{supplier.contact_person}</span>}
                    {supplier.phone && (
                      <span className="text-muted-foreground">{supplier.phone}</span>
                    )}
                    {supplier.email && (
                      <span className="text-muted-foreground">{supplier.email}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {supplier.billing_cycle_start && supplier.billing_cycle_end ? (
                    <span className="text-xs text-muted-foreground">
                      {supplier.billing_cycle_start} - {supplier.billing_cycle_end}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">N/A</span>
                  )}
                </TableCell>
                <TableCell>
                  <Money amount={Number(supplier.contract_amount || 0)} />
                </TableCell>
                <TableCell>
                  <Money amount={outstandingBySupplier.get(supplier.id) ?? 0} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setBillForm((prev) => ({ ...prev, supplier_id: supplier.id }));
                        setBillDialogOpen(true);
                      }}
                    >
                      Add Bill
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setPaymentForm((prev) => ({ ...prev, supplier_id: supplier.id }));
                        setPaymentDialogOpen(true);
                      }}
                    >
                      Pay
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEditSupplier(supplier)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleDeleteSupplier(supplier)}
                      disabled={deleteSupplierMutation.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex flex-col gap-4 border-t pt-4 mt-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {`${showingFrom} - ${showingTo}`} of {supplierCount} suppliers
          </p>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              disabled={supplierPage <= 1}
              onClick={() => setSupplierPage((prev) => Math.max(1, prev - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={supplierPage >= totalPages}
              onClick={() => setSupplierPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </>
    );
  };

  const renderBillsCard = () => {
    if (billsLoading) {
      return <Skeleton className="h-40 w-full" />;
    }

    if (!bills || bills.length === 0) {
      return (
        <div className="py-6 text-center text-sm text-muted-foreground">
          No supplier bills yet.
        </div>
      );
    }

    const totalPages = Math.max(1, Math.ceil(billsCount / PAGE_SIZE) || 1);
    const startIndex = (billPage - 1) * PAGE_SIZE;
    const visibleBills = bills.slice(startIndex, startIndex + PAGE_SIZE);
    const showingFrom = billsCount === 0 ? 0 : startIndex + 1;
    const showingTo = Math.min(billsCount, startIndex + visibleBills.length);

    return (
      <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleBills.map((bill: any) => (
              <TableRow key={bill.id}>
                <TableCell className="font-medium">{bill.supplier?.name}</TableCell>
                <TableCell>{bill.reference_number || bill.bill_number || "-"}</TableCell>
                <TableCell>{bill.due_date ? format(new Date(bill.due_date), "MMM d, yyyy") : "-"}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      bill.status === "paid"
                        ? "default"
                        : bill.status === "overdue"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {bill.status || (bill.is_overdue ? "overdue" : "pending")}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Money amount={Number(bill.amount_due || 0)} />
                </TableCell>
                <TableCell className="text-right">
                  <Money amount={Math.max(Number(bill.amount_due || 0) - Number(bill.amount_paid || 0), 0)} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMarkBillPaid(bill)}
                      disabled={markBillPaidMutation.isPending || bill.status === "paid"}
                    >
                      Mark Paid
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleDeleteBill(bill)}
                      disabled={deleteBillMutation.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex flex-col gap-4 border-t pt-4 mt-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {`${showingFrom} - ${showingTo}`} of {billsCount} bills
          </p>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              disabled={billPage <= 1}
              onClick={() => setBillPage((prev) => Math.max(1, prev - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={billPage >= totalPages}
              onClick={() => setBillPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </>
    );
  };

  const renderPaymentsCard = () => {
    if (paymentsLoading) {
      return <Skeleton className="h-40 w-full" />;
    }

    if (!payments || payments.length === 0) {
      return <div className="py-6 text-center text-sm text-muted-foreground">No payments recorded.</div>;
    }

    const totalPages = Math.max(1, Math.ceil(paymentsCount / PAGE_SIZE) || 1);
    const startIndex = (paymentPage - 1) * PAGE_SIZE;
    const visiblePayments = payments.slice(startIndex, startIndex + PAGE_SIZE);
    const showingFrom = paymentsCount === 0 ? 0 : startIndex + 1;
    const showingTo = Math.min(paymentsCount, startIndex + visiblePayments.length);

    return (
      <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiblePayments.map((payment: any) => (
              <TableRow key={payment.id}>
                <TableCell>{format(new Date(payment.payment_date), "MMM d, yyyy")}</TableCell>
                <TableCell>{payment.supplier?.name}</TableCell>
                <TableCell>{payment.payment_method || "-"}</TableCell>
                <TableCell>{payment.reference_number || payment.bill?.reference_number || "-"}</TableCell>
                <TableCell className="text-right">
                  <Money amount={Number(payment.amount || 0)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex flex-col gap-4 border-t pt-4 mt-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {`${showingFrom} - ${showingTo}`} of {paymentsCount} payments
          </p>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              disabled={paymentPage <= 1}
              onClick={() => setPaymentPage((prev) => Math.max(1, prev - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={paymentPage >= totalPages}
              onClick={() => setPaymentPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Supplier Finance</h1>
          <p className="text-sm text-muted-foreground">Track monthly dues, outgoing payments, and supplier balances.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openCreateSupplier} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Add Supplier
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setBillForm(defaultBillForm);
              setBillDialogOpen(true);
            }}
          >
            <FileText className="h-4 w-4 mr-1" />
            Add Bill
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setPaymentForm(defaultPaymentForm);
              setPaymentDialogOpen(true);
            }}
          >
            <TrendingDown className="h-4 w-4 mr-1" />
            Record Payment
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Money amount={totals.outstanding} />
            </div>
            <p className="text-xs text-muted-foreground">Total payable across all suppliers.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due this Month</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Money amount={totals.monthDue} />
            </div>
            <p className="text-xs text-muted-foreground">Bills expected for the current month.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payments this Month</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Money amount={totals.monthPaid} />
            </div>
            <p className="text-xs text-muted-foreground">Outgoing payments already processed.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Suppliers</CardTitle>
        </CardHeader>
        <CardContent>{renderSupplierTable()}</CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Bills</CardTitle>
          </CardHeader>
          <CardContent>{renderBillsCard()}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>{renderPaymentsCard()}</CardContent>
        </Card>
      </div>

      {/* Create Supplier Dialog */}
      <Dialog open={supplierDialogOpen} onOpenChange={(open) => {
        setSupplierDialogOpen(open);
        if (!open) {
          setEditingSupplierId(null);
          setSupplierForm(defaultSupplierForm);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSupplierId ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
            <DialogDescription>Store supplier contract and billing details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input
                value={supplierForm.name}
                onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Code</Label>
              <Input
                value={supplierForm.code}
                onChange={(e) => setSupplierForm({ ...supplierForm, code: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Contact Name</Label>
              <Input
                value={supplierForm.contact_person}
                onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}
              />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Phone</Label>
                <Input
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Billing Email</Label>
                <Input
                  value={supplierForm.billing_email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, billing_email: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Monthly Contract Amount</Label>
                <Input
                  type="number"
                  value={supplierForm.contract_amount}
                  onChange={(e) => setSupplierForm({ ...supplierForm, contract_amount: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Billing Start Day</Label>
                <Input
                  type="number"
                  value={supplierForm.billing_cycle_start}
                  onChange={(e) => setSupplierForm({ ...supplierForm, billing_cycle_start: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Billing End Day</Label>
                <Input
                  type="number"
                value={supplierForm.billing_cycle_end}
                onChange={(e) => setSupplierForm({ ...supplierForm, billing_cycle_end: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Address</Label>
            <Textarea
              value={supplierForm.address}
              onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
              rows={2}
            />
          </div>
          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea
              value={supplierForm.notes}
              onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupplierDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSupplierSubmit}
              disabled={!supplierForm.name || isSavingSupplier}
            >
              {isSavingSupplier ? "Saving..." : editingSupplierId ? "Update Supplier" : "Save Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bill Dialog */}
      <Dialog open={billDialogOpen} onOpenChange={(open) => {
        setBillDialogOpen(open);
        if (!open) setBillForm(defaultBillForm);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Supplier Bill</DialogTitle>
            <DialogDescription>Track an invoice received from a supplier.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label>Supplier *</Label>
              <Select
                value={billForm.supplier_id}
                onValueChange={(value) => setBillForm({ ...billForm, supplier_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {supplierOptions.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Amount *</Label>
              <Input
                type="number"
                value={billForm.amount_due}
                onChange={(e) => setBillForm({ ...billForm, amount_due: e.target.value })}
              />
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>Period Start</Label>
                <Input
                  type="date"
                  value={billForm.period_start}
                  onChange={(e) => setBillForm({ ...billForm, period_start: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Period End</Label>
                <Input
                  type="date"
                  value={billForm.period_end}
                  onChange={(e) => setBillForm({ ...billForm, period_end: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={billForm.due_date}
                  onChange={(e) => setBillForm({ ...billForm, due_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Reference #</Label>
                <Input
                  value={billForm.reference_number}
                  onChange={(e) => setBillForm({ ...billForm, reference_number: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Input
                  value={billForm.description}
                  onChange={(e) => setBillForm({ ...billForm, description: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBillDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createBillMutation.mutate(billForm)}
              disabled={!billForm.supplier_id || !billForm.amount_due || createBillMutation.isPending}
            >
              {createBillMutation.isPending ? "Saving..." : "Save Bill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={(open) => {
        setPaymentDialogOpen(open);
        if (!open) setPaymentForm(defaultPaymentForm);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Supplier Payment</DialogTitle>
            <DialogDescription>Capture outgoing payment details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label>Supplier *</Label>
              <Select
                value={paymentForm.supplier_id}
                onValueChange={(value) =>
                  setPaymentForm({ ...paymentForm, supplier_id: value, supplier_bill_id: "" })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {supplierOptions.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Link to Bill</Label>
              <Select
                value={paymentForm.supplier_bill_id}
                onValueChange={(value) => setPaymentForm({ ...paymentForm, supplier_bill_id: value })}
                disabled={!paymentForm.supplier_id || billsForSelectedSupplier.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {billsForSelectedSupplier.map((bill) => (
                    <SelectItem key={bill.id} value={bill.id}>
                      {bill.bill_number || format(new Date(bill.created_at), "MMM d")} -{" "}
                      <Money amount={Number(bill.amount_due || 0)} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Payment Date</Label>
                <Input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Method</Label>
                <Select
                  value={paymentForm.payment_method}
                  onValueChange={(value) => setPaymentForm({ ...paymentForm, payment_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Reference #</Label>
                <Input
                  value={paymentForm.reference_number}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createPaymentMutation.mutate(paymentForm)}
              disabled={!paymentForm.supplier_id || !paymentForm.amount || createPaymentMutation.isPending}
            >
              {createPaymentMutation.isPending ? "Saving..." : "Save Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Suppliers;
