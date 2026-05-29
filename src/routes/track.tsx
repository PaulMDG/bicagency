import { createFileRoute, Link } from "@tanstack/react-router";
import { StoreLayout } from "@/components/layout/StoreLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatKES, isValidKenyanPhone } from "@/lib/format";
import { CheckCircle2, Circle, Loader2, Package, Search, Truck } from "lucide-react";

export const Route = createFileRoute("/track")({
  validateSearch: (s: Record<string, unknown>) => ({
    order: typeof s.order === "string" ? s.order : "",
    phone: typeof s.phone === "string" ? s.phone : "",
  }),
  head: () => ({
    meta: [
      { title: "Track your order — Sokoni KE" },
      { name: "description", content: "Check the status of your order, payment and delivery progress." },
    ],
  }),
  component: TrackPage,
});

type TrackResult = {
  error?: string;
  order?: any;
  items?: any[];
  payment?: any;
};

const STEPS = ["new", "confirmed", "processing", "shipped", "delivered"] as const;

function TrackPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [orderNumber, setOrderNumber] = useState(search.order);
  const [phone, setPhone] = useState(search.phone);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function lookup(e?: React.FormEvent) {
    e?.preventDefault();
    setFormError(null);
    if (!orderNumber.trim()) return setFormError("Enter your order number.");
    if (!isValidKenyanPhone(phone)) return setFormError("Enter the phone number used at checkout.");
    setLoading(true); setResult(null);
    try {
      const { data, error } = await supabase.rpc("track_order", {
        p_order_number: orderNumber.trim(),
        p_phone: phone.trim(),
      });
      if (error) throw error;
      setResult(data as TrackResult);
      navigate({ search: { order: orderNumber.trim(), phone: phone.trim() }, replace: true });
    } catch (err: any) {
      setFormError(err.message ?? "Lookup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <StoreLayout>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-3xl">Track your order</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter your order number and the phone number you used at checkout.</p>
        <form onSubmit={lookup} className="mt-6 grid gap-3 rounded-2xl border bg-card p-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div>
            <Label>Order number</Label>
            <Input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="ORD-20260001" className="mt-1" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XXXXXXXX" className="mt-1" />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Track
          </Button>
          {formError && <div className="text-sm text-destructive md:col-span-3">{formError}</div>}
        </form>

        {result?.error && (
          <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{result.error}</div>
        )}
        {result?.order && <OrderDetail data={result} />}
      </div>
    </StoreLayout>
  );
}

function OrderDetail({ data }: { data: TrackResult }) {
  const o = data.order!;
  const items = data.items ?? [];
  const pay = data.payment;
  const cancelled = o.order_status === "cancelled";
  const currentIdx = cancelled ? -1 : Math.max(0, STEPS.indexOf(o.order_status as any));

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <div className="text-xs text-muted-foreground">Order</div>
            <div className="font-mono text-lg font-semibold">{o.order_number}</div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>Placed {new Date(o.created_at).toLocaleString()}</div>
            <div>Updated {new Date(o.updated_at).toLocaleString()}</div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
          <Stat label="Payment" value={<span className="capitalize">{o.payment_status}</span>} accent={o.payment_status === "paid" ? "text-mpesa" : o.payment_status === "failed" ? "text-destructive" : ""} />
          <Stat label="Method" value={<span className="capitalize">{o.payment_method ?? "—"}</span>} />
          <Stat label="Total" value={formatKES(Number(o.total))} />
        </div>
        {pay?.mpesa_receipt && (
          <div className="mt-3 text-xs text-muted-foreground">M-Pesa receipt: <span className="font-mono text-foreground">{pay.mpesa_receipt}</span></div>
        )}
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <h2 className="font-medium">Delivery progress</h2>
        {cancelled ? (
          <div className="mt-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">This order was cancelled.</div>
        ) : (
          <ol className="mt-4 grid gap-3">
            {STEPS.map((s, i) => {
              const done = i <= currentIdx;
              const active = i === currentIdx;
              return (
                <li key={s} className={`flex items-center gap-3 text-sm ${done ? "text-foreground" : "text-muted-foreground"}`}>
                  {done ? <CheckCircle2 className={`size-5 ${active ? "text-accent" : "text-primary"}`} /> : <Circle className="size-5" />}
                  <span className="capitalize">{s}</span>
                  {s === "shipped" && done && <Truck className="size-4 text-primary" />}
                  {s === "delivered" && done && <Package className="size-4 text-primary" />}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <h2 className="font-medium">Items</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {items.map((i, idx) => (
            <li key={idx} className="flex justify-between">
              <span>{i.product_name} <span className="text-muted-foreground">x{i.quantity}</span> <span className="text-xs text-muted-foreground capitalize">({i.purchase_type})</span></span>
              <span>{formatKES(Number(i.line_total))}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between font-semibold"><span>Total</span><span>{formatKES(Number(o.total))}</span></div>
      </div>

      <div className="text-sm">
        <Link to="/products" className="text-primary hover:underline">Continue shopping →</Link>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 font-medium ${accent ?? ""}`}>{value}</div>
    </div>
  );
}