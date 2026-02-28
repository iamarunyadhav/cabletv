import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Receipt, AlertCircle, DollarSign } from "lucide-react";
import { SmsAutomationCard } from "@/components/dashboard/SmsAutomationCard";

const Dashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const response = await apiClient.get("/dashboard/summary");
      const payload = response.data?.data ?? response.data ?? {};
      return {
        activeCustomers: payload.active_customers ?? 0,
        totalInvoices: payload.total_invoices ?? 0,
        overdueInvoices: payload.overdue_invoices ?? 0,
        monthlyRevenue: payload.monthly_revenue ?? 0,
      };
    },
  });

  const statCards = [
    {
      title: "Active Customers",
      value: stats?.activeCustomers || 0,
      icon: Users,
      gradient: "from-primary to-primary/70",
    },
    {
      title: "Total Invoices",
      value: stats?.totalInvoices || 0,
      icon: Receipt,
      gradient: "from-accent to-accent/70",
    },
    {
      title: "Overdue Invoices",
      value: stats?.overdueInvoices || 0,
      icon: AlertCircle,
      gradient: "from-destructive to-destructive/70",
    },
    {
      title: "Monthly Revenue",
      value: `LKR${stats?.monthlyRevenue.toFixed(2) || "0.00"}`,
      icon: DollarSign,
      gradient: "from-accent to-accent/70",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
        <p className="text-muted-foreground mt-2">
          Welcome to your Cable TV management dashboard
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="overflow-hidden relative shadow-card hover:shadow-glow transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 shadow-card">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground text-center py-8">
              Activity tracking coming soon...
            </div>
          </CardContent>
        </Card>
        <SmsAutomationCard className="col-span-3" />
      </div>
    </div>
  );
};

export default Dashboard;
