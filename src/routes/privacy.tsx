import { createFileRoute } from "@tanstack/react-router";
import { StoreLayout } from "@/components/layout/StoreLayout";
import { useSettings } from "@/hooks/useSettings";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy & Trust" },
      { name: "description", content: "How we protect your data, payments, and orders." },
    ],
  }),
});

function PrivacyPage() {
  const { data: s = {} } = useSettings();
  const contact = s.contact_email || "support";
  return (
    <StoreLayout>
      <article className="mx-auto max-w-3xl px-4 py-12 prose prose-neutral dark:prose-invert">
        <h1 className="font-display text-3xl">Privacy &amp; Trust</h1>
        <p className="text-muted-foreground">
          Your trust matters to us. This page explains what data we collect, how we protect it,
          and how to reach us about privacy or security concerns.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li><strong>Order details:</strong> name, phone number, delivery location, and items ordered — used solely to fulfil your order.</li>
          <li><strong>Payment data:</strong> M-Pesa transactions are processed by Safaricom. We store the receipt number and the amount for reconciliation. We never see or store your M-Pesa PIN.</li>
          <li><strong>Account data (optional):</strong> if you create an account, we store your email and a securely hashed password.</li>
        </ul>

        <h2>How we protect your data</h2>
        <ul>
          <li>All traffic is encrypted in transit (HTTPS).</li>
          <li>Database access is restricted by row-level security policies; only the account that owns a record can read it, and admin tooling is gated behind authenticated admin roles.</li>
          <li>Secrets and payment credentials are stored server-side and are never shipped to the browser.</li>
          <li>Public endpoints expose only the fields needed to browse the catalogue — supplier details, internal IDs, and payment references stay private.</li>
        </ul>

        <h2>Your choices</h2>
        <ul>
          <li>You can request a copy or deletion of your personal data at any time.</li>
          <li>You can update or close your account from the My account area.</li>
        </ul>

        <h2>Contact</h2>
        <p>
          For privacy, data, or security questions, email <a href={`mailto:${contact}`}>{contact}</a>
          {s.contact_phone ? <> or call <a href={`tel:${s.contact_phone}`}>{s.contact_phone}</a></> : null}.
        </p>

        <p className="text-xs text-muted-foreground">
          This page reflects our current practices and may be updated. It is provided as our own statement and is not an independent certification.
        </p>
      </article>
    </StoreLayout>
  );
}