import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { MessageSquare, CheckCircle, XCircle, Clock, DollarSign } from "lucide-react";
import { format, subDays } from "date-fns";

const COLORS = {
  sent: "hsl(var(--chart-1))",
  delivered: "hsl(var(--chart-2))",
  failed: "hsl(var(--chart-3))",
  pending: "hsl(var(--chart-4))",
};

export default function SMSAnalytics() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["sms-stats"],
    queryFn: async () => {
      const response = await apiClient.get("/sms/logs");
      const data = response.data?.data ?? response.data ?? [];

      const total = data.length;
      const sent = data.filter(s => s.status === "sent").length;
      const failed = data.filter(s => s.status === "failed").length;
      const delivered = data.filter(s => s.delivery_status === "delivered").length;
      const pending = data.filter(s => s.delivery_status === "pending").length;
      const totalCost = data.reduce((sum, s) => sum + (Number(s.cost) || 0), 0);

      return { total, sent, failed, delivered, pending, totalCost };
    },
  });

  const { data: dailyData, isLoading: dailyLoading } = useQuery({
    queryKey: ["sms-daily-analytics"],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const response = await apiClient.get("/sms/logs", {
        params: { since: thirtyDaysAgo },
      });
      const data = response.data?.data ?? response.data ?? [];

      // Group by date
      const grouped = data.reduce((acc: any, item) => {
        const date = format(new Date(item.sent_at), "MMM dd");
        if (!acc[date]) {
          acc[date] = { date, sent: 0, delivered: 0, failed: 0, cost: 0 };
        }
        if (item.status === "sent") acc[date].sent++;
        if (item.delivery_status === "delivered") acc[date].delivered++;
        if (item.delivery_status === "failed") acc[date].failed++;
        acc[date].cost += Number(item.cost) || 0;
        return acc;
      }, {});

      return Object.values(grouped);
    },
  });

  const { data: typeData } = useQuery({
    queryKey: ["sms-type-analytics"],
    queryFn: async () => {
      const response = await apiClient.get("/sms/logs");
      const data = response.data?.data ?? response.data ?? [];

      const grouped = data.reduce((acc: any, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(grouped).map(([name, value]) => ({ name, value }));
    },
  });

  const statCards = [
    {
      title: "Total Sent",
      value: stats?.total || 0,
      icon: MessageSquare,
      color: "text-blue-500",
    },
    {
      title: "Delivered",
      value: stats?.delivered || 0,
      icon: CheckCircle,
      color: "text-green-500",
    },
    {
      title: "Failed",
      value: stats?.failed || 0,
      icon: XCircle,
      color: "text-red-500",
    },
    {
      title: "Pending",
      value: stats?.pending || 0,
      icon: Clock,
      color: "text-yellow-500",
    },
    {
      title: "Total Cost",
      value: `LKR ${stats?.totalCost.toFixed(2) || "0.00"}`,
      icon: DollarSign,
      color: "text-primary",
    },
  ];

  if (statsLoading || dailyLoading) {
    return <div className="p-6">Loading analytics...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">SMS Analytics</h1>
        <p className="text-muted-foreground">Track SMS performance and costs</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="delivery">Delivery Rate</TabsTrigger>
          <TabsTrigger value="types">By Type</TabsTrigger>
          <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SMS Trends (Last 30 Days)</CardTitle>
              <CardDescription>Daily SMS sent and delivered</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  sent: { label: "Sent", color: COLORS.sent },
                  delivered: { label: "Delivered", color: COLORS.delivered },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line type="monotone" dataKey="sent" stroke={COLORS.sent} name="Sent" />
                    <Line type="monotone" dataKey="delivered" stroke={COLORS.delivered} name="Delivered" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Status Distribution</CardTitle>
              <CardDescription>Overall delivery performance</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  delivered: { label: "Delivered", color: COLORS.delivered },
                  pending: { label: "Pending", color: COLORS.pending },
                  failed: { label: "Failed", color: COLORS.failed },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Delivered", value: stats?.delivered || 0 },
                        { name: "Pending", value: stats?.pending || 0 },
                        { name: "Failed", value: stats?.failed || 0 },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill={COLORS.delivered} />
                      <Cell fill={COLORS.pending} />
                      <Cell fill={COLORS.failed} />
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SMS by Type</CardTitle>
              <CardDescription>Distribution of SMS types</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  value: { label: "Count", color: COLORS.sent },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={typeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill={COLORS.sent} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily SMS Costs (Last 30 Days)</CardTitle>
              <CardDescription>Cost trends over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  cost: { label: "Cost (LKR)", color: "hsl(var(--primary))" },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="cost" fill="hsl(var(--primary))" name="Cost (LKR)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
