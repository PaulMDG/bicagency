import { createFileRoute } from "@tanstack/react-router";
import { BlogPostForm } from "@/components/admin/BlogPostForm";
export const Route = createFileRoute("/admin/blog/$id/edit")({
  component: () => {
    const { id } = Route.useParams();
    return <BlogPostForm postId={id} />;
  },
});
