import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface SendSMSDialogSingleProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  phone: string;
  name: string;
}

const SendSMSDialogSingle = ({ open, onOpenChange, customerId, phone, name }: SendSMSDialogSingleProps) => {
  const [message, setMessage] = useState("");

  const sendMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const response = await apiClient.post("/sms/send", {
        customers: [customerId],
        message: messageText,
        type: "custom",
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("SMS sent successfully!");
      onOpenChange(false);
      setMessage("");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to send SMS";
      toast.error(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }
    sendMutation.mutate(message);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send SMS to {name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <div className="p-2 bg-muted rounded-md">
              <p className="font-medium">{phone}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message..."
              rows={6}
              required
            />
            <p className="text-xs text-muted-foreground">
              You can use placeholders: {"{{name}}"}, {"{{balance}}"}, {"{{box_number}}"}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={sendMutation.isPending}>
              {sendMutation.isPending ? "Sending..." : "Send SMS"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SendSMSDialogSingle;
