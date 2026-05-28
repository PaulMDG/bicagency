import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { slugify } from "@/lib/format";
import { useEffect } from "react";

interface FormVals {
  name: string; sku: string; slug: string; category_id: string; description: string;
  retail_price: number; wholesale_price?: number | null; preorder_price?: number | null;
  retail_stock: number; wholesale_available: boolean; preorder_available: boolean;
  wholesale_moq: number; preorder_moq: number; preorder_fallback: string;
  estimated_delivery_days?: number | null; is_featured: boolean; is_active: boolean;
  image_url: string;
}

export function ProductForm({ productId }: { productId?: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: cats } = useQuery({ queryKey: ["form-cats"], queryFn: async () => (await supabase.from("categories").select("id,name")).data ?? [] });
  const { data: existing } = useQuery({
    queryKey: ["product-edit", productId],
    queryFn: async () => productId ? (await supabase.from("products").select("*, product_images(image_url)").eq("id", productId).maybeSingle()).data : null,
    enabled: !!productId,
  });

  const form = useForm<FormVals>({
    defaultValues: {
      name: "", sku: "", slug: "", category_id: "", description: "",
      retail_price: 0, wholesale_price: null, preorder_price: null,
      retail_stock: 0, wholesale_available: false, preorder_available: false,
      wholesale_moq: 1, preorder_moq: 1, preorder_fallback: "retail",
      estimated_delivery_days: null, is_featured: false, is_active: true, image_url: "",
    },
  });

  useEffect(() => {
    if (existing) {
      form.reset({
        ...existing,
        image_url: existing.product_images?.[0]?.image_url ?? "",
        wholesale_price: existing.wholesale_price ?? null,
        preorder_price: existing.preorder_price ?? null,
      } as any);
    }
  }, [existing]);

  async function onSubmit(v: FormVals) {
    const payload = {
      name: v.name, sku: v.sku || null, slug: v.slug || slugify(v.name),
      category_id: v.category_id || null, description: v.description,
      retail_price: v.retail_price, wholesale_price: v.wholesale_price || null,
      preorder_price: v.preorder_price || null, retail_stock: v.retail_stock,
      wholesale_available: v.wholesale_available, preorder_available: v.preorder_available,
      wholesale_moq: v.wholesale_moq, preorder_moq: v.preorder_moq,
      preorder_fallback: v.preorder_fallback,
      estimated_delivery_days: v.estimated_delivery_days || null,
      is_featured: v.is_featured, is_active: v.is_active,
    };
    try {
      let id = productId;
      if (productId) {
        const { error } = await supabase.from("products").update(payload).eq("id", productId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert(payload).select().single();
        if (error) throw error; id = data.id;
      }
      if (v.image_url && id) {
        await supabase.from("product_images").delete().eq("product_id", id);
        await supabase.from("product_images").insert({ product_id: id, image_url: v.image_url, is_primary: true, sort_order: 0 });
      }
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      navigate({ to: "/admin/products" });
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-2xl">{productId ? "Edit product" : "Add product"}</h1>
      <section className="space-y-3 rounded-xl border bg-card p-5">
        <h2 className="font-medium">Basic info</h2>
        <Row><F label="Name"><Input {...form.register("name", { required: true })} onBlur={(e) => !form.getValues("slug") && form.setValue("slug", slugify(e.target.value))} /></F><F label="SKU"><Input {...form.register("sku")} /></F></Row>
        <Row><F label="Slug"><Input {...form.register("slug")} /></F><F label="Category">
          <Select value={form.watch("category_id")} onValueChange={(v) => form.setValue("category_id", v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{(cats ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </F></Row>
        <F label="Description"><Textarea rows={4} {...form.register("description")} /></F>
        <F label="Primary image URL"><Input {...form.register("image_url")} placeholder="https://…" /></F>
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-5">
        <h2 className="font-medium">Pricing & stock</h2>
        <Row>
          <F label="Retail price (KES)"><Input type="number" step="0.01" {...form.register("retail_price", { valueAsNumber: true, required: true })} /></F>
          <F label="Retail stock"><Input type="number" {...form.register("retail_stock", { valueAsNumber: true })} /></F>
        </Row>
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between"><h2 className="font-medium">Wholesale</h2><Switch checked={form.watch("wholesale_available")} onCheckedChange={(v) => form.setValue("wholesale_available", v)} /></div>
        <Row>
          <F label="Wholesale price"><Input type="number" step="0.01" {...form.register("wholesale_price", { valueAsNumber: true })} /></F>
          <F label="Wholesale MOQ"><Input type="number" {...form.register("wholesale_moq", { valueAsNumber: true })} /></F>
        </Row>
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between"><h2 className="font-medium">Preorder</h2><Switch checked={form.watch("preorder_available")} onCheckedChange={(v) => form.setValue("preorder_available", v)} /></div>
        <Row>
          <F label="Preorder price"><Input type="number" step="0.01" {...form.register("preorder_price", { valueAsNumber: true })} /></F>
          <F label="Preorder MOQ"><Input type="number" {...form.register("preorder_moq", { valueAsNumber: true })} /></F>
        </Row>
        <Row>
          <F label="Fallback rule">
            <Select value={form.watch("preorder_fallback")} onValueChange={(v) => form.setValue("preorder_fallback", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="retail">Fallback to retail</SelectItem><SelectItem value="block">Block below MOQ</SelectItem></SelectContent>
            </Select>
          </F>
          <F label="Estimated delivery (days)"><Input type="number" {...form.register("estimated_delivery_days", { valueAsNumber: true })} /></F>
        </Row>
      </section>

      <section className="flex items-center gap-6 rounded-xl border bg-card p-5">
        <label className="flex items-center gap-2"><Switch checked={form.watch("is_featured")} onCheckedChange={(v) => form.setValue("is_featured", v)} /> Featured</label>
        <label className="flex items-center gap-2"><Switch checked={form.watch("is_active")} onCheckedChange={(v) => form.setValue("is_active", v)} /> Active</label>
      </section>

      <div className="flex gap-2">
        <Button type="submit">Save product</Button>
        <Button type="button" variant="ghost" onClick={() => navigate({ to: "/admin/products" })}>Cancel</Button>
      </div>
    </form>
  );
}
const Row = ({ children }: { children: React.ReactNode }) => <div className="grid gap-3 md:grid-cols-2">{children}</div>;
const F = ({ label, children }: { label: string; children: React.ReactNode }) => <div><Label>{label}</Label><div className="mt-1">{children}</div></div>;