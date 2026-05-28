import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatKES } from "@/lib/format";

export const Route = createFileRoute("/admin/orders/")({ component: Orders });

function Orders() {
  const { data: orders } = useQuery({
    queryKey: ["adm-orders"],
    queryFn: async () => (await supabase.from("orders").select("*, customers(name,phone)").order("created_at", { ascending: false })).data ?? [],
  });
  function exportCsv() {
    const rows = [["Order#", "Date", "Customer", "Phone", "Type", "Total", "Payment", "Status"]];
    (orders ?? []).forEach((o: any) => rows.push([o.order_number, new Date(o.created_at).toISOString(), o.customers?.name ?? "", o.customers?.phone ?? "", o.purchase_type, String(o.total), o.payment_status, o.order_status]));
    const csv = rows.map((r) => r.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "orders.csv"; a.click();
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="font-display text-2xl">Orders</h1><button onClick={exportCsv} className="text-sm text-primary hover:underline">Export CSV</button></div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs"><tr><th className="p-3">Order #</th><th>Date</th><th>Customer</th><th>Type</th><th>Total</th><th>Payment</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {(orders ?? []).map((o: any) => (
              <tr key={o.id} className="border-t">
                <td className="p-3 font-mono text-xs">{o.order_number}</td>
                <td>{new Date(o.created_at).toLocaleDateString()}</td>
                <td>{o.customers?.name}</td>
                <td className="capitalize">{o.purchase_type}</td>
                <td>{formatKES(Number(o.total))}</td>
                <td className="capitalize">{o.payment_status}</td>
                <td className="capitalize">{o.order_status}</td>
                <td><Link to="/admin/orders/$id" params={{ id: o.id }} className="text-primary hover:underline">View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}