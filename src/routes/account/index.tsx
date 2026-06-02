import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { StoreLayout } from "@/components/layout/StoreLayout";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatKES } from "@/lib/format";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/account/")({ component: Account });

function Account() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [account, setAccount] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s) navigate({ to: "/account/login" });
    });
    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { navigate({ to: "/account/login" }); return; }
      setUser(u);
      const { data: acc } = await supabase.from("customer_accounts").select("*").eq("user_id", u.id).maybeSingle();
      setAccount(acc);
      const { data: ord } = await supabase.rpc("list_my_orders");
      setOrders((ord as any[]) ?? []);
      setReady(true);
    })();
    return () => subscription.unsubscribe();
  }, [navigate]);

  if (!ready) return <StoreLayout><div className="p-12 text-center text-muted-foreground">Loading…</div></StoreLayout>;

  return (
    <StoreLayout>
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl">My account</h1>
            <p className="mt-1 text-sm text-muted-foreground">{account?.name ?? user?.email}</p>
          </div>
          <Button variant="ghost" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
        <h2 className="mt-10 font-display text-xl">Your orders</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs"><tr><th className="p-3">Order #</th><th>Date</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="p-3 font-mono text-xs">{o.order_number}</td>
                  <td>{new Date(o.created_at).toLocaleDateString()}</td>
                  <td>{formatKES(Number(o.total))}</td>
                  <td className="capitalize">{o.payment_status}</td>
                  <td className="capitalize">{o.order_status}</td>
                </tr>
              ))}
              {!orders.length && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No orders yet. <Link to="/products" className="text-primary underline">Start shopping</Link></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </StoreLayout>
  );
}
