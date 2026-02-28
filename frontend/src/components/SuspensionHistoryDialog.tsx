import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Clock, User, AlertCircle } from "lucide-react";

interface SuspensionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
}

export function SuspensionHistoryDialog({
  open,
  onOpenChange,
  connectionId,
}: SuspensionHistoryDialogProps) {
  const { data: history, isLoading } = useQuery({
    queryKey: ["suspension-history", connectionId],
    queryFn: async () => {
      const response = await apiClient.get(`/connections/${connectionId}/history`);
      return response.data?.data ?? response.data ?? [];
    },
    enabled: open,
  });

  const formatReason = (reason: string) => {
    return reason
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Suspension History</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : !history || history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="mx-auto h-12 w-12 mb-3 opacity-50" />
            <p>No suspension history found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Status Change</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {format(new Date(record.performed_at), "MMM dd, yyyy")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(record.performed_at), "hh:mm a")}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={record.action === "suspended" ? "destructive" : "default"}
                    >
                      {record.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      {record.reason && (
                        <div className="font-medium">{formatReason(record.reason)}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs whitespace-pre-wrap text-sm">
                    {record.notes || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <span className="text-muted-foreground">
                        {record.previous_status}
                      </span>
                      {" → "}
                      <span className="font-medium">{record.new_status}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        Number(record.balance_at_time) > 0
                          ? "text-red-600 font-medium"
                          : ""
                      }
                    >
                      LKR {Number(record.balance_at_time).toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {record.performed_by_name || "System"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={record.is_automated ? "secondary" : "outline"}>
                      {record.is_automated ? "Auto" : "Manual"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
