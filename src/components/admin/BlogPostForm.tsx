import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { slugify } from "@/lib/format";
import { uploadImage } from "@/lib/storage";
import { sanitizeHtml } from "@/lib/safe-html";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Form = {
  slug: string; title: string; excerpt: string; content_html: string;
  cover_image_url: string; author: string; published: boolean;
  seo_title: string; seo_description: string;
};
const empty: Form = { slug: "", title: "", excerpt: "", content_html: "", cover_image_url: "", author: "", published: false, seo_title: "", seo_description: "" };

export function BlogPostForm({ postId }: { postId?: string }) {
  const navigate = useNavigate();
  const [form, setForm] = useState<Form>(empty);
  const [loading, setLoading] = useState(!!postId);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!postId) return;
    (async () => {
      const { data } = await supabase.from("blog_posts").select("*").eq("id", postId).maybeSingle();
      if (data) setForm({
        slug: data.slug, title: data.title, excerpt: data.excerpt ?? "",
        content_html: data.content_html ?? "", cover_image_url: data.cover_image_url ?? "",
        author: data.author ?? "", published: data.published,
        seo_title: data.seo_title ?? "", seo_description: data.seo_description ?? "",
      });
      setLoading(false);
    })();
  }, [postId]);

  async function onCover(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setUploading(true);
    try {
      const url = await uploadImage({ bucket: "blog-images", file: f, maxWidth: 1600 });
      setForm((p) => ({ ...p, cover_image_url: url }));
    } catch (err: any) { toast.error(err.message); }
    finally { setUploading(false); }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      slug: form.slug || slugify(form.title),
      content_html: sanitizeHtml(form.content_html),
      published_at: form.published ? new Date().toISOString() : null,
    };
    const op = postId
      ? supabase.from("blog_posts").update(payload).eq("id", postId)
      : supabase.from("blog_posts").insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Saved"); navigate({ to: "/admin/blog" }); }
  }

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;
  return (
    <form onSubmit={save} className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-display text-2xl">{postId ? "Edit" : "New"} blog post</h1>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
        <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto from title" /></div>
        <div><Label>Author</Label><Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></div>
        <div className="md:col-span-2"><Label>Excerpt</Label><Textarea rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} /></div>
        <div className="md:col-span-2">
          <Label>Cover image</Label>
          {form.cover_image_url && <img src={form.cover_image_url} alt="" className="my-2 max-h-40 rounded-md object-cover" />}
          <Input type="file" accept="image/*" onChange={onCover} disabled={uploading} />
          {uploading && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" /> Uploading…</p>}
        </div>
        <div className="md:col-span-2">
          <Label>Content (HTML — basic tags allowed)</Label>
          <Textarea rows={14} value={form.content_html} onChange={(e) => setForm({ ...form, content_html: e.target.value })} className="font-mono text-xs" />
          <p className="mt-1 text-xs text-muted-foreground">Use HTML tags like &lt;p&gt;, &lt;h2&gt;, &lt;ul&gt;, &lt;strong&gt;, &lt;a href="…"&gt;.</p>
        </div>
        <div><Label>SEO title</Label><Input value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} /></div>
        <div><Label>SEO description</Label><Input value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} /></div>
        <label className="flex items-center gap-2 md:col-span-2"><Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} /> Published</label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        <Button type="button" variant="outline" onClick={() => navigate({ to: "/admin/blog" })}>Cancel</Button>
      </div>
    </form>
  );
}
