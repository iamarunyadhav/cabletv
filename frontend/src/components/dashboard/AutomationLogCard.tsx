import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const LOG_TOGGLES = [
  {
    key: "audit_log_scheduler_enabled",
    label: "Scheduler Logs",
    description: "Record when scheduled commands run or fail.",
  },
  {
    key: "audit_log_queue_enabled",
    label: "Queue Job Logs",
    description: "Record background job runs and failures.",
  },
] as const;

type LogToggleKey = (typeof LOG_TOGGLES)[number]["key"];

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

interface AutomationLogCardProps {
  className?: string;
}

export function AutomationLogCard({ className }: AutomationLogCardProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: toggles, isLoading } = useQuery({
    queryKey: ["automation-log-settings"],
    queryFn: async () => {
      const response = await apiClient.get("/settings", {
        params: { keys: LOG_TOGGLES.map((toggle) => toggle.key).join(",") },
      });
      const records: Array<{ key: LogToggleKey; value: string }> =
        response.data?.data ?? response.data ?? [];
      const map: Record<LogToggleKey, boolean> = {} as Record<LogToggleKey, boolean>;
      LOG_TOGGLES.forEach((toggle) => {
        const match = records.find((record) => record.key === toggle.key);
        map[toggle.key] = parseBoolean(match?.value, true);
      });
      return map;
    },
  });

  const mutation = useMutation({
    mutationFn: async ({ key, value }: { key: LogToggleKey; value: boolean }) => {
      await apiClient.put("/settings", {
        settings: {
          [key]: value ? "1" : "0",
        },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["automation-log-settings"] });
      toast({
        title: "Log setting updated",
        description: `${LOG_TOGGLES.find((toggle) => toggle.key === variables.key)?.label ?? "Setting"} is now ${variables.value ? "On" : "Off"}.`,
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
        <CardTitle>Automation Log Controls</CardTitle>
        <p className="text-sm text-muted-foreground">
          Turn scheduler and queue job audit logs on or off. Useful when you only need logs
          occasionally.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {LOG_TOGGLES.map((toggle) => (
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
          onClick={() => queryClient.invalidateQueries({ queryKey: ["automation-log-settings"] })}
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          Refresh Status
        </Button>
      </CardContent>
    </Card>
  );
}
