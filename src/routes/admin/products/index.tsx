import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatKES } from "@/lib/format";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/products/")({ component: AdminProducts });

function AdminProducts() {
  const qc = useQueryClient();
  const { data: products } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => (await supabase.from("products").select("id,name,sku,retail_price,retail_stock,is_active,wholesale_available,preorder_available,categories(name)").order("created_at", { ascending: false })).data ?? [],
  });

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
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs"><tr><th className="p-3">Name</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th><th>Types</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {(products ?? []).map((p: any) => (
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
    </div>
  );
}