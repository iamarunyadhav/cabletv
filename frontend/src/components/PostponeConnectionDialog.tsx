import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface PostponeConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
  boxNumber: string;
  onSuccess?: () => void;
}

export function PostponeConnectionDialog({
  open,
  onOpenChange,
  connectionId,
  boxNumber,
  onSuccess,
}: PostponeConnectionDialogProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const postponeMutation = useMutation({
    mutationFn: async () => {
      if (!startDate || !endDate) {
        throw new Error("Please provide both start and end dates");
      }

      if (new Date(endDate) <= new Date(startDate)) {
        throw new Error("End date must be after start date");
      }

      await apiClient.post(`/connections/${connectionId}/postpone`, {
        postpone_start: startDate,
        postpone_end: endDate,
        notes: notes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-connections"] });
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      toast.success("Connection postponed successfully!");
      onOpenChange(false);
      onSuccess?.();
      setStartDate("");
      setEndDate("");
      setNotes("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Postpone Connection</DialogTitle>
          <DialogDescription>
            Temporarily pause charges for Box {boxNumber}. No monthly charges during postpone period.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Reason for Postponement (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="E.g., Customer traveling, temporary relocation..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="bg-accent/10 border border-accent/20 rounded-lg p-3">
            <p className="text-sm font-medium text-accent">Postpone Period</p>
            <p className="text-sm text-muted-foreground mt-1">
              During the postpone period, no monthly charges will be applied. The connection will automatically resume billing after the end date.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={postponeMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => postponeMutation.mutate()}
            disabled={!startDate || !endDate || postponeMutation.isPending}
          >
            {postponeMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Confirm Postpone
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
