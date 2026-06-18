import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatKES } from "@/lib/format";
import { Plus, Trash2, Pencil, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/admin/products/")({ component: AdminProducts });

function AdminProducts() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  useEffect(() => { setPage(1); }, [q]);
  const { data } = useQuery({
    queryKey: ["admin-products", q, page],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      let qb = supabase
        .from("products")
        .select("id,name,sku,retail_price,retail_stock,is_active,wholesale_available,preorder_available,categories!products_category_id_fkey(name)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (q.trim()) qb = qb.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
      const { data, count } = await qb;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });
  const products = data?.rows ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function del(id: string) {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-products"] }); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Products</h1>
        <Button asChild><Link to="/admin/products/new"><Plus className="size-4" /> Add product</Link></Button>
      </div>
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or SKU…" className="pl-9" />
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs"><tr><th className="p-3">Name</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th><th>Types</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {products.map((p: any) => (
              <tr key={p.id} className="border-t">
                <td className="p-3 font-medium">{p.name}</td>
                <td className="font-mono text-xs">{p.sku}</td>
                <td>{p.categories?.name ?? "—"}</td>
                <td>{formatKES(Number(p.retail_price))}</td>
                <td>{p.retail_stock}</td>
                <td className="text-xs">{["retail", p.wholesale_available && "wholesale", p.preorder_available && "preorder"].filter(Boolean).join(", ")}</td>
                <td>{p.is_active ? "Active" : "Inactive"}</td>
                <td className="space-x-1 whitespace-nowrap p-2">
                  <Button asChild size="sm" variant="ghost"><Link to="/admin/products/$id/edit" params={{ id: p.id }}><Pencil className="size-3.5" /></Link></Button>
                  <Button size="sm" variant="ghost" onClick={() => del(p.id)}><Trash2 className="size-3.5 text-destructive" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {total === 0 ? "No products" : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
        </span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
          <span>Page {page} of {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
        </div>
      </div>
    </div>
  );
}