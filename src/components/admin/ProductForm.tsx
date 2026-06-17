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
import { useEffect, useState } from "react";
import { MultiImageUploader, type ProductImage } from "@/components/admin/MultiImageUploader";
import { ProductLinkInserter } from "@/components/admin/ProductLinkInserter";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { Checkbox } from "@/components/ui/checkbox";

interface FormVals {
  name: string; sku: string; slug: string; category_id: string; description: string;
  retail_price: number; wholesale_price?: number | null; preorder_price?: number | null;
  retail_stock: number; wholesale_available: boolean; preorder_available: boolean;
  wholesale_moq: number; preorder_moq: number; preorder_fallback: string;
  estimated_delivery_days?: number | null; is_featured: boolean; is_active: boolean;
  subcategory_id?: string | null;
  supplier_id?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  video_url?: string | null;
}

export function ProductForm({ productId }: { productId?: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: cats } = useQuery({ queryKey: ["form-cats"], queryFn: async () => (await supabase.from("categories").select("id,name")).data ?? [] });
  const { data: suppliers } = useQuery({ queryKey: ["form-suppliers"], queryFn: async () => (await supabase.from("suppliers").select("id,name").order("name")).data ?? [] });
  const { data: existing } = useQuery({
    queryKey: ["product-edit", productId],
    queryFn: async () => productId ? (await supabase.from("products").select("*, product_images(image_url,is_primary,sort_order), product_categories(category_id)").eq("id", productId).maybeSingle()).data : null,
    enabled: !!productId,
  });
  const [images, setImages] = useState<ProductImage[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const watchCat = (val: string) => val;
  const { data: subcats } = useQuery({
    queryKey: ["form-subcats", productId],
    queryFn: async () => (await supabase.from("subcategories").select("id,name,category_id")).data ?? [],
  });

  const form = useForm<FormVals>({
    defaultValues: {
      name: "", sku: "", slug: "", category_id: "", description: "",
      retail_price: 0, wholesale_price: null, preorder_price: null,
      retail_stock: 0, wholesale_available: false, preorder_available: false,
      wholesale_moq: 1, preorder_moq: 1, preorder_fallback: "retail",
      estimated_delivery_days: null, is_featured: false, is_active: true,
      subcategory_id: null, supplier_id: null,
      seo_title: "", seo_description: "", video_url: "",
    },
  });

  useEffect(() => {
    if (existing) {
      form.reset({
        ...existing,
        wholesale_price: existing.wholesale_price ?? null,
        preorder_price: existing.preorder_price ?? null,
        subcategory_id: existing.subcategory_id ?? null,
        supplier_id: existing.supplier_id ?? null,
        seo_title: existing.seo_title ?? "",
        seo_description: existing.seo_description ?? "",
        video_url: existing.video_url ?? "",
      } as any);
      const imgs = (existing.product_images ?? []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order);
      setImages(imgs);
      const linked = (existing.product_categories ?? []).map((r: any) => r.category_id);
      const initial = existing.category_id ? Array.from(new Set([existing.category_id, ...linked])) : linked;
      setCategoryIds(initial);
    }
  }, [existing]);

  const currentCat = form.watch("category_id");
  const filteredSubcats = (subcats ?? []).filter((s: any) => s.category_id === currentCat);

  async function onSubmit(v: FormVals) {
    const primaryCat = v.category_id || categoryIds[0] || null;
    const allCats = Array.from(new Set([...(primaryCat ? [primaryCat] : []), ...categoryIds]));
    const payload = {
      name: v.name, sku: v.sku || null, slug: v.slug || slugify(v.name),
      category_id: primaryCat, description: v.description,
      retail_price: v.retail_price, wholesale_price: v.wholesale_price || null,
      preorder_price: v.preorder_price || null, retail_stock: v.retail_stock,
      wholesale_available: v.wholesale_available, preorder_available: v.preorder_available,
      wholesale_moq: v.wholesale_moq, preorder_moq: v.preorder_moq,
      preorder_fallback: v.preorder_fallback,
      estimated_delivery_days: v.estimated_delivery_days || null,
      is_featured: v.is_featured, is_active: v.is_active,
      subcategory_id: v.subcategory_id || null,
      supplier_id: v.supplier_id || null,
      seo_title: v.seo_title || null,
      seo_description: v.seo_description || null,
      video_url: v.video_url || null,
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
      if (id) {
        await supabase.from("product_images").delete().eq("product_id", id);
        if (images.length) {
          await supabase.from("product_images").insert(
            images.map((img, i) => ({ product_id: id!, image_url: img.image_url, is_primary: img.is_primary, sort_order: i })),
          );
        }
        await supabase.from("product_categories").delete().eq("product_id", id);
        if (allCats.length) {
          await supabase.from("product_categories").insert(allCats.map((cid) => ({ product_id: id!, category_id: cid })));
        }
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
        <Row><F label="Slug"><Input {...form.register("slug")} /></F><F label="Primary category">
          <Select value={form.watch("category_id")} onValueChange={(v) => { form.setValue("category_id", v); if (!categoryIds.includes(v)) setCategoryIds((prev) => [...prev, v]); }}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{(cats ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </F></Row>
        <F label="Also belongs to (multi-select)">
          <div className="flex flex-wrap gap-3 rounded-md border p-3">
            {(cats ?? []).map((c) => {
              const checked = categoryIds.includes(c.id);
              const isPrimary = form.watch("category_id") === c.id;
              return (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={checked}
                    disabled={isPrimary}
                    onCheckedChange={(v) =>
                      setCategoryIds((prev) => v ? Array.from(new Set([...prev, c.id])) : prev.filter((x) => x !== c.id))
                    }
                  />
                  {c.name}{isPrimary && <span className="text-xs text-muted-foreground">(primary)</span>}
                </label>
              );
            })}
            {(cats ?? []).length === 0 && <p className="text-xs text-muted-foreground">No categories yet.</p>}
          </div>
        </F>
        <Row>
          <F label="Subcategory">
            <Select value={form.watch("subcategory_id") ?? ""} onValueChange={(v) => form.setValue("subcategory_id", v || null)}>
              <SelectTrigger><SelectValue placeholder={currentCat ? "Select subcategory" : "Pick a category first"} /></SelectTrigger>
              <SelectContent>{filteredSubcats.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </F>
          <F label="Supplier">
            <Select value={form.watch("supplier_id") ?? ""} onValueChange={(v) => form.setValue("supplier_id", v || null)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>{(suppliers ?? []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </F>
        </Row>
        <F label="Description">
          <div className="mb-2 flex items-center gap-2">
            <ProductLinkInserter onInsert={(s) => form.setValue("description", (form.getValues("description") || "") + " " + s)} />
            <p className="text-xs text-muted-foreground">What you see is what you get. Use the button to insert links to other products.</p>
          </div>
          <RichTextEditor value={form.watch("description") || ""} onChange={(html) => form.setValue("description", html)} />
        </F>
        <F label="Video URL (YouTube / Vimeo / MP4)">
          <Input type="url" placeholder="https://..." {...form.register("video_url")} />
        </F>
        <F label="Images">
          <MultiImageUploader value={images} onChange={setImages} />
        </F>
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-5">
        <h2 className="font-medium">SEO</h2>
        <F label="SEO title"><Input {...form.register("seo_title")} placeholder="Defaults to product name" /></F>
        <F label="SEO description"><Textarea rows={2} {...form.register("seo_description")} placeholder="Shown in search results & social previews" /></F>
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