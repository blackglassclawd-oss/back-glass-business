import { Link } from "react-router";
import { productDescription, productFactRows, type ProductInformation as Facts } from "../data/product-information";

export function ProductInformation({ facts }: { facts: Facts }) {
  return <section aria-labelledby="product-information-heading">
    <h2 id="product-information-heading">Product details</h2>
    <p>{productDescription(facts)}</p>
    <dl className="product-meta">
      {productFactRows(facts).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
    {facts.compatibilityNotes?.length ? <><h3>Compatibility notes</h3><ul>{facts.compatibilityNotes.map(note => <li key={note}>{note}</li>)}</ul></> : null}
    {facts.inspectionNotes?.length ? <><h3>Inspection notes</h3><ul>{facts.inspectionNotes.map(note => <li key={note}>{note}</li>)}</ul></> : null}
    {facts.installationNotes?.length ? <><h3>Installation notes</h3><ul>{facts.installationNotes.map(note => <li key={note}>{note}</li>)}</ul></> : null}
    <h3>Variants and SKUs</h3>
    <ul>{facts.variants.map(v => <li key={v.id}>{v.label}{v.sku ? ` — ${v.sku}` : ""}</li>)}</ul>
    {facts.modelSlug && <p><Link to={`/models/${facts.modelSlug}`}>View parts listed for {facts.model}</Link></p>}
    {facts.coilIncluded === false && <p>Wireless charging coils are separate products. A model listing alone does not confirm coil compatibility. <Link to="/pages/wireless-charging-coil-compatibility">Check the coil compatibility review</Link>.</p>}
    <p><Link to="/pages/premium-vs-a-grade">Premium vs A Grade</Link>{facts.cameraLens ? <>{" · "}<Link to="/pages/premium-plus-camera-lens">Premium Plus camera lens</Link></> : null}{" · "}<Link to="/pages/glass-only-vs-half-assembly">Glass only vs half assembly</Link></p>
  </section>;
}
