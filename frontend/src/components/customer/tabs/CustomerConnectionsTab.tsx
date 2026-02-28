import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/common/Money";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PermissionGate } from "@/components/common/PermissionGate";
import { Connection } from "@/types/customer";
import { apiClient } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

type ConnectionAction =
  | "activate"
  | "suspend"
  | "resume"
  | "temp_disconnect"
  | "disconnect";

interface ConnectionActionState {
  action: ConnectionAction;
  connection: Connection;
}

interface ConnectionStatusPayload {
  id: string;
  action: ConnectionAction;
  reason?: string;
  notes?: string;
  postpone_start?: string;
  postpone_end?: string;
}

interface CustomerConnectionsTabProps {
  customerId: string;
  connections: Connection[];
  onConnectionUpdated?: () => void;
}

export function CustomerConnectionsTab({
  customerId,
  connections,
  onConnectionUpdated,
}: CustomerConnectionsTabProps) {
  const [dialogState, setDialogState] = useState<ConnectionActionState | null>(null);
  const [reason, setReason] = useState("non-payment");
  const [notes, setNotes] = useState("");
  const [postponeStart, setPostponeStart] = useState("");
  const [postponeEnd, setPostponeEnd] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (payload: ConnectionStatusPayload) => {
      const { id, action, reason: payloadReason, notes: payloadNotes, postpone_end, postpone_start } =
        payload;

      if (action === "activate") {
        await apiClient.post(`/connections/${id}/activate`);
        return;
      }

      if (action === "resume") {
        await apiClient.post(`/connections/${id}/resume`, {
          notes: payloadNotes || payloadReason || undefined,
        });
        return;
      }

      if (action === "suspend") {
        await apiClient.post(`/connections/${id}/suspend`, {
          reason: payloadReason,
          notes: payloadNotes,
        });
        return;
      }

      if (action === "temp_disconnect") {
        await apiClient.post(`/connections/${id}/postpone`, {
          start_date: postpone_start,
          end_date: postpone_end,
          reason: payloadReason,
          notes: payloadNotes,
        });
        return;
      }

      if (action === "disconnect") {
        await apiClient.post(`/connections/${id}/disconnect`, {
          reason: payloadReason,
          notes: payloadNotes,
        });
      }
    },
    onSuccess: () => {
      toast({ title: "Connection updated" });
      setDialogState(null);
      setNotes("");
      setReason("non-payment");
      setPostponeStart("");
      setPostponeEnd("");
      queryClient.invalidateQueries({ queryKey: ["customer"] });
      queryClient.invalidateQueries({ queryKey: ["customer-activity"] });
      onConnectionUpdated?.();
    },
    onError: (error: Error) => {
      toast({ title: "Unable to update connection", description: error.message, variant: "destructive" });
    },
  });

  const handleAction = (connection: Connection, action: ConnectionAction) => {
    if (action === "activate" || action === "resume") {
      mutation.mutate({ id: connection.id, action });
      return;
    }

    setDialogState({ connection, action });
  };

  const submitDialog = () => {
    if (!dialogState) return;
    const payload: ConnectionStatusPayload = {
      id: dialogState.connection.id,
      action: dialogState.action,
      reason,
      notes,
      postpone_start: postponeStart || undefined,
      postpone_end: postponeEnd || undefined,
    };

    if (dialogState.action === "temp_disconnect" && (!postponeStart || !postponeEnd)) {
      toast({
        title: "Select date range",
        description: "Please pick both start and end dates for the temporary disconnect.",
        variant: "destructive",
      });
      return;
    }

    mutation.mutate(payload);
  };

  return (
    <>
      <div className="space-y-4">
        {connections.map((connection) => {
          const showActivate = connection.status === "pending";
          const showResume =
            connection.status === "suspended" || connection.status === "postponed";

          return (
            <Card key={connection.id} className="border shadow-sm">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl font-semibold">{connection.boxNumber}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {connection.packageName} • {connection.packageType.toUpperCase()}
                    </p>
                  </div>
                  <StatusBadge status={connection.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <span className="text-muted-foreground">Monthly Amount</span>
                    <Money amount={connection.monthlyAmount} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <span className="text-muted-foreground">Balance</span>
                    <Money amount={connection.connectionBalance} />
                  </div>
                  {(connection.prepaidMonths ?? 0) > 0 && connection.prepaidThroughLabel ? (
                    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <span className="text-muted-foreground">Prepaid Until</span>
                      <Badge
                        variant="outline"
                        className="text-xs border-emerald-200 bg-emerald-50 text-emerald-700"
                      >
                        {connection.prepaidThroughLabel} ({connection.prepaidMonths} months)
                      </Badge>
                    </div>
                  ) : (connection.creditBalance ?? 0) > 0 ? (
                    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <span className="text-muted-foreground">Credit Balance</span>
                      <Money amount={connection.creditBalance || 0} />
                    </div>
                  ) : null}
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Setup Items</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {connection.setupItems.length === 0 && <span>-</span>}
                      {connection.setupItems.map((item) => (
                        <Badge key={item.id} variant="outline" className="text-xs">
                          {item.name} · <Money amount={item.price} />
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Additional Channels</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {connection.additionalChannels.length === 0 && <span>-</span>}
                      {connection.additionalChannels.map((channel) => (
                        <Badge key={channel.id} variant="outline" className="text-xs">
                          {channel.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <dl className="grid gap-3 rounded-lg border bg-muted/40 p-3 text-sm md:grid-cols-2">
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Billing Cycle</dt>
                    <dd>{connection.billingCycle || "Default"}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Postpone</dt>
                    <dd>
                      {connection.postponeStart && connection.postponeEnd
                        ? `${connection.postponeStart} → ${connection.postponeEnd}`
                        : "-"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Suspended At</dt>
                    <dd>{connection.suspendedAt ? connection.suspendedAt : "-"}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Reason</dt>
                    <dd>{connection.suspensionReason || "-"}</dd>
                  </div>
                </dl>

                <PermissionGate required="connections.manage">
                  <div className="flex flex-wrap gap-2">
                    {showActivate && (
                      <Button
                        size="sm"
                        onClick={() => handleAction(connection, "activate")}
                        disabled={mutation.isPending}
                      >
                        Activate
                      </Button>
                    )}
                    {showResume && (
                      <Button
                        size="sm"
                        onClick={() => handleAction(connection, "resume")}
                        disabled={mutation.isPending}
                      >
                        Resume
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleAction(connection, "suspend")}
                      disabled={mutation.isPending}
                    >
                      Suspend
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleAction(connection, "temp_disconnect")}
                      disabled={mutation.isPending}
                    >
                      Temporary Disconnect
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleAction(connection, "disconnect")}
                      disabled={mutation.isPending}
                    >
                      Disconnect
                    </Button>
                  </div>
                </PermissionGate>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={Boolean(dialogState)} onOpenChange={(open) => !open && setDialogState(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogState?.action === "suspend" && "Suspend Connection"}
              {dialogState?.action === "temp_disconnect" && "Temporary Disconnect"}
              {dialogState?.action === "disconnect" && "Disconnect Connection"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {dialogState?.action !== "disconnect" && (
              <>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="non-payment">Non-payment</SelectItem>
                      <SelectItem value="customer-request">Customer request</SelectItem>
                      <SelectItem value="technical-issue">Technical issue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Additional notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </div>
              </>
            )}

            {dialogState?.action === "temp_disconnect" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>From</Label>
                  <Input
                    type="date"
                    value={postponeStart}
                    onChange={(event) => setPostponeStart(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <Input
                    type="date"
                    value={postponeEnd}
                    onChange={(event) => setPostponeEnd(event.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogState(null)}>
              Cancel
            </Button>
            <Button onClick={submitDialog} disabled={mutation.isPending}>
              {mutation.isPending ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
