import { ShopifyAdminClient } from "../app/services/shopify/admin.server";
import { loadShopifyConfig } from "../app/services/shopify/config";

interface ProductNode {
  handle: string;
  id: string;
  resourcePublicationsV2: {
    nodes: Array<{
      isPublished: boolean;
      publication: { name: string };
    }>;
  };
  status: string;
  title: string;
}

const ids = [
  "gid://shopify/Product/8675370991788",
  "gid://shopify/Product/8675371090092",
  "gid://shopify/Product/8675371352236",
  "gid://shopify/Product/8675371417772",
  "gid://shopify/Product/8675371516076",
  "gid://shopify/Product/8675371614380",
  "gid://shopify/Product/8675371188396",
  "gid://shopify/Product/8675371253932",
];

const query = `#graphql
  query Iphone17ReviewPublications($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        handle
        id
        status
        title
        resourcePublicationsV2(first: 20) {
          nodes {
            isPublished
            publication { name }
          }
        }
      }
    }
  }
`;

const client = new ShopifyAdminClient(loadShopifyConfig(process.env));
const response = await client.query<{ nodes: Array<ProductNode | null> }>(query, {
  ids,
});
const products = response.nodes.filter(
  (product): product is ProductNode => product !== null,
);

for (const product of products) {
  const publications = product.resourcePublicationsV2.nodes
    .filter(({ isPublished }) => isPublished)
    .map(({ publication }) => publication.name)
    .sort();
  console.log(
    [product.status, product.title, publications.join(" | ") || "UNPUBLISHED"].join(
      "\t",
    ),
  );
}

if (products.length !== ids.length) {
  throw new Error(`Expected ${ids.length} products, received ${products.length}.`);
}
if (products.some((product) => product.status !== "ACTIVE")) {
  throw new Error("At least one iPhone 17 review product is not ACTIVE.");
}
