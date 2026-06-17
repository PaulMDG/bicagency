import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StoreLayout } from "@/components/layout/StoreLayout";
import { ProductCard, type ProductCardData } from "@/components/store/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/category/$slug")({
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const { data: category } = useQuery({
    queryKey: ["cat", slug],
    queryFn: async () => (await supabase.from("categories").select("*").eq("slug", slug).maybeSingle()).data,
  });
  const { data: products, isLoading } = useQuery<ProductCardData[]>({
    queryKey: ["cat-products", slug],
    queryFn: async () => {
      if (!category?.id) return [];
      const links = await supabase.from("product_categories").select("product_id").eq("category_id", category.id);
      const ids = (links.data ?? []).map((r: any) => r.product_id);
      if (ids.length === 0) return [];
      const { data } = await supabase.from("products")
        .select("id,name,slug,retail_price,wholesale_price,wholesale_available,preorder_available,retail_stock,product_images(image_url,is_primary,sort_order)")
        .eq("is_active", true).in("id", ids);
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
    enabled: !!category?.id,
  });
  return (
    <StoreLayout>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <nav className="mb-2 text-sm text-muted-foreground"><Link to="/" className="hover:text-primary">Home</Link> / Categories / <span className="text-foreground">{category?.name}</span></nav>
        <h1 className="font-display text-3xl">{category?.name ?? "Category"}</h1>
        {category?.description && <p className="mt-2 text-muted-foreground">{category.description}</p>}
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)
            : (products ?? []).map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </div>
    </StoreLayout>
  );
}