import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/blog")({ component: BlogAdmin });

function BlogAdmin() {
  const qc = useQueryClient();
  const loc = useLocation();
  const isChild = loc.pathname !== "/admin/blog";
  const { data: posts } = useQuery({
    queryKey: ["adm-blog"],
    queryFn: async () => (await supabase.from("blog_posts").select("id,slug,title,published,published_at,created_at").order("created_at", { ascending: false })).data ?? [],
  });
  async function del(id: string) {
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["adm-blog"] });
  }
  if (isChild) return <Outlet />;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Blog</h1>
        <Button asChild size="sm"><Link to="/admin/blog/new"><Plus className="size-4" /> New post</Link></Button>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs"><tr><th className="p-3">Title</th><th>Slug</th><th>Status</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {(posts ?? []).map((p: any) => (
              <tr key={p.id} className="border-t">
                <td className="p-3 font-medium">{p.title}</td>
                <td className="font-mono text-xs">{p.slug}</td>
                <td>{p.published ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Published</span> : <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Draft</span>}</td>
                <td>{new Date(p.created_at).toLocaleDateString()}</td>
                <td className="text-right">
                  <Button asChild size="sm" variant="ghost"><Link to="/admin/blog/$id/edit" params={{ id: p.id }}><Pencil className="size-3" /></Link></Button>
                  <Button size="sm" variant="ghost" onClick={() => del(p.id)}><Trash2 className="size-3 text-destructive" /></Button>
                </td>
              </tr>
            ))}
            {!posts?.length && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No posts yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
