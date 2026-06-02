import { createFileRoute } from "@tanstack/react-router";
import { StoreLayout } from "@/components/layout/StoreLayout";
import { useSettings } from "@/hooks/useSettings";
import { sanitizeHtml } from "@/lib/safe-html";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us" },
      { name: "description", content: "Learn more about our store, mission and the team behind it." },
      { property: "og:title", content: "About Us" },
      { property: "og:description", content: "Learn more about our store, mission and the team behind it." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { data: s } = useSettings();
  const title = s?.about_hero_title ?? `About ${s?.store_name ?? "us"}`;
  const subtitle = s?.about_hero_subtitle ?? s?.store_tagline ?? "";
  const body = s?.about_body_html ?? "<p>We are a Kenyan retailer & wholesaler delivering quality products across the country. Customize this from <strong>Admin → Store settings</strong>.</p>";
  return (
    <StoreLayout>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 text-lg text-muted-foreground">{subtitle}</p>}
        <article className="prose prose-sm mt-8 max-w-none [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-2xl [&_p]:mt-4 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-5" dangerouslySetInnerHTML={{ __html: sanitizeHtml(body) }} />
        <div className="mt-10 grid gap-3 rounded-xl border bg-card p-5 text-sm">
          <div><span className="text-muted-foreground">Phone: </span>{s?.contact_phone ?? "—"}</div>
          <div><span className="text-muted-foreground">Email: </span>{s?.contact_email ?? "—"}</div>
          <div><span className="text-muted-foreground">Address: </span>{s?.physical_address ?? "—"}</div>
        </div>
      </div>
    </StoreLayout>
  );
}
