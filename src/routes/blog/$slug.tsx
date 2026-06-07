import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StoreLayout } from "@/components/layout/StoreLayout";
import { sanitizeHtml } from "@/lib/safe-html";
import { SocialShareButtons } from "@/components/store/SocialShareButtons";

const postQuery = (slug: string) => ({
  queryKey: ["blog-post", slug],
  queryFn: async () =>
    (await supabase.from("blog_posts").select("*").eq("slug", slug).eq("published", true).maybeSingle()).data,
});

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params, context }) => context.queryClient.ensureQueryData(postQuery(params.slug)),
  head: ({ loaderData }) => {
    const p: any = loaderData;
    const title = p?.seo_title || p?.title || "Blog post";
    const description = p?.seo_description || p?.excerpt || "";
    const img = p?.cover_image_url;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        ...(img ? [{ property: "og:image", content: img }, { name: "twitter:image", content: img }] : []),
      ],
    };
  },
  component: BlogDetail,
});

function BlogDetail() {
  const { slug } = Route.useParams();
  const { data: post, isLoading } = useQuery(postQuery(slug));
  if (isLoading) return <StoreLayout><div className="p-12 text-center text-muted-foreground">Loading…</div></StoreLayout>;
  if (!post) return <StoreLayout><div className="p-12 text-center">Post not found. <Link to="/blog" className="text-primary underline">All posts</Link></div></StoreLayout>;
  const url = typeof window !== "undefined" ? window.location.href : "";
  return (
    <StoreLayout>
      <article className="mx-auto max-w-3xl px-4 py-12">
        <Link to="/blog" className="text-sm text-muted-foreground hover:text-primary">← All posts</Link>
        <h1 className="mt-4 font-display text-4xl">{post.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{post.author ?? ""} · {post.published_at ? new Date(post.published_at).toLocaleDateString() : ""}</p>
        {post.cover_image_url && <img src={post.cover_image_url} alt="" className="my-8 aspect-[16/9] w-full rounded-xl object-cover" />}
        <div className="prose prose-sm max-w-none [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-2xl [&_p]:mt-4 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-primary" dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content_html ?? "") }} />
        <div className="mt-10 border-t pt-6">
          <div className="mb-2 text-sm font-medium">Share this post</div>
          <SocialShareButtons url={url} title={post.title} />
        </div>
      </article>
    </StoreLayout>
  );
}
