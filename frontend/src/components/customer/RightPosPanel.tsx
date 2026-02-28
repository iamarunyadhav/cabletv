import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/common/Money";
import { Connection, Invoice } from "@/types/customer";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { PermissionGate } from "@/components/common/PermissionGate";
import { Printer, Send, Wallet } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { printInvoiceDocument, printShortPaymentReceiptDocument } from "@/lib/printHelpers";
import { Separator } from "@/components/ui/separator";
import {
  PAYMENT_METHODS,
  PaymentMethodValue,
  getPaymentMethodLabel,
  methodRequiresReference,
  referencePlaceholder,
} from "@/constants/paymentMethods";

const paymentMethodValues = PAYMENT_METHODS.map((item) => item.value) as [
  PaymentMethodValue,
  ...PaymentMethodValue[],
];

const paymentSchema = z.object({
  date: z.string().min(1, "Date required"),
  amount: z.coerce.number().positive("Amount is required"),
  method: z.enum(paymentMethodValues, { required_error: "Select a method" }),
  connectionId: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  collectorId: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

const SELF_COLLECTOR_VALUE = "self";

const toLocalDateTimeInput = (value: string | Date) => {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "yyyy-MM-dd'T'HH:mm");
};

interface RightPosPanelProps {
  customerId: string;
  connections: Connection[];
  unpaidInvoices: Invoice[];
  onPaymentSuccess?: () => void;
  openSignal?: number;
  showAdjustments?: boolean;
}

export function RightPosPanel({
  customerId,
  connections,
  unpaidInvoices,
  onPaymentSuccess,
  openSignal,
  showAdjustments = true,
}: RightPosPanelProps) {
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      date: toLocalDateTimeInput(new Date()),
      amount: 0,
      method: "cash",
      connectionId: "all",
      referenceNumber: "",
      notes: "",
      collectorId: SELF_COLLECTOR_VALUE,
    },
  });
  const [selectedInvoices, setSelectedInvoices] = useState<Record<string, boolean>>({});
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [autoSendSms, setAutoSendSms] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [batchLines, setBatchLines] = useState<
    Array<{ id: string; label: string; direction: "debit" | "credit"; amount: string; connection_id: string; notes: string }>
  >([
    { id: crypto.randomUUID(), label: "Opening Balance", direction: "debit", amount: "", connection_id: "all", notes: "" },
  ]);
  const [batchMemo, setBatchMemo] = useState("");

  const [printingInvoiceId, setPrintingInvoiceId] = useState<string | null>(null);
  const [printingPaymentId, setPrintingPaymentId] = useState<string | null>(null);

  const { data: agents = [] } = useQuery({
    queryKey: ["payment-agents"],
    queryFn: async () => {
      const response = await apiClient.get("/payment-agents");
      return response.data?.data ?? response.data ?? [];
    },
  });

  const { data: smsAutomationSettings } = useQuery({
    queryKey: ["sms-automation-settings"],
    queryFn: async () => {
      const response = await apiClient.get("/settings", {
        params: { keys: "sms_auto_receipt_enabled" },
      });
      const rows = response.data?.data ?? response.data ?? [];
      const record = Array.isArray(rows)
        ? rows.find((row) => row.key === "sms_auto_receipt_enabled")
        : rows;
      const normalized = String(record?.value ?? "1").trim().toLowerCase();
      const enabled = ["1", "true", "yes", "on"].includes(normalized);
      return { autoReceiptEnabled: enabled };
    },
  });

  const { data: companyInfo } = useQuery({
    queryKey: ["company-info"],
    queryFn: async () => {
      const response = await apiClient.get("/settings", {
        params: { keys: "company_name,company_address,company_phone" },
      });
      const rows = response.data?.data ?? response.data ?? [];
      const lookup = Array.isArray(rows)
        ? rows.reduce<Record<string, string>>((acc, row) => {
            acc[row.key] = String(row.value ?? "");
            return acc;
          }, {})
        : {};
      return {
        name: lookup.company_name || "",
        address: lookup.company_address || "",
        phone: lookup.company_phone || "",
      };
    },
  });

  const receiptAutoSettingInitialized = useRef(false);
  const smsReceiptEnabled = smsAutomationSettings?.autoReceiptEnabled ?? true;
  const selectedMethod = form.watch("method");
  const referenceRequired = methodRequiresReference(selectedMethod);
  const showReferenceInput = selectedMethod !== "cash";
  const referenceInputPlaceholder = referencePlaceholder(selectedMethod);

  useEffect(() => {
    if (!smsReceiptEnabled) {
      setAutoSendSms(false);
      receiptAutoSettingInitialized.current = false;
      return;
    }

    if (!receiptAutoSettingInitialized.current) {
      setAutoSendSms(smsReceiptEnabled);
      receiptAutoSettingInitialized.current = true;
    }
  }, [smsReceiptEnabled]);

  const sendReceiptSmsNotification = async ({
    receipt,
    amount,
    method,
    date,
    balance,
    connectionId,
    intent,
  }: {
    receipt: string;
    amount: number;
    method: string;
    date: string;
    balance: number;
    connectionId?: string | null;
    intent?: "auto" | "manual";
  }) => {
    try {
      const companyName = (companyInfo?.name || import.meta.env.VITE_APP_NAME || "Cable TV").trim();
      const companyContact = [companyInfo?.phone, companyInfo?.address].filter(Boolean).join(" | ");
      const methodLabel = getPaymentMethodLabel(method);
      const receiptLink = `${window.location.origin}/receipt/${receipt}`;

      const connectionLabel =
        connectionId && connectionId !== "all"
          ? connections.find((c) => c.id === connectionId)?.boxNumber || connectionId
          : "All connections";

      const totalOutstanding = connections.reduce((sum, conn) => sum + (Number(conn.connectionBalance) || 0), 0);
      const perConnection = connections
        .map((conn) => `${conn.boxNumber}: LKR ${(Number(conn.connectionBalance) || 0).toFixed(2)}`)
        .slice(0, 3)
        .join("; ");

      const message = `${companyName} - PAYMENT RECEIPT

Receipt: ${receipt}
Date: ${format(new Date(date), "dd/MM/yyyy")}
Amount: LKR ${amount.toFixed(2)}
Method: ${methodLabel}
Connection: ${connectionLabel}
Paid for: ${perConnection || connectionLabel}
Outstanding (all): LKR ${totalOutstanding.toFixed(2)}
Balance after payment: LKR ${balance.toFixed(2)}
${companyContact ? `Contact: ${companyContact}` : ""}

View receipt: ${receiptLink}

Thank you!`;

      if (!smsReceiptEnabled && intent !== "manual") {
        return;
      }

      await apiClient.post("/sms/send", {
        customers: [customerId],
        message,
        type: "payment_receipt",
      });

      if (intent === "manual") {
        toast({
          title: "Receipt SMS sent",
          description: `Receipt ${receipt} shared with the customer.`,
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "SMS delivery failed",
        description: (error as Error).message || "Unable to send receipt SMS",
        variant: "destructive",
      });
    }
  };

  const paymentMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await apiClient.post(`/customers/${customerId}/payments`, {
        payment_date: payload.date,
        amount: payload.amount,
        payment_method: payload.method,
        connection_id: payload.connectionId === "all" ? null : payload.connectionId,
        reference_number: payload.reference_number ?? null,
        notes: payload.notes || undefined,
        collector_id:
          !payload.collectorId || payload.collectorId === SELF_COLLECTOR_VALUE
            ? null
            : payload.collectorId,
        allocations: payload.allocations || [],
      });
      return response.data;
    },
    onSuccess: async (data, variables) => {
      const receipt = data?.receipt_number || data?.receipt || `RCPT-${Date.now()}`;
      if (variables?.sendSms) {
        await sendReceiptSmsNotification({
          receipt,
          amount: variables.amount,
          method: variables.method,
          date: variables.date,
          balance: data?.balance_after ?? 0,
          connectionId: variables.connectionId,
          intent: variables.smsIntent,
        });
      }

      toast({ title: "Payment recorded", description: "Payment saved successfully" });
      form.reset({
        date: toLocalDateTimeInput(new Date()),
        amount: 0,
        method: "cash",
        connectionId: "all",
        referenceNumber: "",
        notes: "",
        collectorId: SELF_COLLECTOR_VALUE,
      });
      setAllocations({});
      setSelectedInvoices({});
      queryClient.invalidateQueries({ queryKey: ["customer", customerId], exact: false });
      queryClient.invalidateQueries({ queryKey: ["customer-ledger", customerId], exact: false });
      queryClient.invalidateQueries({ queryKey: ["customer-invoices", customerId], exact: false });
      queryClient.invalidateQueries({ queryKey: ["customer-payments", customerId], exact: false });
      onPaymentSuccess?.();

      if (variables?.print && data?.id) {
        await handleShortReceiptPrint(data.id);
      }
    },
    onError: (error: Error) => {
      toast({ title: "Payment failed", description: error.message, variant: "destructive" });
    },
  });

  const accountBatchMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await apiClient.post(`/customers/${customerId}/account-batches`, payload);
      return response.data;
    },
    onSuccess: () => {
      toast({ title: "Adjustments saved", description: "Account adjustments recorded." });
      queryClient.invalidateQueries({ queryKey: ["customer", customerId], exact: false });
      queryClient.invalidateQueries({ queryKey: ["customer-ledger", customerId], exact: false });
      setBatchLines([
        { id: crypto.randomUUID(), label: "Opening Balance", direction: "debit", amount: "", connection_id: "all", notes: "" },
      ]);
      setBatchMemo("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save adjustments", description: error.message, variant: "destructive" });
    },
  });

  const amount = form.watch("amount") || 0;
  const totalAllocated = useMemo(
    () =>
      Object.entries(allocations).reduce((sum, [invoiceId, value]) => {
        if (!selectedInvoices[invoiceId]) return sum;
        return sum + (Number(value) || 0);
      }, 0),
    [allocations, selectedInvoices]
  );

  const remaining = Math.max(amount - totalAllocated, 0);
  const overAllocated = totalAllocated > amount;

  const batchTotals = batchLines.reduce(
    (acc, line) => {
      const val = Number(line.amount) || 0;
      if (line.direction === "debit") acc.debit += val;
      else acc.credit += val;
      return acc;
    },
    { debit: 0, credit: 0 }
  );
  const batchNet = batchTotals.debit - batchTotals.credit;

  const toggleInvoice = (invoiceId: string) => {
    setSelectedInvoices((prev) => ({
      ...prev,
      [invoiceId]: !prev[invoiceId],
    }));
    setAllocations((prev) => {
      const invoice = unpaidInvoices.find((inv) => inv.id === invoiceId);
      if (!invoice) return prev;
      const currentlySelected = selectedInvoices[invoiceId];
      if (currentlySelected) {
        const next = { ...prev };
        delete next[invoiceId];
        return next;
      }
      return {
        ...prev,
        [invoiceId]: Number(invoice.balanceDue.toFixed(2)),
      };
    });
  };

  const handleAllocationChange = (invoiceId: string, value: string) => {
    const numericValue = Number(value) || 0;
    setAllocations((prev) => ({
      ...prev,
      [invoiceId]: numericValue,
    }));
  };

  const updateBatchLine = (id: string, key: keyof (typeof batchLines)[number], value: string) => {
    setBatchLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, [key]: value } : line))
    );
  };

  const addBatchLine = () => {
    setBatchLines((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label: "", direction: "debit", amount: "", connection_id: "all", notes: "" },
    ]);
  };

  const removeBatchLine = (id: string) => {
    setBatchLines((prev) => (prev.length <= 1 ? prev : prev.filter((line) => line.id !== id)));
  };

  const submitBatch = () => {
    const payloadLines = batchLines
      .filter((line) => Number(line.amount) > 0 && line.label.trim())
      .map((line) => ({
        label: line.label,
        direction: line.direction,
        amount: Number(line.amount),
        connection_id: line.connection_id === "all" ? null : line.connection_id,
        notes: line.notes || null,
      }));

    if (!payloadLines.length) {
      toast({
        title: "No adjustments",
        description: "Add at least one debit or credit line.",
        variant: "destructive",
      });
      return;
    }

    accountBatchMutation.mutate({
      batch_date: new Date().toISOString().slice(0, 10),
      memo: batchMemo || undefined,
      lines: payloadLines,
    });
  };

  const submitPayment = async (options?: {
    sendSms?: boolean;
    smsIntent?: "auto" | "manual";
    print?: boolean;
    printVariant?: "short" | "full";
  }) => {
    await form.handleSubmit((values) => {
      if (overAllocated) {
        toast({
          title: "Invalid allocation",
          description: "Allocated amounts exceed payment amount.",
          variant: "destructive",
        });
        return;
      }

      const selectedAllocations = Object.entries(allocations)
        .filter(([invoiceId, value]) => selectedInvoices[invoiceId] && value > 0)
        .map(([invoiceId, value]) => ({
          invoice_id: invoiceId,
          amount: Number(value),
        }));

      const paymentDate = new Date(values.date);
      if (Number.isNaN(paymentDate.getTime())) {
        toast({
          title: "Invalid date & time",
          description: "Please pick a valid payment date and time before saving.",
          variant: "destructive",
        });
        return;
      }

      const trimmedReference = values.referenceNumber?.trim() || "";
      if (methodRequiresReference(values.method) && !trimmedReference) {
        toast({
          title: "Cheque number needed",
          description: "Add the cheque number before saving this payment.",
          variant: "destructive",
        });
        return;
      }

      paymentMutation.mutate({
        date: values.date,
        amount: values.amount,
        method: values.method,
        connectionId: values.connectionId,
        reference_number: trimmedReference || undefined,
        notes: values.notes,
        collectorId: values.collectorId,
        allocations: selectedAllocations,
        sendSms: options?.sendSms ?? autoSendSms,
        smsIntent: options?.smsIntent ?? (autoSendSms ? "auto" : undefined),
        print: options?.print ?? false,
        printVariant: options?.printVariant ?? "short",
      });
    })();
  };

  const quickSendSms = async (invoice: Invoice) => {
    try {
      await apiClient.post("/sms/send", {
        customers: [customerId],
        message: `Invoice ${invoice.invoiceNumber} outstanding balance LKR ${invoice.balanceDue.toFixed(
          2,
        )}. Please pay to avoid suspension.`,
        type: "invoice",
      });
      toast({ title: "SMS sent" });
    } catch (error) {
      toast({
        title: "Unable to send SMS",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleInvoicePrint = async (invoiceId: string) => {
    try {
      setPrintingInvoiceId(invoiceId);
      await printInvoiceDocument(invoiceId);
    } catch (error) {
      toast({
        title: "Unable to print invoice",
        description: (error as Error).message ?? "Failed to generate invoice PDF.",
        variant: "destructive",
      });
    } finally {
      setPrintingInvoiceId(null);
    }
  };

  const handleShortReceiptPrint = async (paymentId: string) => {
    try {
      setPrintingPaymentId(paymentId);
      const totalOutstanding = connections.reduce((sum, conn) => sum + (Number(conn.connectionBalance) || 0), 0);
      await printShortPaymentReceiptDocument(paymentId, {
        connections,
        totalBalance: totalOutstanding,
      });
    } catch (error) {
      toast({
        title: "Unable to print receipt",
        description: (error as Error).message ?? "Failed to generate receipt PDF.",
        variant: "destructive",
      });
    } finally {
      setPrintingPaymentId(null);
    }
  };

  useEffect(() => {
    if (openSignal === undefined) return;
    if (isMobile) {
      setSheetOpen(true);
    } else {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [openSignal, isMobile]);

  const content = (
    <Card className="border-2 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wallet className="h-4 w-4 text-primary" />
          Quick POS Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form className="space-y-3">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date & Time</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (LKR)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Method</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showReferenceInput && (
              <FormField
                control={form.control}
                name="referenceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Reference / Cheque Number {referenceRequired ? <span className="text-destructive">*</span> : null}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={referenceInputPlaceholder} />
                    </FormControl>
                    <FormDescription>
                      {referenceRequired
                        ? "Cheque payments need a cheque number."
                        : "Add bank/transaction details (optional)."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="collectorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Collector / Agent</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || SELF_COLLECTOR_VALUE}
                    disabled={!agents.length}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={agents.length ? "Select collector" : "Add an agent first"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={SELF_COLLECTOR_VALUE}>Counter / Self</SelectItem>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name} {agent.code ? `(${agent.code})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {agents.length
                      ? "Tag the collector handling this payment."
                      : "Create a payment agent to start tracking collectors."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="connectionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Connection (optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="All connections" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">All connections</SelectItem>
                      {connections.map((connection) => (
                        <SelectItem key={connection.id} value={connection.id}>
                          {connection.boxNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Payment notes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <div className="rounded-lg border border-dashed p-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Receipt SMS</p>
                <p className="text-xs text-muted-foreground">
                  {!smsReceiptEnabled
                    ? "Payment receipt SMS is disabled in SMS Automation settings."
                    : autoSendSms
                      ? "Every save/print action will automatically send the receipt."
                      : "Keep it off to send SMS only when you click Save & SMS."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Auto</span>
                <Switch
                  checked={autoSendSms}
                  onCheckedChange={setAutoSendSms}
                  disabled={!smsReceiptEnabled}
                  aria-label="Toggle auto receipt SMS"
                />
              </div>
            </div>
        </div>

        {unpaidInvoices.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Allocate to invoices</Label>
              <span className={`text-xs ${overAllocated ? "text-destructive" : "text-muted-foreground"}`}>
                Remaining: <Money amount={remaining} />
              </span>
            </div>
            <ScrollArea className="h-48 rounded-md border">
              <div className="divide-y">
                {unpaidInvoices.map((invoice) => {
                  const outstanding = invoice.balanceDue;
                  return (
                    <div key={invoice.id} className="flex flex-col gap-2 p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{invoice.invoiceNumber}</div>
                          <div className="text-xs text-muted-foreground">
                            {invoice.period || format(new Date(invoice.date), "MMM yyyy")}
                          </div>
                        </div>
                        <Badge variant="outline">
                          <Money amount={outstanding} />
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`invoice-${invoice.id}`}
                          checked={!!selectedInvoices[invoice.id]}
                          onCheckedChange={() => toggleInvoice(invoice.id)}
                        />
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          disabled={!selectedInvoices[invoice.id]}
                          value={allocations[invoice.id] ?? ""}
                          onChange={(event) => handleAllocationChange(invoice.id, event.target.value)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        <div className="space-y-2">
          <PermissionGate required="payments.create">
            <Button className="w-full" onClick={() => submitPayment()} disabled={paymentMutation.isPending}>
              Save Payment
            </Button>
          </PermissionGate>
          <PermissionGate required="payments.create">
            <Button
              className="w-full"
              variant="outline"
              onClick={() => submitPayment({ print: true, printVariant: "short" })}
              disabled={paymentMutation.isPending || Boolean(printingPaymentId)}
            >
              <Printer className="mr-2 h-4 w-4" />
              Save &amp; Print
            </Button>
          </PermissionGate>
          {!autoSendSms && (
            <PermissionGate required="payments.create">
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => {
                  if (!smsReceiptEnabled) {
                    toast({
                      title: "Receipt SMS disabled",
                      description: "Enable Payment Receipt SMS from the dashboard before sending.",
                    });
                    return;
                  }
                  submitPayment({ sendSms: true, smsIntent: "manual" });
                }}
                disabled={paymentMutation.isPending}
              >
                Save &amp; SMS
              </Button>
            </PermissionGate>
          )}
        </div>

        {showAdjustments && (
          <>
            <Separator className="my-4" />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Account Adjustments / Opening Balances</h4>
                <Button size="sm" variant="outline" onClick={addBatchLine}>
                  Add Line
                </Button>
              </div>
              <div className="space-y-3">
                {batchLines.map((line) => (
                  <div key={line.id} className="grid grid-cols-1 gap-2 rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs">Label</Label>
                      {batchLines.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removeBatchLine(line.id)}>
                          Remove
                        </Button>
                      )}
                    </div>
                    <Input
                      value={line.label}
                      onChange={(e) => updateBatchLine(line.id, "label", e.target.value)}
                      placeholder="Opening Balance / Penalty / Discount"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Direction</Label>
                        <Select
                          value={line.direction}
                          onValueChange={(val) => updateBatchLine(line.id, "direction", val as "debit" | "credit")}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="debit">Debit (Increase)</SelectItem>
                            <SelectItem value="credit">Credit (Decrease)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Amount</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={line.amount}
                          onChange={(e) => updateBatchLine(line.id, "amount", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Apply to</Label>
                        <Select
                          value={line.connection_id}
                          onValueChange={(val) => updateBatchLine(line.id, "connection_id", val)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All / auto</SelectItem>
                            {connections.map((conn) => (
                              <SelectItem key={conn.id} value={conn.id}>
                                {conn.boxNumber ?? conn.id.slice(0, 6)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Notes</Label>
                        <Input
                          value={line.notes}
                          onChange={(e) => updateBatchLine(line.id, "notes", e.target.value)}
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>Debit total</span>
                  <Money amount={batchTotals.debit} />
                </div>
                <div className="flex items-center justify-between">
                  <span>Credit total</span>
                  <Money amount={batchTotals.credit} />
                </div>
                <div className="flex items-center justify-between font-semibold">
                  <span>Net effect</span>
                  <Money amount={batchNet} />
                </div>
                <div className="mt-2">
                  <Label className="text-xs">Memo</Label>
                  <Input
                    value={batchMemo}
                    onChange={(e) => setBatchMemo(e.target.value)}
                    placeholder="Opening balance / corrections"
                  />
                </div>
                <div className="mt-3 flex gap-2">
                  <Button className="w-full" variant="secondary" onClick={submitBatch} disabled={accountBatchMutation.isPending}>
                    Save Adjustments
                  </Button>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() =>
                      setBatchLines([
                        { id: crypto.randomUUID(), label: "Opening Balance", direction: "debit", amount: "", connection_id: "all", notes: "" },
                      ])
                    }
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">Top unpaid invoices</h4>
          <div className="space-y-2">
            {unpaidInvoices.slice(0, 5).map((invoice) => (
              <div
                key={`quick-${invoice.id}`}
                className="flex items-center justify-between rounded-md border p-2 text-sm"
              >
                <div>
                  <div className="font-semibold">{invoice.invoiceNumber}</div>
                  <div className="text-xs text-muted-foreground">
                    {invoice.period || format(new Date(invoice.date), "MMM yyyy")}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleInvoicePrint(invoice.id)}
                    disabled={printingInvoiceId === invoice.id}
                  >
                    <Printer className="h-4 w-4" />
                    <span className="sr-only">Print</span>
                  </Button>
                  <PermissionGate required="sms.send">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => quickSendSms(invoice)}
                    >
                      <Send className="h-4 w-4" />
                      <span className="sr-only">Send SMS</span>
                    </Button>
                  </PermissionGate>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isMobile) {
    return (
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button className="w-full">Open POS Panel</Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle>POS Panel</SheetTitle>
            <SheetDescription>Quick payment &amp; invoicing actions</SheetDescription>
          </SheetHeader>
          <div className="mt-4">{content}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div ref={panelRef} className="sticky top-20" id="pos-panel">
      {content}
    </div>
  );
}
