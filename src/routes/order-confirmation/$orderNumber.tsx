import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StoreLayout } from "@/components/layout/StoreLayout";
import { Button } from "@/components/ui/button";
import { formatKES } from "@/lib/format";
import { CheckCircle2, Package } from "lucide-react";

export const Route = createFileRoute("/order-confirmation/$orderNumber")({
  component: Confirmation,
});

function Confirmation() {
  const { orderNumber } = Route.useParams();
  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderNumber],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("order_number", orderNumber)
        .maybeSingle();
      return data;
    },
  });

  return (
    <StoreLayout>
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-2xl border bg-card p-8 text-center">
          <CheckCircle2 className="mx-auto size-12 text-mpesa" />
          <h1 className="mt-3 font-display text-3xl">Thank you for your order!</h1>
          <p className="mt-2 text-muted-foreground">Your order number is</p>
          <div className="mt-2 font-mono text-lg font-semibold">{orderNumber}</div>
          {isLoading ? null : order ? (
            <div className="mt-6 text-left">
              <div className="text-sm text-muted-foreground">Status: <span className="font-medium capitalize text-foreground">{order.order_status}</span> · Payment: <span className="font-medium capitalize text-foreground">{order.payment_status}</span></div>
              <hr className="my-4" />
              <ul className="space-y-2 text-sm">
                {order.order_items?.map((i: any) => (
                  <li key={i.id} className="flex justify-between">
                    <span>{i.product_name} <span className="text-muted-foreground">x{i.quantity}</span> <span className="text-xs text-muted-foreground capitalize">({i.purchase_type})</span></span>
                    <span>{formatKES(Number(i.line_total))}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex justify-between font-semibold"><span>Total</span><span>{formatKES(Number(order.total))}</span></div>
              {order.order_items?.some((i: any) => i.purchase_type === "preorder") && (
                <div className="mt-4 flex items-start gap-2 rounded-md bg-accent/10 p-3 text-sm">
                  <Package className="mt-0.5 size-4" /> Includes preorder items — we'll update you with delivery details.
                </div>
              )}
            </div>
          ) : null}
          <Button asChild className="mt-6"><Link to="/products">Continue shopping</Link></Button>
        </div>
      </div>
    </StoreLayout>
  );
}