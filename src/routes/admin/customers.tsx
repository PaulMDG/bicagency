import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export const Route = createFileRoute("/admin/customers")({ component: Customers });

function Customers() {
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["adm-customers", q],
    queryFn: async () => {
      let qb = supabase.from("customers").select("id,name,phone,email,delivery_location,user_id,created_at,orders(id,total)").order("created_at", { ascending: false }).limit(500);
      if (q) qb = qb.or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);
      return (await qb).data ?? [];
    },
  });
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl">Customers</h1>
      <Input placeholder="Search name, phone, email" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs"><tr><th className="p-3">Name</th><th>Phone</th><th>Email</th><th>Account</th><th>Orders</th><th>Spent</th><th>First seen</th></tr></thead>
          <tbody>
            {(data ?? []).map((c: any) => {
              const spent = (c.orders ?? []).reduce((s: number, o: any) => s + Number(o.total ?? 0), 0);
              return (
                <tr key={c.id} className="border-t">
                  <td className="p-3 font-medium">{c.name}</td>
                  <td>{c.phone}</td>
                  <td>{c.email ?? "—"}</td>
                  <td>{c.user_id ? "Registered" : "Guest"}</td>
                  <td>{c.orders?.length ?? 0}</td>
                  <td>KES {spent.toLocaleString()}</td>
                  <td>{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              );
            })}
            {!data?.length && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No customers yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
