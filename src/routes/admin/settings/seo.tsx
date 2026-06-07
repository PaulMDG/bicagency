import { createFileRoute } from "@tanstack/react-router";
import { SettingsEditor } from "@/components/admin/SettingsEditor";
export const Route = createFileRoute("/admin/settings/seo")({
  component: () => <SettingsEditor group="seo" title="SEO settings" note="Sitewide defaults. Per-product and per-post SEO can be set on each item." fields={[
    { key: "seo_site_title", label: "Site title (homepage)" },
    { key: "seo_site_description", label: "Site description", textarea: true },
    { key: "seo_site_keywords", label: "Default keywords (comma separated)" },
    { key: "seo_default_og_image", label: "Default share image URL" },
    { key: "seo_about_title", label: "About page — SEO title" },
    { key: "seo_about_description", label: "About page — SEO description", textarea: true },
  ]} />,
});