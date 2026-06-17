import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { slugify } from "@/lib/format";
import { toast } from "sonner";
import { Trash2, Plus, ChevronRight } from "lucide-react";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Pencil } from "lucide-react";

export const Route = createFileRoute("/admin/categories")({ component: Categories });

function Categories() {
  const qc = useQueryClient();
  const { data: cats } = useQuery({ queryKey: ["adm-cats"], queryFn: async () => (await supabase.from("categories").select("*").order("sort_order").order("name")).data ?? [] });
  const { data: subs } = useQuery({ queryKey: ["adm-subs"], queryFn: async () => (await supabase.from("subcategories").select("*").order("sort_order").order("name")).data ?? [] });
  const [form, setForm] = useState({ name: "", slug: "", description: "", image_url: "", seo_title: "", seo_description: "" });
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [subForm, setSubForm] = useState({ name: "", slug: "" });
  const [editCat, setEditCat] = useState<any | null>(null);
  const [editSub, setEditSub] = useState<any | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("categories").insert({ ...form, slug: form.slug || slugify(form.name) });
    if (error) toast.error(error.message);
    else { toast.success("Category added"); setForm({ name: "", slug: "", description: "", image_url: "", seo_title: "", seo_description: "" }); qc.invalidateQueries({ queryKey: ["adm-cats"] }); }
  }
  async function del(id: string) {
    if (!confirm("Delete category and all its subcategories?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["adm-cats"] });
  }
  async function addSub(categoryId: string) {
    if (!subForm.name) return;
    const { error } = await supabase.from("subcategories").insert({
      category_id: categoryId, name: subForm.name, slug: subForm.slug || slugify(subForm.name),
    });
    if (error) toast.error(error.message);
    else { setSubForm({ name: "", slug: "" }); qc.invalidateQueries({ queryKey: ["adm-subs"] }); toast.success("Subcategory added"); }
  }
  async function delSub(id: string) {
    if (!confirm("Delete subcategory?")) return;
    const { error } = await supabase.from("subcategories").delete().eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["adm-subs"] });
  }

  async function saveCat(e: React.FormEvent) {
    e.preventDefault();
    if (!editCat) return;
    const { id, name, slug, description, image_url, seo_title, seo_description } = editCat;
    const { error } = await supabase.from("categories")
      .update({ name, slug: slug || slugify(name), description, image_url, seo_title, seo_description })
      .eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Updated"); setEditCat(null); qc.invalidateQueries({ queryKey: ["adm-cats"] }); }
  }
  async function saveSub(e: React.FormEvent) {
    e.preventDefault();
    if (!editSub) return;
    const { id, name, slug } = editSub;
    const { error } = await supabase.from("subcategories")
      .update({ name, slug: slug || slugify(name) })
      .eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Updated"); setEditSub(null); qc.invalidateQueries({ queryKey: ["adm-subs"] }); }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_360px]">
      <div>
        <h1 className="mb-4 font-display text-2xl">Categories</h1>
        <div className="space-y-2">
          {(cats ?? []).map((c: any) => {
            const mySubs = (subs ?? []).filter((s: any) => s.category_id === c.id);
            const isOpen = openCat === c.id;
            return (
              <div key={c.id} className="rounded-xl border bg-card">
                <div className="flex w-full items-center gap-3 p-3 text-left">
                  <button type="button" onClick={() => setOpenCat(isOpen ? null : c.id)} className="flex flex-1 items-center gap-3">
                    <ChevronRight className={`size-4 transition ${isOpen ? "rotate-90" : ""}`} />
                    {c.image_url && <img src={c.image_url} className="size-10 rounded object-cover" alt="" />}
                    <div className="flex-1 text-left">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">/{c.slug} · {mySubs.length} subcategories</div>
                    </div>
                  </button>
                  <Button size="sm" variant="ghost" onClick={() => setEditCat({ ...c })}><Pencil className="size-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => del(c.id)}><Trash2 className="size-3.5 text-destructive" /></Button>
                </div>
                {isOpen && (
                  <div className="space-y-2 border-t bg-muted/30 p-3">
                    {mySubs.length === 0 && <div className="text-xs text-muted-foreground">No subcategories yet.</div>}
                    {mySubs.map((s: any) => (
                      <div key={s.id} className="flex items-center gap-2 rounded-md bg-card px-3 py-1.5 text-sm">
                        <span className="flex-1">{s.name}</span>
                        <span className="font-mono text-xs text-muted-foreground">{s.slug}</span>
                        <Button size="sm" variant="ghost" onClick={() => setEditSub({ ...s })}><Pencil className="size-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => delSub(s.id)}><Trash2 className="size-3 text-destructive" /></Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input placeholder="Subcategory name" value={subForm.name} onChange={(e) => setSubForm({ ...subForm, name: e.target.value })} className="h-9" />
                      <Input placeholder="slug (auto)" value={subForm.slug} onChange={(e) => setSubForm({ ...subForm, slug: e.target.value })} className="h-9 w-32" />
                      <Button type="button" size="sm" onClick={() => addSub(c.id)}><Plus className="size-3.5" /></Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <form onSubmit={save} className="space-y-3 rounded-xl border bg-card p-5">
        <h2 className="font-medium">Add category</h2>
        <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
        <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto" /></div>
        <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div>
          <Label>Image</Label>
          <ImageUploadField bucket="category-images" value={form.image_url} onChange={(v) => setForm({ ...form, image_url: v })} maxWidth={512} label="Upload (auto-resized)" />
        </div>
        <div><Label>SEO title</Label><Input value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} /></div>
        <div><Label>SEO description</Label><Textarea value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} /></div>
        <Button type="submit">Add</Button>
      </form>

      <Dialog open={!!editCat} onOpenChange={(v) => !v && setEditCat(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit category</DialogTitle></DialogHeader>
          {editCat && (
            <form onSubmit={saveCat} className="space-y-3">
              <div><Label>Name</Label><Input value={editCat.name ?? ""} onChange={(e) => setEditCat({ ...editCat, name: e.target.value })} /></div>
              <div><Label>Slug</Label><Input value={editCat.slug ?? ""} onChange={(e) => setEditCat({ ...editCat, slug: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={editCat.description ?? ""} onChange={(e) => setEditCat({ ...editCat, description: e.target.value })} /></div>
              <div><Label>Image</Label>
                <ImageUploadField bucket="category-images" value={editCat.image_url ?? ""} onChange={(v) => setEditCat({ ...editCat, image_url: v })} maxWidth={512} label="Upload (auto-resized)" />
              </div>
              <div><Label>SEO title</Label><Input value={editCat.seo_title ?? ""} onChange={(e) => setEditCat({ ...editCat, seo_title: e.target.value })} /></div>
              <div><Label>SEO description</Label><Textarea value={editCat.seo_description ?? ""} onChange={(e) => setEditCat({ ...editCat, seo_description: e.target.value })} /></div>
              <DialogFooter><Button type="submit">Save</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editSub} onOpenChange={(v) => !v && setEditSub(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit subcategory</DialogTitle></DialogHeader>
          {editSub && (
            <form onSubmit={saveSub} className="space-y-3">
              <div><Label>Name</Label><Input value={editSub.name ?? ""} onChange={(e) => setEditSub({ ...editSub, name: e.target.value })} /></div>
              <div><Label>Slug</Label><Input value={editSub.slug ?? ""} onChange={(e) => setEditSub({ ...editSub, slug: e.target.value })} /></div>
              <DialogFooter><Button type="submit">Save</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}