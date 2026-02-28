import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertCircle,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { Money } from "@/components/common/Money";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subDays } from "date-fns";

interface ReportPayload {
  connections: any[];
  payments: any[];
  customers: any[];
  supplierPayments: any[];
  supplierBills: any[];
  paymentsDaily?: { payment_day: string; total_amount: number }[];
  supplierPaymentsDaily?: { payment_day: string; total_amount: number }[];
}

const Reports = () => {
  const [dateRange, setDateRange] = useState(() => {
    const to = new Date();
    const from = subDays(to, 29);
    return {
      from: format(from, "yyyy-MM-dd"),
      to: format(to, "yyyy-MM-dd"),
    };
  });

  const { data, isLoading } = useQuery<ReportPayload>({
    queryKey: ["reports-stats", dateRange.from, dateRange.to],
    queryFn: async () => {
      const response = await apiClient.get("/reports/overview", {
        params: {
          from: dateRange.from,
          to: dateRange.to,
        },
      });
      return response.data;
    },
  });

  const statusData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Active", value: data.connections.filter((c) => c.status === "active").length, color: "#10b981" },
      { name: "Pending", value: data.connections.filter((c) => c.status === "pending").length, color: "#f59e0b" },
      { name: "Disconnect", value: data.connections.filter((c) => c.status === "disconnect").length, color: "#ef4444" },
      { name: "Inactive", value: data.connections.filter((c) => c.status === "inactive").length, color: "#6b7280" },
    ];
  }, [data]);

  const areaData = useMemo(() => {
    if (!data) return [];
    return data.customers.reduce((acc: any[], customer) => {
      const key =
        customer.area?.name ||
        customer.billing_group?.area?.name ||
        customer.areas?.name ||
        "Unknown";
      const existing = acc.find((row) => row.name === key);
      if (existing) {
        existing.count += 1;
      } else {
        acc.push({ name: key, count: 1 });
      }
      return acc;
    }, []);
  }, [data]);

  const monthlyRevenue = useMemo(() => {
    if (!data) return [];
    return data.payments.reduce((acc: any[], payment) => {
      const month = new Date(payment.payment_date).toLocaleDateString("en-US", { month: "short", year: "numeric" });
      const existing = acc.find((item) => item.month === month);
      if (existing) {
        existing.revenue += Number(payment.amount);
      } else {
        acc.push({ month, revenue: Number(payment.amount), expenses: 0 });
      }
      return acc;
    }, []);
  }, [data]);

  const monthlyExpenses = useMemo(() => {
    if (!data) return [];
    return data.supplierPayments.reduce((acc: any[], payment) => {
      const month = new Date(payment.payment_date).toLocaleDateString("en-US", { month: "short", year: "numeric" });
      const existing = acc.find((item) => item.month === month);
      if (existing) {
        existing.expenses += Number(payment.amount);
      } else {
        acc.push({ month, revenue: 0, expenses: Number(payment.amount) });
      }
      return acc;
    }, []);
  }, [data]);

  const cashflowSeries = useMemo(() => {
    const map = new Map<
      string,
      {
        month: string;
        revenue: number;
        expenses: number;
        net: number;
      }
    >();

    monthlyRevenue.forEach((entry) => {
      map.set(entry.month, { month: entry.month, revenue: entry.revenue, expenses: 0, net: entry.revenue });
    });
    monthlyExpenses.forEach((entry) => {
      const existing = map.get(entry.month);
      if (existing) {
        existing.expenses += entry.expenses;
        existing.net = existing.revenue - existing.expenses;
      } else {
        map.set(entry.month, { month: entry.month, revenue: 0, expenses: entry.expenses, net: -entry.expenses });
      }
    });

    return Array.from(map.values()).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
  }, [monthlyRevenue, monthlyExpenses]);

  const connectionGrowth = useMemo(() => {
    if (!data) return [];
    return data.connections.reduce((acc: any[], connection) => {
      const month = new Date(connection.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" });
      const existing = acc.find((item) => item.month === month);
      if (existing) {
        existing.count += 1;
      } else {
        acc.push({ month, count: 1 });
      }
      return acc;
    }, []);
  }, [data]);

  const totalReceivables = useMemo(() => {
    if (!data) return 0;
    return data.connections.reduce((sum, conn) => sum + Number(conn.current_balance || 0), 0);
  }, [data]);

  const highDueCount = useMemo(() => {
    if (!data) return 0;
    return data.connections.filter((conn) => Number(conn.current_balance) > 5000).length;
  }, [data]);

  const supplierPayables = useMemo(() => {
    if (!data) return 0;
    return data.supplierBills.reduce((sum, bill) => {
      if (bill.status === "paid") return sum;
      return sum + (Number(bill.amount_due || 0) - Number(bill.amount_paid || 0));
    }, 0);
  }, [data]);

  const invoiceStatusData = useMemo(() => {
    if (!data) return [];
    return [
      {
        name: "Pending",
        value: data.supplierBills.filter((bill) => bill.status === "pending").length,
        color: "#f97316",
      },
      {
        name: "Partial",
        value: data.supplierBills.filter((bill) => bill.status === "partial").length,
        color: "#facc15",
      },
      {
        name: "Overdue",
        value: data.supplierBills.filter((bill) => bill.status === "overdue").length,
        color: "#dc2626",
      },
      {
        name: "Paid",
        value: data.supplierBills.filter((bill) => bill.status === "paid").length,
        color: "#10b981",
      },
    ];
  }, [data]);

  const topDues = useMemo(() => {
    if (!data) return [];
    return [...data.connections]
      .filter((conn) => Number(conn.current_balance) > 0)
      .sort((a, b) => Number(b.current_balance) - Number(a.current_balance))
      .slice(0, 5);
  }, [data]);

  const dailySeries = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { date: string; revenue: number; expenses: number; net: number }>();

    const dayKey = (value?: string | null) => {
      if (!value) return "unknown";
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return value;
      return format(parsed, "yyyy-MM-dd");
    };

    const paymentsDaily = data.paymentsDaily && data.paymentsDaily.length > 0 ? data.paymentsDaily : null;
    const supplierPaymentsDaily =
      data.supplierPaymentsDaily && data.supplierPaymentsDaily.length > 0 ? data.supplierPaymentsDaily : null;

    if (paymentsDaily) {
      paymentsDaily.forEach((row) => {
        const key = dayKey(row.payment_day);
        const bucket = map.get(key) || { date: key, revenue: 0, expenses: 0, net: 0 };
        bucket.revenue += Number(row.total_amount || 0);
        bucket.net = bucket.revenue - bucket.expenses;
        map.set(key, bucket);
      });
    } else {
      data.payments.forEach((payment) => {
        const key = dayKey(payment.payment_date || payment.created_at);
        const bucket = map.get(key) || { date: key, revenue: 0, expenses: 0, net: 0 };
        bucket.revenue += Number(payment.amount || 0);
        bucket.net = bucket.revenue - bucket.expenses;
        map.set(key, bucket);
      });
    }

    if (supplierPaymentsDaily) {
      supplierPaymentsDaily.forEach((row) => {
        const key = dayKey(row.payment_day);
        const bucket = map.get(key) || { date: key, revenue: 0, expenses: 0, net: 0 };
        bucket.expenses += Number(row.total_amount || 0);
        bucket.net = bucket.revenue - bucket.expenses;
        map.set(key, bucket);
      });
    } else {
      data.supplierPayments.forEach((payment) => {
        const key = dayKey(payment.payment_date || payment.created_at);
        const bucket = map.get(key) || { date: key, revenue: 0, expenses: 0, net: 0 };
        bucket.expenses += Number(payment.amount || 0);
        bucket.net = bucket.revenue - bucket.expenses;
        map.set(key, bucket);
      });
    }

    return Array.from(map.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data]);

  const handleQuickRange = (days: number) => {
    const to = dateRange.to ? new Date(dateRange.to) : new Date();
    const from = subDays(to, days - 1);
    setDateRange({
      from: format(from, "yyyy-MM-dd"),
      to: format(to, "yyyy-MM-dd"),
    });
  };

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const latestCashflow = cashflowSeries[cashflowSeries.length - 1] || { revenue: 0, net: 0 };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Reports & Analytics</h2>
        <p className="text-muted-foreground mt-2">Business insights and performance metrics</p>
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <div className="flex flex-col">
            <label className="text-xs text-muted-foreground">From</label>
            <Input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-muted-foreground">To</label>
            <Input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleQuickRange(7)}>
              Last 7d
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleQuickRange(30)}>
              Last 30d
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleQuickRange(90)}>
              Last 90d
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Connections</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.connections.length}</div>
            <p className="text-xs text-muted-foreground">All active + inactive accounts.</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Customer Receivables</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Money amount={totalReceivables} />
            </div>
            <p className="text-xs text-muted-foreground">Outstanding from subscribers.</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">High Due (&gt; LKR5K)</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{highDueCount}</div>
            <p className="text-xs text-muted-foreground">Connections requiring attention.</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Supplier Payables</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Money amount={supplierPayables} />
            </div>
            <p className="text-xs text-muted-foreground">Unpaid vendor bills.</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Net Cashflow (range)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${latestCashflow.net < 0 ? "text-destructive" : ""}`}>
              <Money amount={latestCashflow.net} />
            </div>
            <p className="text-xs text-muted-foreground">Revenue minus supplier spend.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Connection Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} outerRadius={100} dataKey="value" label>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Customers by Area</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={areaData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide={areaData.length > 6} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Revenue vs Supplier Spend</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cashflowSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Revenue" />
                <Line type="monotone" dataKey="expenses" stroke="#f97316" strokeWidth={2} name="Supplier Spend" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Connection Growth</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={connectionGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Supplier Invoice Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={invoiceStatusData} dataKey="value" label outerRadius={110}>
                  {invoiceStatusData.map((entry, index) => (
                    <Cell key={`pie-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Top Overdue Customers</CardTitle>
          </CardHeader>
          <CardContent>
            {topDues.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No outstanding dues above threshold.</p>
            ) : (
              <div className="space-y-3">
                {topDues.map((connection) => (
                  <div key={connection.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-semibold">{connection.customers?.name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">ID: {connection.customers?.connection_id}</p>
                    </div>
                    <Money amount={Number(connection.current_balance || 0)} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Daily Cash Tracking</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2">Date</th>
                <th className="py-2">Revenue</th>
                <th className="py-2">Supplier Spend</th>
                <th className="py-2 text-right">Net</th>
              </tr>
            </thead>
            <tbody>
              {dailySeries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-muted-foreground">
                    No transactions in this range.
                  </td>
                </tr>
              ) : (
                dailySeries.map((row) => (
                  <tr key={row.date} className="border-b last:border-none">
                    <td className="py-2">{format(new Date(row.date), "MMM dd, yyyy")}</td>
                    <td className="py-2">
                      <Money amount={row.revenue} />
                    </td>
                    <td className="py-2">
                      <Money amount={row.expenses} />
                    </td>
                    <td className={`py-2 text-right ${row.net < 0 ? "text-destructive font-semibold" : ""}`}>
                      <Money amount={row.net} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
