import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StoreLayout } from "@/components/layout/StoreLayout";
import { ProductCard, type ProductCardData } from "@/components/store/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/products/")({
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s.q === "string" ? s.q : "",
    sort: typeof s.sort === "string" ? s.sort : "newest",
    cat: typeof s.cat === "string" ? s.cat : "",
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { q, sort, cat } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [types, setTypes] = useState<{ wholesale: boolean; preorder: boolean }>({ wholesale: false, preorder: false });

  const { data: categories } = useQuery({
    queryKey: ["all-categories"],
    queryFn: async () => (await supabase.from("categories").select("id,name,slug")).data ?? [],
  });

  const { data: products, isLoading } = useQuery<ProductCardData[]>({
    queryKey: ["products", q, sort, cat, types],
    queryFn: async () => {
      let qb = supabase
        .from("products")
        .select("id,name,slug,retail_price,wholesale_price,wholesale_available,preorder_available,retail_stock,category_id,product_images(image_url,is_primary,sort_order)")
        .eq("is_active", true);
      if (q) qb = qb.ilike("name", `%${q}%`);
      if (cat) {
        const catId = (await supabase.from("categories").select("id").eq("slug", cat).maybeSingle()).data?.id;
        if (catId) qb = qb.eq("category_id", catId);
      }
      if (types.wholesale) qb = qb.eq("wholesale_available", true);
      if (types.preorder) qb = qb.eq("preorder_available", true);
      if (sort === "price-asc") qb = qb.order("retail_price", { ascending: true });
      else if (sort === "price-desc") qb = qb.order("retail_price", { ascending: false });
      else if (sort === "featured") qb = qb.order("is_featured", { ascending: false });
      else qb = qb.order("created_at", { ascending: false });
      const { data, error } = await qb;
      if (error) throw error;
      return (data ?? []).map((p: any) => ({
        id: p.id, name: p.name, slug: p.slug,
        retail_price: Number(p.retail_price),
        wholesale_price: p.wholesale_price ? Number(p.wholesale_price) : null,
        wholesale_available: p.wholesale_available,
        preorder_available: p.preorder_available,
        retail_stock: p.retail_stock,
        image_url: p.product_images?.[0]?.image_url ?? null,
      }));
    },
  });

  return (
    <StoreLayout>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl">All products</h1>
            <p className="text-sm text-muted-foreground">{products?.length ?? 0} products</p>
          </div>
          <Select value={sort} onValueChange={(v) => navigate({ search: (s) => ({ ...s, sort: v }) })}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="price-asc">Price: Low → High</SelectItem>
              <SelectItem value="price-desc">Price: High → Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          <aside className="space-y-6 md:sticky md:top-20 md:self-start">
            <div>
              <div className="mb-2 text-sm font-medium">Category</div>
              <div className="space-y-1 text-sm">
                <button onClick={() => navigate({ search: (s) => ({ ...s, cat: "" }) })} className={`block w-full text-left hover:text-primary ${!cat ? "text-primary font-medium" : ""}`}>All categories</button>
                {(categories ?? []).map((c) => (
                  <button key={c.id} onClick={() => navigate({ search: (s) => ({ ...s, cat: c.slug }) })} className={`block w-full text-left hover:text-primary ${cat === c.slug ? "text-primary font-medium" : ""}`}>{c.name}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium">Purchase type</div>
              <div className="space-y-2 text-sm">
                <label className="flex items-center gap-2"><Checkbox checked={types.wholesale} onCheckedChange={(v) => setTypes((t) => ({ ...t, wholesale: !!v }))} /> Wholesale</label>
                <label className="flex items-center gap-2"><Checkbox checked={types.preorder} onCheckedChange={(v) => setTypes((t) => ({ ...t, preorder: !!v }))} /> Preorder</label>
              </div>
            </div>
          </aside>
          <div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)
                : (products ?? []).map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
            {!isLoading && products?.length === 0 && (
              <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">No products match your filters.</div>
            )}
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}