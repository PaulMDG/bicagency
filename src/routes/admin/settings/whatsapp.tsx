import { createFileRoute } from "@tanstack/react-router";
import { SettingsEditor } from "@/components/admin/SettingsEditor";
export const Route = createFileRoute("/admin/settings/whatsapp")({
  component: () => <SettingsEditor group="whatsapp" title="WhatsApp settings" fields={[
    { key: "whatsapp_number", label: "Admin WhatsApp number (2547XXXXXXXX)" },
    { key: "whatsapp_group_link", label: "WhatsApp Group invite link (https://chat.whatsapp.com/...)" },
    { key: "whatsapp_greeting", label: "Default greeting", textarea: true },
    { key: "whatsapp_inquiry_template", label: "Product inquiry template (vars: {product_name},{quantity},{purchase_type},{price})", textarea: true },
    { key: "whatsapp_order_template", label: "Checkout order template (vars: {order_number},{items_summary},{total},{customer_name})", textarea: true },
  ]} />,
});
