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
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface ResumeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionIds: string[];
  onSuccess?: () => void;
}

export function ResumeDialog({
  open,
  onOpenChange,
  connectionIds,
  onSuccess,
}: ResumeDialogProps) {
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const resumeMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post("/connections/resume", {
        connection_ids: connectionIds,
        notes: notes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      toast({
        title: "Success",
        description: `${connectionIds.length} connection(s) resumed successfully`,
      });
      onOpenChange(false);
      onSuccess?.();
      setNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resume Connection(s)</DialogTitle>
          <DialogDescription>
            Resuming {connectionIds.length} suspended connection(s).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Enter any notes about resuming this connection..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={resumeMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => resumeMutation.mutate()}
            disabled={resumeMutation.isPending}
          >
            {resumeMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Resume
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
