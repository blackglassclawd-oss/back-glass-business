import { Link } from "react-router";
import type { Route } from "./+types/guidance";
import { StoreShell } from "../components/store-shell";
import { buyerGuidance, guidanceHtml } from "../data/buyer-guidance";
import { seoMeta } from "../data/seo";
import { supportReview } from "../data/support-content";
import { escapeHtml } from "../data/product-information";

export function loader({ params }: Route.LoaderArgs) {
  if (params.slug === "support-review" && !import.meta.env.DEV) throw new Response("Page not found", { status: 404 });
  if (params.slug === "contact") throw new Response(null, { status: 302, headers: { Location: "https://backglasspros.com/pages/contact" } });
  if (params.slug === "support-review") return { title: "Support Information Review", description: "Internal review of support details requiring owner approval. Not a customer policy.", html: `<p>Contact us through the <a href="https://backglasspros.com/pages/contact">Shopify contact form</a>.</p>` + Object.entries(supportReview).map(([name, item]) => `<h2>${escapeHtml(name)}</h2><p>${escapeHtml(item.note)}</p>`).join("") };
  if (params.slug === "buyer-guidance") return { title: "Buyer Guidance", description: "Back Glass Pros product selection guides. Technical content is under factual review.", html: null };
  if (!Object.hasOwn(buyerGuidance, params.slug)) throw new Response("Page not found", { status: 404 });
  const page = buyerGuidance[params.slug];
  return { title: page.title, description: page.description, html: guidanceHtml(params.slug) };
}
export function meta({ loaderData, params }: Route.MetaArgs) {
  return seoMeta(`${loaderData?.title ?? "Guidance"} | Back Glass Pros`, loaderData?.description ?? "Back Glass Pros buyer guidance.", `/pages/${params.slug}`);
}
export default function Guidance({ loaderData }: Route.ComponentProps) {
  return <StoreShell><main className="product-detail-shell"><h1>{loaderData.title}</h1><p>{loaderData.description}</p>
    {loaderData.html ? <article dangerouslySetInnerHTML={{ __html: loaderData.html }} /> : <ul>{Object.entries(buyerGuidance).map(([slug, page]) => <li key={slug}><Link to={`/pages/${slug}`}>{page.title}</Link> — {page.status === "OWNER_REVIEWED_PUBLICATION_PENDING" ? "owner-reviewed facts; publication pending" : "unresolved technical facts require review"}</li>)}</ul>}
  </main></StoreShell>;
}
