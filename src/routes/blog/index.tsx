import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StoreLayout } from "@/components/layout/StoreLayout";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog & News" },
      { name: "description", content: "Latest news, product updates and stories from our team." },
      { property: "og:title", content: "Blog & News" },
      { property: "og:description", content: "Latest news, product updates and stories from our team." },
    ],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  const { data: posts } = useQuery({
    queryKey: ["blog-public"],
    queryFn: async () => (await supabase.from("blog_posts").select("slug,title,excerpt,cover_image_url,author,published_at").eq("published", true).order("published_at", { ascending: false })).data ?? [],
  });
  return (
    <StoreLayout>
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="font-display text-4xl">Blog & News</h1>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {(posts ?? []).map((p: any) => (
            <Link key={p.slug} to="/blog/$slug" params={{ slug: p.slug }} className="overflow-hidden rounded-xl border bg-card transition hover:shadow-md">
              {p.cover_image_url && <img src={p.cover_image_url} alt="" className="aspect-[16/9] w-full object-cover" />}
              <div className="p-4">
                <h2 className="font-display text-xl">{p.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{p.author ?? ""} · {p.published_at ? new Date(p.published_at).toLocaleDateString() : ""}</p>
                {p.excerpt && (
                  <p className="mt-3 break-words hyphens-auto text-sm text-muted-foreground">
                    {p.excerpt}
                  </p>
                )}
              </div>
            </Link>
          ))}
          {!posts?.length && <div className="col-span-2 rounded-xl border border-dashed p-12 text-center text-muted-foreground">No posts yet.</div>}
        </div>
      </div>
    </StoreLayout>
  );
}
