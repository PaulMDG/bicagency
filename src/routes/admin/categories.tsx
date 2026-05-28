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
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/categories")({ component: Categories });

function Categories() {
  const qc = useQueryClient();
  const { data: cats } = useQuery({ queryKey: ["adm-cats"], queryFn: async () => (await supabase.from("categories").select("*")).data ?? [] });
  const [form, setForm] = useState({ name: "", slug: "", description: "", image_url: "", seo_title: "", seo_description: "" });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("categories").insert({ ...form, slug: form.slug || slugify(form.name) });
    if (error) toast.error(error.message);
    else { toast.success("Category added"); setForm({ name: "", slug: "", description: "", image_url: "", seo_title: "", seo_description: "" }); qc.invalidateQueries({ queryKey: ["adm-cats"] }); }
  }
  async function del(id: string) {
    if (!confirm("Delete?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toast.error(error.message); else { qc.invalidateQueries({ queryKey: ["adm-cats"] }); }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_360px]">
      <div>
        <h1 className="mb-4 font-display text-2xl">Categories</h1>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs"><tr><th className="p-3">Image</th><th>Name</th><th>Slug</th><th></th></tr></thead>
            <tbody>
              {(cats ?? []).map((c: any) => (
                <tr key={c.id} className="border-t">
                  <td className="p-2">{c.image_url && <img src={c.image_url} className="size-10 rounded object-cover" alt="" />}</td>
                  <td>{c.name}</td><td className="font-mono text-xs">{c.slug}</td>
                  <td><Button size="sm" variant="ghost" onClick={() => del(c.id)}><Trash2 className="size-3.5 text-destructive" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <form onSubmit={save} className="space-y-3 rounded-xl border bg-card p-5">
        <h2 className="font-medium">Add category</h2>
        <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
        <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto" /></div>
        <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div><Label>Image URL</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
        <div><Label>SEO title</Label><Input value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} /></div>
        <div><Label>SEO description</Label><Textarea value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} /></div>
        <Button type="submit">Add</Button>
      </form>
    </div>
  );
}