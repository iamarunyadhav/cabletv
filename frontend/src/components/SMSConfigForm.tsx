import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Send, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SMSConfigForm = () => {
  const queryClient = useQueryClient();
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("This is a test SMS from CableTV Management System");
  const [testing, setTesting] = useState(false);

  // Fetch current SMS provider settings
  const { data: providerSettings, isLoading } = useQuery({
    queryKey: ["sms-provider-settings"],
    queryFn: async () => {
      const response = await apiClient.get("/sms/providers/active");
      return response.data ?? { provider: "none", config: {} };
    },
  });

  const [provider, setProvider] = useState(providerSettings?.provider || "none");
  const [config, setConfig] = useState<any>(providerSettings?.config || {});

  // Update local state when provider settings are loaded
  useEffect(() => {
    if (providerSettings) {
      setProvider(providerSettings.provider);
      setConfig(providerSettings.config || {});
    }
  }, [providerSettings]);

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { provider: string; config: any }) => {
      // First, deactivate all existing providers
      await apiClient.put("/sms/providers/active", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms-provider-settings"] });
      toast.success("SMS provider settings updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update settings: ${error.message}`);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({ provider, config });
  };

  const handleTestSMS = async () => {
    if (!testPhone || !testMessage) {
      toast.error("Please enter phone number and message");
      return;
    }

    setTesting(true);
    try {
      await apiClient.post("/sms/test", {
        phone: testPhone,
        message: testMessage,
      });

      toast.success("Test SMS sent successfully");
    } catch (error: any) {
      toast.error(`Test SMS failed: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const renderProviderConfig = () => {
    switch (provider) {
      case "twilio":
        return (
          <div className="space-y-4">
            <div>
              <Label>Account SID</Label>
              <Input
                value={config.accountSid || ""}
                onChange={(e) => setConfig({ ...config, accountSid: e.target.value })}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>
            <div>
              <Label>Auth Token</Label>
              <Input
                type="password"
                value={config.authToken || ""}
                onChange={(e) => setConfig({ ...config, authToken: e.target.value })}
                placeholder="••••••••••••••••"
              />
            </div>
            <div>
              <Label>From Number</Label>
              <Input
                value={config.fromNumber || ""}
                onChange={(e) => setConfig({ ...config, fromNumber: e.target.value })}
                placeholder="+1234567890"
              />
            </div>
          </div>
        );

      case "aws_sns":
        return (
          <div className="space-y-4">
            <div>
              <Label>Access Key ID</Label>
              <Input
                type="password"
                value={config.accessKeyId || ""}
                onChange={(e) => setConfig({ ...config, accessKeyId: e.target.value })}
                placeholder="AKIAIOSFODNN7EXAMPLE"
              />
            </div>
            <div>
              <Label>Secret Access Key</Label>
              <Input
                type="password"
                value={config.secretAccessKey || ""}
                onChange={(e) => setConfig({ ...config, secretAccessKey: e.target.value })}
                placeholder="••••••••••••••••"
              />
            </div>
            <div>
              <Label>Region</Label>
              <Select
                value={config.region || "ap-south-1"}
                onValueChange={(value) => setConfig({ ...config, region: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ap-south-1">Asia Pacific (Mumbai)</SelectItem>
                  <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                  <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                  <SelectItem value="eu-west-1">Europe (Ireland)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sender Name (max 11 chars)</Label>
              <Input
                value={config.senderName || ""}
                onChange={(e) => setConfig({ ...config, senderName: e.target.value.slice(0, 11) })}
                placeholder="CableTV"
                maxLength={11}
              />
            </div>
          </div>
        );

      case "local_gateway":
        return (
          <div className="space-y-4">
            <div>
              <Label>API URL</Label>
              <Input
                value={config.apiUrl || ""}
                onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
                placeholder="https://api.example.com/send-sms"
              />
            </div>
            <div>
              <Label>API Key (optional)</Label>
              <Input
                type="password"
                value={config.apiKey || ""}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="••••••••••••••••"
              />
            </div>
            <div>
              <Label>Method</Label>
              <Select
                value={config.method || "POST"}
                onValueChange={(value) => setConfig({ ...config, method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="GET">GET</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Body Template (use {"{{phone}}"} and {"{{message}}"})</Label>
              <Textarea
                value={config.bodyTemplate || '{"phone":"{{phone}}","message":"{{message}}"}'}
                onChange={(e) => setConfig({ ...config, bodyTemplate: e.target.value })}
                rows={4}
                className="font-mono text-sm"
              />
            </div>
          </div>
        );

      case "textlk":
        return (
          <div className="space-y-4">
            <div>
              <Label>API Token</Label>
              <Input
                type="password"
                value={config.apiToken || ""}
                onChange={(e) => setConfig({ ...config, apiToken: e.target.value })}
                placeholder="2229|Gy5nT27EfTLePfwLvuq6wvR1Of3VKMnw7zrJKg65..."
              />
            </div>
            <div>
              <Label>Sender ID (max 11 chars)</Label>
              <Input
                value={config.senderId || ""}
                onChange={(e) => setConfig({ ...config, senderId: e.target.value.slice(0, 11) })}
                placeholder="CableTV"
                maxLength={11}
              />
            </div>
            <div>
              <Label>Message Type</Label>
              <Select
                value={config.messageType || "plain"}
                onValueChange={(value) => setConfig({ ...config, messageType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plain">Plain (English)</SelectItem>
                  <SelectItem value="unicode">Unicode (Tamil/Sinhala)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>API Endpoint</Label>
              <Input
                value={config.apiUrl || "https://app.text.lk/api/v3/sms/send"}
                onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
                placeholder="https://app.text.lk/api/v3/sms/send"
              />
            </div>
          </div>
        );

      case "none":
        return (
          <div className="text-center py-8 text-muted-foreground">
            <p>No SMS provider configured. Messages will be logged only.</p>
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>SMS Provider Configuration</CardTitle>
          <CardDescription>
            Configure your SMS provider to send real messages to customers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>SMS Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Mock - Logs Only)</SelectItem>
                <SelectItem value="twilio">Twilio</SelectItem>
                <SelectItem value="aws_sns">AWS SNS</SelectItem>
                <SelectItem value="local_gateway">Local Gateway</SelectItem>
                <SelectItem value="textlk">Text.lk (Sri Lanka)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {renderProviderConfig()}

          <div className="pt-4">
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test SMS</CardTitle>
          <CardDescription>
            Send a test SMS to verify your configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Phone Number</Label>
            <Input
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="+919876543210"
            />
          </div>
          <div>
            <Label>Test Message</Label>
            <Textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              rows={3}
            />
          </div>
          <Button onClick={handleTestSMS} disabled={testing} className="gap-2">
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Test SMS
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Template Variables</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <Badge variant="outline">{"{{name}}"}</Badge> - Customer name
            </div>
            <div>
              <Badge variant="outline">{"{{phone}}"}</Badge> - Phone number
            </div>
            <div>
              <Badge variant="outline">{"{{box_number}}"}</Badge> - Box number
            </div>
            <div>
              <Badge variant="outline">{"{{balance}}"}</Badge> - Current balance
            </div>
            <div>
              <Badge variant="outline">{"{{company}}"}</Badge> - Company name
            </div>
            <div>
              <Badge variant="outline">{"{{message}}"}</Badge> - Message content
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SMSConfigForm;
