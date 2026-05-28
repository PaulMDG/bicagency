import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatKES } from "@/lib/format";
import { ShoppingCart, Package, AlertCircle, DollarSign } from "lucide-react";

export const Route = createFileRoute("/admin/")({ component: Dashboard });

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [orders, todayOrders, pending, outOfStock] = await Promise.all([
        supabase.from("orders").select("id,total", { count: "exact" }),
        supabase.from("orders").select("total").gte("created_at", today.toISOString()),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("order_status", "new"),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("retail_stock", 0),
      ]);
      return {
        totalOrders: orders.count ?? 0,
        todayRevenue: (todayOrders.data ?? []).reduce((s, o) => s + Number(o.total), 0),
        pendingOrders: pending.count ?? 0,
        outOfStock: outOfStock.count ?? 0,
      };
    },
  });
  const { data: recent } = useQuery({
    queryKey: ["recent-orders"],
    queryFn: async () => (await supabase.from("orders").select("id,order_number,total,order_status,payment_status,created_at").order("created_at", { ascending: false }).limit(10)).data ?? [],
  });

  const cards = [
    { l: "Total orders", v: stats?.totalOrders ?? "—", i: <ShoppingCart /> },
    { l: "Revenue today", v: formatKES(stats?.todayRevenue ?? 0), i: <DollarSign /> },
    { l: "Pending orders", v: stats?.pendingOrders ?? "—", i: <AlertCircle /> },
    { l: "Out of stock", v: stats?.outOfStock ?? "—", i: <Package /> },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.l} className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><div className="text-primary">{c.i}</div>{c.l}</div>
            <div className="mt-2 font-display text-2xl">{c.v}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Recent orders</h2>
          <Link to="/admin/orders" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Order</th><th>Date</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>
            {(recent ?? []).map((o) => (
              <tr key={o.id} className="border-t">
                <td className="py-2 font-mono text-xs">{o.order_number}</td>
                <td>{new Date(o.created_at).toLocaleString()}</td>
                <td>{formatKES(Number(o.total))}</td>
                <td className="capitalize">{o.order_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}