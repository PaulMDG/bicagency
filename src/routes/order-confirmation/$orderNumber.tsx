import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StoreLayout } from "@/components/layout/StoreLayout";
import { Button } from "@/components/ui/button";
import { formatKES } from "@/lib/format";
import { CheckCircle2, Package, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSettings, buildWaUrl, renderTemplate } from "@/hooks/useSettings";
import { WhatsAppButton } from "@/components/store/WhatsAppButton";

export const Route = createFileRoute("/order-confirmation/$orderNumber")({
  component: Confirmation,
});

function Confirmation() {
  const { orderNumber } = Route.useParams();
  const { data: settings } = useSettings();
  const [copied, setCopied] = useState(false);
  const phone = (() => {
    try {
      const raw = sessionStorage.getItem(`order:${orderNumber}`);
      return raw ? (JSON.parse(raw).phone as string | undefined) : undefined;
    } catch { return undefined; }
  })();
  const { data: tracked, isLoading } = useQuery({
    queryKey: ["order-confirmation", orderNumber, phone],
    enabled: !!phone,
    queryFn: async () => {
      const { data } = await supabase.rpc("track_order", {
        p_order_number: orderNumber,
        p_phone: phone!,
      });
      const d = data as { order?: any; items?: any[]; error?: string } | null;
      if (!d || d.error) return null;
      return d;
    },
  });
  const order = tracked?.order ?? null;
  const items = tracked?.items ?? [];
  const preorderItems = items.filter((i: any) => i.purchase_type === "preorder");
  const maxEta = 0;

  const summary = items.map((i: any) =>
    `• ${i.product_name} x${i.quantity} (${i.purchase_type}) @ ${Number(i.unit_price).toLocaleString()}`
  ).join("\n");
  const waText = order
    ? renderTemplate(
        settings?.whatsapp_order_template ?? "Order {order_number}\n{items_summary}\nTotal: KES {total}",
        { order_number: order.order_number, items_summary: summary, total: Number(order.total).toLocaleString(), customer_name: "" },
      )
    : "";
  const waUrl = order ? buildWaUrl(settings?.whatsapp_number ?? "254700000000", waText) : "";

  async function copyWa() {
    try { await navigator.clipboard.writeText(waText); setCopied(true); toast.success("Summary copied"); setTimeout(() => setCopied(false), 2000); }
    catch { toast.error("Copy failed"); }
  }

  const typeLabel = (t: string) => t === "preorder" ? "Preorder" : t === "wholesale" ? "Wholesale" : "Retail";

  return (
    <StoreLayout>
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-2xl border bg-card p-8 text-center">
          <CheckCircle2 className="mx-auto size-12 text-mpesa" />
          <h1 className="mt-3 font-display text-3xl">Thank you for your order!</h1>
          <p className="mt-2 text-muted-foreground">Your order number is</p>
          <div className="mt-2 font-mono text-lg font-semibold">{orderNumber}</div>
          {!phone ? (
            <div className="mt-6 rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
              For security, order details are linked to your phone. <Link to="/track" className="text-primary underline">Track your order</Link> using this order number and the phone you used at checkout.
            </div>
          ) : isLoading ? null : order ? (
            <div className="mt-6 text-left">
              <div className="text-sm text-muted-foreground">Status: <span className="font-medium capitalize text-foreground">{order.order_status}</span> · Payment: <span className="font-medium capitalize text-foreground">{order.payment_status}</span></div>
              <hr className="my-4" />
              <ul className="space-y-3 text-sm">
                {items.map((i: any) => {
                  const moq = i.purchase_type === "preorder" ? i.products?.preorder_moq : i.purchase_type === "wholesale" ? i.products?.wholesale_moq : null;
                  const eta = i.purchase_type === "preorder" ? i.products?.estimated_delivery_days : null;
                  return (
                    <li key={i.id} className="rounded-lg border p-3">
                      <div className="flex justify-between gap-2">
                        <div>
                          <div className="font-medium">{i.product_name} <span className="text-muted-foreground">x{i.quantity}</span></div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                            <span className={`rounded-full px-2 py-0.5 ${i.purchase_type === "preorder" ? "bg-accent/15 text-accent-foreground" : i.purchase_type === "wholesale" ? "bg-primary/10 text-primary" : "bg-muted"}`}>{typeLabel(i.purchase_type)}</span>
                            {moq ? <span className="text-muted-foreground">MOQ {moq}</span> : null}
                            {eta ? <span className="text-muted-foreground">· ETA ~{eta} days</span> : null}
                          </div>
                        </div>
                        <div className="whitespace-nowrap">{formatKES(Number(i.line_total))}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 flex justify-between font-semibold"><span>Total</span><span>{formatKES(Number(order.total))}</span></div>
              {preorderItems.length > 0 && (
                <div className="mt-4 flex items-start gap-2 rounded-md bg-accent/10 p-3 text-sm">
                  <Package className="mt-0.5 size-4" />
                  <div>
                    <div className="font-medium">Preorder items included</div>
                    <div className="text-muted-foreground">Estimated delivery in {maxEta || "—"} days. We'll contact you with shipping updates.</div>
                  </div>
                </div>
              )}
              <div className="mt-5 rounded-xl border bg-muted/40 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">WhatsApp order summary</div>
                  <button onClick={copyWa} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    {copied ? <><Check className="size-3" /> Copied</> : <><Copy className="size-3" /> Copy</>}
                  </button>
                </div>
                <pre className="whitespace-pre-wrap break-words text-xs text-foreground">{waText}</pre>
                <WhatsAppButton href={waUrl} className="mt-3 w-full" label="Send via WhatsApp" />
              </div>
            </div>
          ) : null}
          <Button asChild className="mt-6"><Link to="/products">Continue shopping</Link></Button>
        </div>
      </div>
    </StoreLayout>
  );
}