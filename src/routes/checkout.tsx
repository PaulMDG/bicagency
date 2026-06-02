import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { StoreLayout } from "@/components/layout/StoreLayout";
import { useCart } from "@/stores/cart";
import { formatKES, isValidKenyanPhone, normalizeKenyanPhone } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSettings, buildWaUrl, renderTemplate } from "@/hooks/useSettings";
import { Loader2, Smartphone } from "lucide-react";

const schema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(100),
  phone: z.string().refine(isValidKenyanPhone, "Enter a valid Kenyan phone (07XXXXXXXX or 2547XXXXXXXX)"),
  email: z.string().email().max(255).optional().or(z.literal("")),
  delivery_location: z.string().trim().min(3, "Delivery location is required").max(500),
  order_notes: z.string().max(500).optional(),
  mpesa_phone: z.string().optional(),
});

export const Route = createFileRoute("/checkout")({ component: Checkout });

function Checkout() {
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotal());
  const clear = useCart((s) => s.clear);
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const [method, setMethod] = useState<"mpesa" | "whatsapp">("mpesa");
  const [stkStatus, setStkStatus] = useState<"idle" | "waiting" | "success" | "failed">("idle");
  const [submitting, setSubmitting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const purchaseType = items[0]?.purchaseType ?? "retail";
  const hasPreorder = items.some((i) => i.purchaseType === "preorder");

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", phone: "", email: "", delivery_location: "", order_notes: "", mpesa_phone: "" },
  });

  async function placeOrder(values: z.infer<typeof schema>) {
    if (items.length === 0) return;
    setSubmitting(true);
    try {
      const normalized = normalizeKenyanPhone(values.phone)!;
      // Atomic place_order RPC — validates MOQ, checks stock, creates order+items, decrements stock.
      const payload = {
        customer: {
          name: values.name,
          phone: normalized,
          email: values.email || null,
          delivery_location: values.delivery_location,
        },
        auth_user_id: (await supabase.auth.getUser()).data.user?.id ?? null,
        purchase_type: purchaseType,
        payment_method: method,
        order_notes: values.order_notes ?? null,
        items: items.map((i) => ({
          product_id: i.productId,
          product_name: i.name,
          purchase_type: i.purchaseType,
          quantity: i.quantity,
        })),
      };
      const { data, error } = await supabase.rpc("place_order", { payload });
      if (error) throw error;
      const created = data as { order_id: string; order_number: string; total: number };

      if (method === "mpesa") {
        setStkStatus("waiting");
        const mpesaPhone = normalizeKenyanPhone(values.mpesa_phone || values.phone)!;
        const { data: stk, error: stkErr } = await supabase.functions.invoke("mpesa-stk-push", {
          body: { order_id: created.order_id, phone: mpesaPhone, amount: created.total },
        });
        if (stkErr || (stk as any)?.error) {
          setStkStatus("failed");
          toast.error("M-Pesa request failed", { description: (stk as any)?.error ?? stkErr?.message });
          // Order still exists; user can retry from confirmation page.
        } else {
          // Poll order status for up to 90s — callback will flip payment_status to "paid".
          const start = Date.now();
          pollRef.current = setInterval(async () => {
            const { data: o } = await supabase
              .from("orders").select("payment_status").eq("id", created.order_id).maybeSingle();
            if (o?.payment_status === "paid") {
              if (pollRef.current) clearInterval(pollRef.current);
              setStkStatus("success");
            } else if (["failed", "cancelled"].includes(o?.payment_status ?? "")) {
              if (pollRef.current) clearInterval(pollRef.current);
              setStkStatus("failed");
            } else if (Date.now() - start > 90_000) {
              if (pollRef.current) clearInterval(pollRef.current);
            }
          }, 3000);
        }
      } else {
        const tpl = settings?.whatsapp_order_template ?? "Order {order_number} {items_summary} Total: KES {total}";
        const summary = items.map((i) => `• ${i.name} x${i.quantity} (${i.purchaseType}) @ ${i.unitPrice.toLocaleString()}`).join("\n");
        const url = buildWaUrl(
          settings?.whatsapp_number ?? "254700000000",
          renderTemplate(tpl, {
            order_number: created.order_number,
            items_summary: summary,
            total: created.total.toLocaleString(),
            customer_name: values.name,
          }),
        );
        window.open(url, "_blank");
      }

      clear();
      navigate({ to: "/order-confirmation/$orderNumber", params: { orderNumber: created.order_number } });
    } catch (e: any) {
      console.error(e);
      toast.error("Could not place order", { description: e.message });
      setStkStatus("failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return <StoreLayout><div className="p-12 text-center">Your cart is empty.</div></StoreLayout>;
  }

  return (
    <StoreLayout>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[1fr_360px]">
        <form onSubmit={form.handleSubmit(placeOrder)} className="space-y-6">
          <h1 className="font-display text-3xl">Checkout</h1>
          <section className="space-y-3 rounded-xl border bg-card p-5">
            <h2 className="font-medium">Customer details</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Full name" error={form.formState.errors.name?.message}>
                <Input {...form.register("name")} placeholder="Jane Wanjiru" />
              </Field>
              <Field label="Phone (Kenya)" error={form.formState.errors.phone?.message}>
                <Input {...form.register("phone")} placeholder="0712345678" />
              </Field>
              <Field label="Email (optional)" error={form.formState.errors.email?.message}>
                <Input type="email" {...form.register("email")} placeholder="you@example.com" />
              </Field>
            </div>
            <Field label="Delivery location" error={form.formState.errors.delivery_location?.message}>
              <Textarea rows={2} {...form.register("delivery_location")} placeholder="Estate, town, county…" />
            </Field>
            <Field label="Order notes (optional)">
              <Textarea rows={2} {...form.register("order_notes")} />
            </Field>
          </section>

          <section className="space-y-3 rounded-xl border bg-card p-5">
            <h2 className="font-medium">Payment method</h2>
            <RadioGroup value={method} onValueChange={(v) => setMethod(v as any)} className="grid gap-2 md:grid-cols-2">
              <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 ${method === "mpesa" ? "border-mpesa ring-1 ring-mpesa" : ""}`}>
                <RadioGroupItem value="mpesa" />
                <div>
                  <div className="flex items-center gap-2 font-medium text-mpesa"><Smartphone className="size-4" /> Pay via M-Pesa</div>
                  <div className="text-xs text-muted-foreground">Instant STK push to your phone.</div>
                </div>
              </label>
              <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 ${method === "whatsapp" ? "border-whatsapp ring-1 ring-whatsapp" : ""}`}>
                <RadioGroupItem value="whatsapp" />
                <div>
                  <div className="font-medium text-whatsapp">Complete via WhatsApp</div>
                  <div className="text-xs text-muted-foreground">Send your order details to our team.</div>
                </div>
              </label>
            </RadioGroup>
            {method === "mpesa" && (
              <Field label="M-Pesa phone number">
                <Input {...form.register("mpesa_phone")} placeholder="Defaults to your phone above" />
              </Field>
            )}
            {stkStatus !== "idle" && (
              <div className={`rounded-md p-3 text-sm ${stkStatus === "success" ? "bg-mpesa/15 text-mpesa" : stkStatus === "failed" ? "bg-destructive/10 text-destructive" : "bg-muted"}`}>
                {stkStatus === "waiting" && <span className="inline-flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Waiting for M-Pesa confirmation…</span>}
                {stkStatus === "success" && "✓ Payment confirmed"}
                {stkStatus === "failed" && "✗ Payment failed. Please retry."}
              </div>
            )}
          </section>

          <Button type="submit" size="lg" className={`w-full ${method === "mpesa" ? "bg-mpesa text-mpesa-foreground hover:bg-mpesa/90" : "bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90"}`} disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {method === "mpesa" ? `Pay ${formatKES(subtotal)} with M-Pesa` : `Send order via WhatsApp`}
          </Button>
        </form>

        <aside className="md:sticky md:top-20 md:self-start">
          <div className="rounded-xl border bg-card p-5">
            <h2 className="font-medium">Order summary</h2>
            <div className="mt-3 space-y-2 text-sm">
              {items.map((i) => (
                <div key={`${i.productId}-${i.purchaseType}`} className="flex justify-between gap-2">
                  <span className="line-clamp-1">{i.name} <span className="text-muted-foreground">x{i.quantity}</span></span>
                  <span>{formatKES(i.unitPrice * i.quantity)}</span>
                </div>
              ))}
            </div>
            <hr className="my-3" />
            <div className="flex justify-between font-semibold"><span>Total</span><span>{formatKES(subtotal)}</span></div>
            {hasPreorder && <div className="mt-3 rounded-md bg-accent/10 p-2 text-xs">Includes preorder items — see product page for delivery estimates.</div>}
          </div>
        </aside>
      </div>
    </StoreLayout>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-sm">{label}</Label>
      <div className="mt-1">{children}</div>
      {error && <div className="mt-1 text-xs text-destructive">{error}</div>}
    </div>
  );
}