import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const SMS_TOGGLES = [
  {
    key: "sms_auto_friendly_reminder_enabled",
    label: "Friendly Reminder SMS",
    description: "Send reminders automatically after the billing window closes.",
  },
  {
    key: "sms_auto_overdue_notice_enabled",
    label: "Overdue Notice SMS",
    description: "Notify customers automatically when invoices become overdue.",
  },
  {
    key: "sms_auto_disconnect_notice_enabled",
    label: "Disconnect Notice SMS",
    description: "Warn customers before automated suspension/disconnect actions run.",
  },
  {
    key: "sms_auto_receipt_enabled",
    label: "Payment Receipt SMS",
    description: "Send receipt SMS automatically when a payment is saved.",
  },
] as const;

type SmsToggleKey = (typeof SMS_TOGGLES)[number]["key"];

const parseBoolean = (value: string | undefined, fallback = true): boolean => {
  if (value === undefined || value === null) {
    return fallback;
  }
  const normalized = value.toString().trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off", ""].includes(normalized)) {
    return false;
  }
  return fallback;
};

interface SmsAutomationCardProps {
  className?: string;
}

export function SmsAutomationCard({ className }: SmsAutomationCardProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: toggles, isLoading } = useQuery({
    queryKey: ["sms-automation-settings"],
    queryFn: async () => {
      const response = await apiClient.get("/settings", {
        params: { keys: SMS_TOGGLES.map((toggle) => toggle.key).join(",") },
      });
      const records: Array<{ key: SmsToggleKey; value: string }> =
        response.data?.data ?? response.data ?? [];
      const map: Record<SmsToggleKey, boolean> = {} as Record<SmsToggleKey, boolean>;
      SMS_TOGGLES.forEach((toggle) => {
        const match = records.find((record) => record.key === toggle.key);
        map[toggle.key] = parseBoolean(match?.value, true);
      });
      return map;
    },
  });

  const mutation = useMutation({
    mutationFn: async ({ key, value }: { key: SmsToggleKey; value: boolean }) => {
      await apiClient.put("/settings", {
        settings: {
          [key]: value ? "1" : "0",
        },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sms-automation-settings"] });
      toast({
        title: "SMS setting updated",
        description: `${SMS_TOGGLES.find((toggle) => toggle.key === variables.key)?.label ?? "Setting"} is now ${variables.value ? "On" : "Off"}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Unable to update setting",
        description: error?.message ?? "An error occurred while saving changes.",
        variant: "destructive",
      });
    },
  });

  return (
    <Card className={cn("shadow-card", className)}>
      <CardHeader>
        <CardTitle>SMS Automation Controls</CardTitle>
        <p className="text-sm text-muted-foreground">
          Decide which automated workflows are allowed to send SMS messages. Manual SMS actions
          continue to work even when these switches are off.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {SMS_TOGGLES.map((toggle) => (
          <div
            key={toggle.key}
            className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium">{toggle.label}</p>
              <p className="text-sm text-muted-foreground">{toggle.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {toggles?.[toggle.key] ? "On" : "Off"}
              </span>
              <Switch
                checked={toggles?.[toggle.key] ?? true}
                disabled={isLoading || mutation.isPending}
                onCheckedChange={(checked) => mutation.mutate({ key: toggle.key, value: checked })}
              />
            </div>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["sms-automation-settings"] })}
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          Refresh Status
        </Button>
      </CardContent>
    </Card>
  );
}
