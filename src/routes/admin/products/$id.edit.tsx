import { createFileRoute } from "@tanstack/react-router";
import { ProductForm } from "@/components/admin/ProductForm";
export const Route = createFileRoute("/admin/products/$id/edit")({
  component: () => {
    const { id } = Route.useParams();
    return <ProductForm productId={id} />;
  },
});