import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatKES } from "@/lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/orders/$id")({ component: OrderDetail });

const STATUSES = ["new", "confirmed", "processing", "shipped", "delivered", "cancelled"];

function OrderDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: o } = useQuery({
    queryKey: ["adm-order", id],
    queryFn: async () => (await supabase.from("orders").select("*, customers(*), order_items(*), payments(*)").eq("id", id).maybeSingle()).data,
  });
  if (!o) return <div>Loading…</div>;
  async function setStatus(s: string) {
    const { error } = await supabase.from("orders").update({ order_status: s }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["adm-order", id] }); }
  }
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-display text-2xl">Order {o.order_number}</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-4 text-sm">
          <div className="font-medium">Customer</div>
          <div>{o.customers?.name}</div><div>{o.customers?.phone}</div><div>{o.customers?.email}</div>
          <div className="mt-2 text-muted-foreground">{o.delivery_location}</div>
        </div>
        <div className="rounded-xl border bg-card p-4 text-sm">
          <div className="font-medium">Status</div>
          <div className="mt-2 flex items-center gap-2 text-xs">Payment: <span className="capitalize">{o.payment_status}</span></div>
          <div className="mt-2">
            <Select value={o.order_status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-2 font-medium">Items</div>
        <table className="w-full text-sm"><tbody>
          {o.order_items?.map((i: any) => (
            <tr key={i.id} className="border-t"><td className="p-2">{i.product_name} <span className="text-xs text-muted-foreground">({i.purchase_type})</span></td><td>x{i.quantity}</td><td>{formatKES(Number(i.line_total))}</td></tr>
          ))}
          <tr className="border-t font-semibold"><td className="p-2" colSpan={2}>Total</td><td>{formatKES(Number(o.total))}</td></tr>
        </tbody></table>
      </div>
    </div>
  );
}