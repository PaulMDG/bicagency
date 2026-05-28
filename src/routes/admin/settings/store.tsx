import { createFileRoute } from "@tanstack/react-router";
import { SettingsEditor } from "@/components/admin/SettingsEditor";
export const Route = createFileRoute("/admin/settings/store")({
  component: () => <SettingsEditor group="store" title="Store settings" fields={[
    { key: "store_name", label: "Store name" },
    { key: "store_tagline", label: "Tagline" },
    { key: "contact_phone", label: "Contact phone" },
    { key: "contact_email", label: "Contact email" },
    { key: "physical_address", label: "Address" },
    { key: "delivery_notes", label: "Delivery notes", textarea: true },
    { key: "currency", label: "Currency" },
    { key: "social_facebook", label: "Facebook URL" },
    { key: "social_instagram", label: "Instagram URL" },
    { key: "social_tiktok", label: "TikTok URL" },
  ]} />,
});
