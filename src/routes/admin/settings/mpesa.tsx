import { createFileRoute } from "@tanstack/react-router";
import { SettingsEditor } from "@/components/admin/SettingsEditor";
export const Route = createFileRoute("/admin/settings/mpesa")({
  component: () => <SettingsEditor group="mpesa" title="M-Pesa settings" fields={[
    { key: "mpesa_environment", label: "Environment (sandbox/live)" },
    { key: "mpesa_consumer_key", label: "Consumer Key", mask: true },
    { key: "mpesa_consumer_secret", label: "Consumer Secret", mask: true },
    { key: "mpesa_shortcode", label: "Business Shortcode" },
    { key: "mpesa_passkey", label: "Passkey", mask: true },
  ]} note={`Callback URL: ${typeof window !== "undefined" ? window.location.origin : ""}/functions/v1/mpesa-callback`} />,
});
