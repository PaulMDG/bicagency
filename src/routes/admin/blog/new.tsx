import { createFileRoute } from "@tanstack/react-router";
import { BlogPostForm } from "@/components/admin/BlogPostForm";
export const Route = createFileRoute("/admin/blog/new")({ component: () => <BlogPostForm /> });
