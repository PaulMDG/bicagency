import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatKES } from "@/lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSettings, buildWaUrl, renderTemplate } from "@/hooks/useSettings";
import { MessageCircle } from "lucide-react";

export const Route = createFileRoute("/admin/orders/$id")({ component: OrderDetail });

const STATUSES = ["new", "confirmed", "processing", "shipped", "delivered", "cancelled"];

function OrderDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: settings } = useSettings();
  const { data: o } = useQuery({
    queryKey: ["adm-order", id],
    queryFn: async () => (await supabase.from("orders").select("*, customers(*), order_items(*), payments(*)").eq("id", id).maybeSingle()).data,
  });
  if (!o) return <div>Loading…</div>;
  async function setStatus(s: string) {
    const { error } = await supabase.from("orders").update({ order_status: s }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["adm-order", id] }); }
  }
  function notify(kind: "paid" | "shipped" | "delivered" | "failed" | "confirmed") {
    const tplKey = `wa_template_${kind}`;
    const fallback: Record<string, string> = {
      paid: "Hi {customer_name}, we've received your payment for order {order_number}. Total: KES {total}. Thank you!",
      confirmed: "Hi {customer_name}, your order {order_number} is confirmed. We'll update you when it ships.",
      shipped: "Hi {customer_name}, order {order_number} has shipped and is on the way.",
      delivered: "Hi {customer_name}, order {order_number} was delivered. Enjoy!",
      failed: "Hi {customer_name}, payment for order {order_number} failed. Please retry on our site.",
    };
    const tpl = settings?.[tplKey] ?? fallback[kind];
    const msg = renderTemplate(tpl, {
      customer_name: o.customers?.name ?? "",
      order_number: o.order_number,
      total: Number(o.total).toLocaleString(),
    });
    const phone = (o.customers?.phone ?? "").replace(/\D/g, "");
    window.open(buildWaUrl(phone, msg), "_blank");
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
        <div className="mb-2 font-medium">Notify customer on WhatsApp</div>
        <p className="mb-3 text-xs text-muted-foreground">Opens WhatsApp with a pre-filled message to {o.customers?.phone}. Edit templates in Settings → WhatsApp.</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => notify("confirmed")}><MessageCircle className="size-4" /> Confirmed</Button>
          <Button size="sm" variant="outline" onClick={() => notify("paid")}><MessageCircle className="size-4" /> Payment received</Button>
          <Button size="sm" variant="outline" onClick={() => notify("shipped")}><MessageCircle className="size-4" /> Shipped</Button>
          <Button size="sm" variant="outline" onClick={() => notify("delivered")}><MessageCircle className="size-4" /> Delivered</Button>
          <Button size="sm" variant="outline" onClick={() => notify("failed")}><MessageCircle className="size-4" /> Payment failed</Button>
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