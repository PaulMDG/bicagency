import DOMPurify from "dompurify";

export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") return html;
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "ul", "ol", "li", "h1", "h2", "h3", "h4", "blockquote", "a", "img", "code", "pre", "hr"],
    ALLOWED_ATTR: ["href", "src", "alt", "title", "target", "rel"],
  });
}