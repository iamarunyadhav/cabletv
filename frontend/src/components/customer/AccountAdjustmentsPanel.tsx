import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Money } from "@/components/common/Money";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { Connection } from "@/types/customer";
import { cn } from "@/lib/utils";

interface AccountAdjustmentsPanelProps {
  customerId?: string;
  connections?: Connection[];
  onSuccess?: () => void;
  className?: string;
}

type AdjustmentLine = {
  id: string;
  label: string;
  direction: "debit" | "credit";
  amount: string;
  connection_id: string;
  notes: string;
};

const defaultLine = (): AdjustmentLine => ({
  id: crypto.randomUUID(),
  label: "Opening Balance",
  direction: "debit",
  amount: "",
  connection_id: "all",
  notes: "",
});

export function AccountAdjustmentsPanel({
  customerId,
  connections = [],
  onSuccess,
  className,
}: AccountAdjustmentsPanelProps) {
  const [lines, setLines] = useState<AdjustmentLine[]>([defaultLine()]);
  const [memo, setMemo] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    setLines([defaultLine()]);
    setMemo("");
  }, [customerId]);

  const totals = useMemo(
    () =>
      lines.reduce(
        (acc, line) => {
          const value = Number(line.amount) || 0;
          if (line.direction === "debit") acc.debit += value;
          else acc.credit += value;
          return acc;
        },
        { debit: 0, credit: 0 }
      ),
    [lines]
  );

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      if (!customerId) throw new Error("Select a customer first");
      const response = await apiClient.post(`/customers/${customerId}/account-batches`, payload);
      return response.data;
    },
    onSuccess: () => {
      toast({ title: "Adjustments saved", description: "Account adjustments recorded." });
      queryClient.invalidateQueries({ queryKey: ["customer", customerId], exact: false });
      queryClient.invalidateQueries({ queryKey: ["customer-ledger", customerId], exact: false });
      setLines([defaultLine()]);
      setMemo("");
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save adjustments", description: error.message, variant: "destructive" });
    },
  });

  const updateLine = (id: string, key: keyof AdjustmentLine, value: string) => {
    setLines((prev) => prev.map((line) => (line.id === id ? { ...line, [key]: value } : line)));
  };

  const addLine = () => setLines((prev) => [...prev, { ...defaultLine(), label: "" }]);
  const removeLine = (id: string) =>
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((line) => line.id !== id)));

  const submit = () => {
    if (!customerId) {
      toast({ title: "No customer selected", description: "Select a customer to add adjustments.", variant: "destructive" });
      return;
    }

    const payloadLines = lines
      .filter((line) => Number(line.amount) > 0 && line.label.trim())
      .map((line) => ({
        label: line.label,
        direction: line.direction,
        amount: Number(line.amount),
        connection_id: line.connection_id === "all" ? null : line.connection_id,
        notes: line.notes || null,
      }));

    if (!payloadLines.length) {
      toast({ title: "No adjustments", description: "Add at least one debit or credit line.", variant: "destructive" });
      return;
    }

    mutation.mutate({
      batch_date: new Date().toISOString().slice(0, 10),
      memo: memo || undefined,
      lines: payloadLines,
    });
  };

  const disabled = !customerId;

  return (
    <Card className={cn("border-2 shadow-sm", className)}>
      <CardHeader>
        <CardTitle className="text-base">Account Adjustments / Opening Balances</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Opening balance, penalties, corrections, discounts.</p>
          <Button size="sm" variant="outline" onClick={addLine} disabled={disabled}>
            Add Line
          </Button>
        </div>

        {disabled && <div className="rounded-md border border-dashed bg-muted/40 p-3 text-sm">Select a customer to add adjustments.</div>}

        {!disabled && (
          <div className="space-y-3">
            {lines.map((line) => (
              <div key={line.id} className="grid grid-cols-1 gap-2 rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs">Label</Label>
                  {lines.length > 1 && (
                    <Button size="sm" variant="ghost" onClick={() => removeLine(line.id)}>
                      Remove
                    </Button>
                  )}
                </div>
                <Input
                  value={line.label}
                  onChange={(event) => updateLine(line.id, "label", event.target.value)}
                  placeholder="Opening Balance / Penalty / Discount"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Direction</Label>
                    <Select value={line.direction} onValueChange={(value) => updateLine(line.id, "direction", value as "debit" | "credit")}>
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
                      onChange={(event) => updateLine(line.id, "amount", event.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Apply to</Label>
                    <Select value={line.connection_id} onValueChange={(value) => updateLine(line.id, "connection_id", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All / auto</SelectItem>
                        {connections.map((connection) => (
                          <SelectItem key={connection.id} value={connection.id}>
                            {connection.boxNumber ?? connection.id.slice(0, 6)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Notes</Label>
                    <Input
                      value={line.notes}
                      onChange={(event) => updateLine(line.id, "notes", event.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span>Debit total</span>
            <Money amount={totals.debit} />
          </div>
          <div className="flex items-center justify-between">
            <span>Credit total</span>
            <Money amount={totals.credit} />
          </div>
          <div className="flex items-center justify-between font-semibold">
            <span>Net effect</span>
            <Money amount={totals.debit - totals.credit} />
          </div>
          <div className="mt-2">
            <Label className="text-xs">Memo</Label>
            <Input value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="Opening balance / corrections" />
          </div>
          <div className="mt-3 flex gap-2">
            <Button className="w-full" variant="secondary" onClick={submit} disabled={disabled || mutation.isPending}>
              Save Adjustments
            </Button>
            <Button className="w-full" variant="outline" onClick={() => setLines([defaultLine()])} disabled={disabled || mutation.isPending}>
              Reset
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
