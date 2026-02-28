import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CustomerSearchBar, CustomerSearchResult } from "@/components/customer/CustomerSearchBar";

interface SmsTemplate {
  id: string;
  key: string;
  name: string;
  body: string;
  is_active: boolean;
  updated_at?: string;
}

interface SmsMessage {
  id: string;
  body: string;
  status: string;
  sent_at?: string;
}

interface CustomerDetailResponse {
  id: string;
  name: string;
  phone: string;
  total_due?: number;
  billing_group?: { name: string; maximum_debit_balance?: number };
  connections?: Array<{
    id: string;
    box_number: string;
    package?: { name: string };
  }>;
}

interface SmsAutomationSetting {
  id?: string;
  workflow_key: string;
  template_key?: string | null;
  enabled: boolean;
  description?: string | null;
}

const PLACEHOLDERS = [
  "{customer_name}",
  "{balance}",
  "{min_payment}",
  "{limit}",
  "{due_date}",
  "{package}",
  "{connection_no}",
];

const AUTOMATION_WORKFLOWS: Array<{
  workflow_key: SmsAutomationSetting["workflow_key"];
  label: string;
  description: string;
  default_template: string;
}> = [
  {
    workflow_key: "monthly_renewal",
    label: "Monthly Renewal SMS",
    description: "Send balance reminder when a billing cycle renews.",
    default_template: "monthly_renewal",
  },
  {
    workflow_key: "friendly_reminder",
    label: "Friendly Reminder SMS",
    description: "Send reminders automatically after the grace period ends.",
    default_template: "friendly_reminder",
  },
  {
    workflow_key: "disconnect_notice",
    label: "Disconnect Notice SMS",
    description: "Warn customers on disconnect date and before suspension.",
    default_template: "disconnect_notice",
  },
  {
    workflow_key: "overdue_notice",
    label: "Overdue Notice SMS",
    description: "Notify customers when invoices become overdue.",
    default_template: "overdue",
  },
  {
    workflow_key: "payment_receipt",
    label: "Payment Receipt SMS",
    description: "Send receipt SMS automatically when a payment is saved.",
    default_template: "payment_receipt",
  },
  {
    workflow_key: "suspend_notice",
    label: "Suspend Notice SMS",
    description: "Notify customers when a suspension is applied.",
    default_template: "suspend_notice",
  },
];

const SMSManagement = () => {
  const queryClient = useQueryClient();
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SmsTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    key: "",
    name: "",
    body: "",
    is_active: true,
  });

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [messageOverride, setMessageOverride] = useState("");

  const { data: templates = [] } = useQuery<SmsTemplate[]>({
    queryKey: ["sms-templates"],
    queryFn: async () => {
      const response = await apiClient.get("/sms-templates");
      return response.data?.data ?? response.data ?? [];
    },
  });

  const { data: customerDetail } = useQuery<CustomerDetailResponse>({
    queryKey: ["sms-customer-detail", selectedCustomer?.id],
    enabled: !!selectedCustomer?.id,
    queryFn: async () => {
      if (!selectedCustomer?.id) throw new Error("Customer not selected");
      const response = await apiClient.get(`/customers/${selectedCustomer.id}`);
      return response.data?.data ?? response.data;
    },
  });

  const { data: recentMessages = [] } = useQuery<SmsMessage[]>({
    queryKey: ["sms-messages", selectedCustomer?.id, selectedConnectionId],
    enabled: !!selectedCustomer?.id,
    queryFn: async () => {
      const response = await apiClient.get("/sms/messages", {
        params: {
          customer_id: selectedCustomer?.id,
          connection_id: selectedConnectionId || undefined,
          limit: 10,
        },
      });
      return response.data?.data ?? response.data ?? [];
    },
  });

  const { data: automationSettings = [] } = useQuery<SmsAutomationSetting[]>({
    queryKey: ["sms-automation-settings"],
    queryFn: async () => {
      const response = await apiClient.get("/sms-automation-settings");
      return response.data?.data ?? response.data ?? [];
    },
  });

  const updateAutomationSetting = useMutation({
    mutationFn: async (setting: { workflow_key: string; enabled: boolean; template_key?: string | null }) => {
      await apiClient.put("/sms-automation-settings", {
        settings: [
          {
            workflow_key: setting.workflow_key,
            enabled: setting.enabled,
            template_key: setting.template_key || null,
          },
        ],
      });
    },
    onSuccess: () => {
      toast.success("Automation setting updated");
      queryClient.invalidateQueries({ queryKey: ["sms-automation-settings"] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? "Unable to update automation setting");
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (payload: typeof templateForm) => {
      const response = await apiClient.post("/sms-templates", payload);
      return response.data?.data ?? response.data;
    },
    onSuccess: () => {
      toast.success("Template saved");
      queryClient.invalidateQueries({ queryKey: ["sms-templates"] });
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      setTemplateForm({ key: "", name: "", body: "", is_active: true });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? "Unable to save template");
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async (payload: SmsTemplate) => {
      const response = await apiClient.patch(`/sms-templates/${payload.id}`, {
        key: payload.key,
        name: payload.name,
        body: payload.body,
        is_active: payload.is_active,
      });
      return response.data?.data ?? response.data;
    },
    onSuccess: () => {
      toast.success("Template updated");
      queryClient.invalidateQueries({ queryKey: ["sms-templates"] });
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      setTemplateForm({ key: "", name: "", body: "", is_active: true });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? "Unable to update template");
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/sms-templates/${id}`);
    },
    onSuccess: () => {
      toast.success("Template deleted");
      queryClient.invalidateQueries({ queryKey: ["sms-templates"] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? "Unable to delete template");
    },
  });

  const sendSmsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomer?.id) {
        throw new Error("Select a customer first");
      }
      if (!selectedTemplateId && !messageOverride) {
        throw new Error("Select a template or enter a message");
      }

      const payload: Record<string, any> = {
        customer_id: selectedCustomer.id,
        connection_id: selectedConnectionId || undefined,
        template_id: selectedTemplateId || undefined,
        message_override: messageOverride || undefined,
      };

      const response = await apiClient.post("/sms/send", payload);
      return response.data?.data ?? response.data;
    },
    onSuccess: () => {
      toast.success("SMS sent");
      setMessageOverride("");
      queryClient.invalidateQueries({ queryKey: ["sms-messages", selectedCustomer?.id, selectedConnectionId] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? error.message ?? "Unable to send SMS");
    },
  });

  const templatePreview = useMemo(() => {
    const template = templates.find((item) => item.id === selectedTemplateId);
    if (!template) return "";
    const body = template.body || "";
    const totalDue = Number(customerDetail?.total_due || 0);
    const limit = Number(customerDetail?.billing_group?.maximum_debit_balance || 0);
    const minPayment = Math.max(totalDue - limit, 0);
    const connection = customerDetail?.connections?.find((conn) => conn.id === selectedConnectionId);

    const params: Record<string, string> = {
      customer_name: customerDetail?.name || "",
      balance: totalDue.toFixed(2),
      min_payment: minPayment.toFixed(2),
      limit: limit.toFixed(2),
      package: connection?.package?.name || "",
      connection_no: connection?.box_number || "",
    };

    return body.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? "");
  }, [templates, selectedTemplateId, customerDetail, selectedConnectionId]);

  const handleOpenTemplateDialog = (template?: SmsTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateForm({
        key: template.key,
        name: template.name,
        body: template.body,
        is_active: template.is_active,
      });
    } else {
      setEditingTemplate(null);
      setTemplateForm({ key: "", name: "", body: "", is_active: true });
    }
    setTemplateDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">SMS Management</h2>
        <p className="text-muted-foreground mt-2">
          Manage templates and send messages with customer-specific placeholders.
        </p>
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="send">Send SMS</TabsTrigger>
          <TabsTrigger value="automation">Automation Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <CardTitle>Templates</CardTitle>
              <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenTemplateDialog()}>New Template</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Key *</Label>
                      <Input
                        value={templateForm.key}
                        onChange={(e) => setTemplateForm({ ...templateForm, key: e.target.value })}
                        placeholder="friendly_reminder"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input
                        value={templateForm.name}
                        onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                        placeholder="Friendly Reminder"
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Body *</Label>
                      <Textarea
                        value={templateForm.body}
                        onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                        rows={5}
                        placeholder="Dear {customer_name}, your balance is {balance}..."
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={templateForm.is_active}
                        onCheckedChange={(value) => setTemplateForm({ ...templateForm, is_active: value })}
                      />
                      <Label>Active</Label>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        if (editingTemplate) {
                          updateTemplateMutation.mutate({
                            ...editingTemplate,
                            ...templateForm,
                          });
                        } else {
                          createTemplateMutation.mutate(templateForm);
                        }
                      }}
                      disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                    >
                      {editingTemplate ? "Save Changes" : "Create Template"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-4">
                {PLACEHOLDERS.map((placeholder) => (
                  <Badge key={placeholder} variant="outline">
                    {placeholder}
                  </Badge>
                ))}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.key}</TableCell>
                      <TableCell>{template.name}</TableCell>
                      <TableCell>
                        <Badge variant={template.is_active ? "default" : "secondary"}>
                          {template.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{template.updated_at ? new Date(template.updated_at).toLocaleDateString() : "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleOpenTemplateDialog(template)}>
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteTemplateMutation.mutate(template.id)}
                            disabled={deleteTemplateMutation.isPending}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {templates.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No templates found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="send">
          <Card>
            <CardHeader>
              <CardTitle>Send SMS</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <CustomerSearchBar
                    onSelect={(customer) => {
                      setSelectedCustomer(customer);
                      setSelectedConnectionId("");
                    }}
                    placeholder="Search customer"
                  />
                  {selectedCustomer && (
                    <div className="text-xs text-muted-foreground">
                      Selected: {selectedCustomer.name} ({selectedCustomer.connection_id || "N/A"})
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Connection (optional)</Label>
                  <Select
                    value={selectedConnectionId}
                    onValueChange={(value) => setSelectedConnectionId(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select connection" />
                    </SelectTrigger>
                    <SelectContent>
                      {customerDetail?.connections?.map((connection) => (
                        <SelectItem key={connection.id} value={connection.id}>
                          {connection.box_number || connection.id} {connection.package?.name ? `• ${connection.package.name}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Template</Label>
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates
                        .filter((template) => template.is_active)
                        .map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Message Preview</Label>
                  <Textarea value={templatePreview} readOnly rows={4} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Override Message (optional)</Label>
                  <Textarea
                    value={messageOverride}
                    onChange={(e) => setMessageOverride(e.target.value)}
                    rows={4}
                    placeholder="Type a custom message to override the template"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Button
                  onClick={() => sendSmsMutation.mutate()}
                  disabled={sendSmsMutation.isPending}
                >
                  {sendSmsMutation.isPending ? "Sending..." : "Send SMS"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Last 10 messages are shown below once a customer is selected.
                </p>
              </div>

              {selectedCustomer && (
                <Card className="bg-muted/40">
                  <CardHeader>
                    <CardTitle className="text-base">Recent Messages</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentMessages.length === 0 && (
                        <p className="text-sm text-muted-foreground">No messages yet.</p>
                      )}
                      {recentMessages.map((message) => (
                        <div key={message.id} className="rounded border bg-background p-3">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{message.sent_at ? new Date(message.sent_at).toLocaleString() : "Queued"}</span>
                            <Badge variant={message.status === "sent" ? "default" : "secondary"}>
                              {message.status}
                            </Badge>
                          </div>
                          <p className="mt-2 text-sm">{message.body}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation">
          <Card>
            <CardHeader className="flex flex-col gap-2">
              <CardTitle>Automation Settings</CardTitle>
              <p className="text-sm text-muted-foreground">
                Control which automated workflows send SMS and which template they use. Manual sends are not affected by these toggles.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Workflow</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead className="text-right">Enabled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {AUTOMATION_WORKFLOWS.map((workflow) => {
                      const setting = automationSettings.find((item) => item.workflow_key === workflow.workflow_key);
                      const enabled = setting?.enabled ?? true;
                      const templateKey = setting?.template_key ?? workflow.default_template;
                      return (
                        <TableRow key={workflow.workflow_key}>
                          <TableCell>
                            <div className="font-medium">{workflow.label}</div>
                            <div className="text-xs text-muted-foreground">{workflow.description}</div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={templateKey}
                              onValueChange={(value) =>
                                updateAutomationSetting.mutate({
                                  workflow_key: workflow.workflow_key,
                                  template_key: value,
                                  enabled,
                                })
                              }
                              disabled={updateAutomationSetting.isPending}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select template" />
                              </SelectTrigger>
                              <SelectContent>
                                {templates.map((template) => (
                                  <SelectItem key={template.key} value={template.key}>
                                    {template.name || template.key}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs text-muted-foreground">{enabled ? "On" : "Off"}</span>
                              <Switch
                                checked={enabled}
                                disabled={updateAutomationSetting.isPending}
                                onCheckedChange={(checked) =>
                                  updateAutomationSetting.mutate({
                                    workflow_key: workflow.workflow_key,
                                    enabled: checked,
                                    template_key: templateKey,
                                  })
                                }
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SMSManagement;
