import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { HalfAssemblyMedia } from "./half-assembly-media";
import {
  getProductImage,
  getProductPrice,
  isHalfAssemblyProduct,
  type StorefrontProduct,
} from "../data/catalog.shared";

export function ProductCard({ product }: { product: StorefrontProduct }) {
  const image = getProductImage(product);
  const isHalfAssembly = isHalfAssemblyProduct(product);

  return (
    <article className="product-card">
      <Link className="product-image-link" to={`/products/${product.handle}`}>
        {image && isHalfAssembly ? (
          <HalfAssemblyMedia alt={`${product.title} exterior`} src={image} />
        ) : image ? (
          <img
            alt={product.title}
            decoding="async"
            loading="lazy"
            src={image}
          />
        ) : (
          <span className="image-placeholder">Image unavailable</span>
        )}
      </Link>
      <div className="product-card-body">
        <p className="product-kind">{product.product_type}</p>
        <h2>
          <Link to={`/products/${product.handle}`}>{product.title}</Link>
        </h2>
        <div className="product-card-footer">
          <p>{getProductPrice(product)}</p>
          <Link
            aria-label={`View ${product.title}`}
            className="icon-link"
            title="View product"
            to={`/products/${product.handle}`}
          >
            <ArrowRight aria-hidden="true" size={18} />
          </Link>
        </div>
      </div>
    </article>
  );
}
