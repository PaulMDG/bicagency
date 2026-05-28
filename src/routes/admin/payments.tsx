import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatKES } from "@/lib/format";

export const Route = createFileRoute("/admin/payments")({ component: Payments });
function Payments() {
  const { data } = useQuery({ queryKey: ["adm-pay"], queryFn: async () => (await supabase.from("payments").select("*, orders(order_number)").order("created_at", { ascending: false })).data ?? [] });
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl">Payments</h1>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs"><tr><th className="p-3">Reference</th><th>Order</th><th>Phone</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>{(data ?? []).map((p: any) => (
            <tr key={p.id} className="border-t"><td className="p-3 font-mono text-xs">{p.payment_reference}</td><td className="font-mono text-xs">{p.orders?.order_number}</td><td>{p.phone_number}</td><td>{formatKES(Number(p.amount ?? 0))}</td><td className="capitalize">{p.status}</td><td>{new Date(p.created_at).toLocaleString()}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}