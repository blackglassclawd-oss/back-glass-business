import { ArrowRight, BatteryCharging } from "lucide-react";
import { Link } from "react-router";
import {
  getCoilProductPath,
  type CoilDraftProduct,
} from "../data/product-taxonomy";

export function CoilDraftCard({ product }: { product: CoilDraftProduct }) {
  const path = getCoilProductPath(product);

  return (
    <article className="product-card product-card-draft">
      <Link className="product-image-link coil-image-placeholder" to={path}>
        <BatteryCharging aria-hidden="true" size={42} />
        <span>Approved media pending</span>
      </Link>
      <div className="product-card-body">
        <div className="product-kind-line">
          <p className="product-kind">{product.productType}</p>
          <span className="draft-badge">Draft</span>
        </div>
        <h2>
          <Link to={path}>{product.title}</Link>
        </h2>
        <div className="product-card-footer">
          <p>Unavailable · setup pending</p>
          <Link
            aria-label={`View draft status for ${product.title}`}
            className="icon-link"
            title="View draft status"
            to={path}
          >
            <ArrowRight aria-hidden="true" size={18} />
          </Link>
        </div>
      </div>
    </article>
  );
}
