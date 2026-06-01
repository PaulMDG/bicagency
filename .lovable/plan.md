
## Scope (from your answers)

- **Notifications**: manual — admin clicks WhatsApp deep links per order/status change. No paid API.
- **Customers**: optional accounts (guest checkout stays the default conversion path).
- **Suppliers**: admin-managed only (no supplier login). Products link to one supplier.
- **Blog**: full admin CMS (rich text, cover image, slug, publish toggle).

## 1. Database migration (one migration)

New tables:
- `suppliers` (name, contact_name, phone, email, address, notes, is_active)
- `subcategories` (category_id FK, name, slug, description, sort_order)
- `blog_posts` (slug, title, excerpt, content_html, cover_image_url, author, published, published_at, seo_title, seo_description)
- `customer_accounts` (user_id FK to auth.users, name, phone, default_delivery_location) — links optional accounts to the existing `customers` flow.

Alter existing:
- `products`: add `supplier_id` FK, `subcategory_id` FK.
- `categories`: add `sort_order`.

RPC updates:
- `place_order`: accept optional `auth_user_id`; if present, attach to a `customer_accounts` row.
- New `track_customer_orders(user_id)` for the customer "My orders" page.

Storage:
- Bucket `product-images` (public) for product gallery uploads.
- Bucket `blog-images` (public) for cover images.
- Bucket `category-images` (public) — already implicitly used; formalize + RLS.

RLS:
- Suppliers, subcategories, blog_posts: admin-managed; public read on published blog posts and active subcategories.
- customer_accounts: user reads/updates own row only.

## 2. Admin dashboard expansion

- **Categories**: add subcategory CRUD nested under each category. Auto-resize uploaded category images to ≤512px wide on upload (browser-side canvas resize) to keep payloads small.
- **Products**: extend `ProductForm` with supplier dropdown, subcategory dropdown, **multi-image upload** with primary + sort order, featured/active toggles (already present — verify), pricing/MOQ tiers (already present — verify).
- **Suppliers**: new `/admin/suppliers` list + create/edit forms.
- **Blog**: new `/admin/blog` list + create/edit with rich-text editor (lightweight: `react-simple-wysiwyg` or contentEditable + sanitize). Cover image upload, slug auto-gen, publish toggle.
- **Orders**: add "Notify customer on WhatsApp" button on each row + detail page. Pre-fills status-specific template from `settings` (e.g., `wa_template_paid`, `wa_template_shipped`, `wa_template_delivered`, `wa_template_failed`). Opens `wa.me/...` in new tab.
- **Customers**: list registered + guest customers, view their orders.

## 3. Storefront polish

- **Product catalog UI** (`/products` and `/category/$slug`):
  - Filter sidebar: purchase type (retail/wholesale/preorder pills), price range slider, stock badge filter (in stock / preorder only), subcategory chips.
  - Sort dropdown: newest / price ↑ / price ↓ / featured.
  - Pagination: page numbers + prev/next (already partially built — apply same to `/category/$slug`).
  - Each `ProductCard`: stock badge (In stock / Low stock / Preorder only / Out of stock), price tier badges (Wholesale from X / Preorder from Y).
- **Product detail page**:
  - Image gallery (thumbnails + main).
  - Social share button row (WhatsApp, Facebook, X, Copy link) — share text includes product URL.
  - WhatsApp inquiry button: message now includes the full product URL.

## 4. Cart & checkout

- Cart already exists; verify it persists (zustand persist middleware) and re-validates prices/stock on mount.
- Checkout: already calls atomic `place_order` RPC. Add MOQ/stock pre-check display in cart so users see issues before checkout.
- Pass `auth_user_id` to RPC when a customer is logged in.

## 5. Content pages

- `/about` — About Us route with editable content pulled from `settings` keys (`about_hero_title`, `about_body_html`, etc.) so admin can edit from Settings → Content.
- `/blog` — list of published posts (cover, title, excerpt, date).
- `/blog/$slug` — single post with SEO head().
- Update `StoreHeader` + `MobileNav` + `StoreFooter` with About / Blog / Track Order links.

## 6. Customer accounts

- `/account/register`, `/account/login`, `/account/forgot-password`, `/account/reset-password`.
- Email + password + Google OAuth (via Lovable broker + `configure_social_auth`).
- `/account` (protected by `_authenticated` layout): profile + order history list using `track_customer_orders`.
- Checkout shows "Log in" link but never blocks guest checkout.

## 7. Sharing

- `<SocialShareButtons url={...} title={...} />` component used on product detail and blog detail.

## 8. Verification

- Run `supabase--linter` after migration.
- Smoke-test: build, then load `/`, `/products`, `/category/$slug`, `/products/$slug`, `/about`, `/blog`, `/account/login`, `/admin`.

## Technical notes (you can skip)

- Rich text editor: `react-simple-wysiwyg` (tiny, no SSR issues) → store sanitized HTML; render with DOMPurify on read.
- Image resize for category uploads: browser canvas → resize to max 512px → re-upload as webp.
- Multi-image product upload: use `product_images` table (already exists) + Supabase storage bucket.
- WhatsApp templates stored in `settings` so admin can edit messages without code change.

## Execution order

1. Migration + storage buckets + RLS.
2. Storage helpers + image-resize utility.
3. Suppliers admin + Subcategories admin.
4. Product form extension (supplier + subcategory + multi-image).
5. Blog admin + public `/blog` routes.
6. About page + Settings content keys.
7. Storefront filter UI + stock badges + apply to `/category/$slug`.
8. Product detail: gallery + social share + WhatsApp w/ URL.
9. Customer auth + `/account` order history.
10. Admin WhatsApp-notify buttons on orders.
11. Header/footer link updates + linter pass.

This is roughly 30–40 new/changed files. Reply **approve** to start, or tell me what to drop/defer.
