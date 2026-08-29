# Local Organization Record

## Canonical root

`/Users/jason/Desktop/Michael's back glass business`

On 2026-08-06, clearly related material was moved into the canonical root on
the same filesystem. Compatibility symlinks were left at each previous path so
existing documents, scripts, and running local tools continue to resolve.
Nothing was deleted or deduplicated.

| Previous path | Canonical location | Classification |
| --- | --- | --- |
| `/Users/jason/backglass-ecommerce` | `01-software/backglass-ecommerce` | Active implementation |
| `/Users/jason/Desktop/shopify website` | `02-assets/shopify-website` | Original design and product assets |
| `/Users/jason/Downloads/web site` | `02-assets/storefront-image-set` | Catalog-correction image set |
| `/Users/jason/Downloads/Web Projects/BackGlassPros` | `03-data/legacy-shopify-export-2024` | Legacy product exports, barcode workbook, and media |
| `/Users/jason/quickorder-11` | `90-archive/shopify-app-prototypes/quickorder-11` | Inactive prototype |
| `/Users/jason/quick-order-test` | `90-archive/shopify-app-prototypes/quick-order-test` | Inactive prototype |
| Five loose owner screenshots in `Downloads` | `02-assets/owner-feedback/2026-07-28-29` | Price and catalog direction evidence |
| `重发网站问题.eml` and `.msg` in `Downloads` | `03-data/owner-correspondence/2026-08-06` | Private owner feedback |
| `web site.zip` in `Downloads` | `90-archive/source-zips/web-site-2026-08-03.zip` | Exact archive of eight correction images |
| `ups logo.png` in `Downloads` | `02-assets/branding/vendor/ups-logo.png` | Third-party shipping brand asset |

## Archive interpretation

The two Quick Order repositories are nearly identical uncommitted Shopify Remix
templates. They differ mainly in package versions, app name/handle, lockfile,
and changelog. Neither has commits or a Git remote. They are retained as
prototypes and are not the active implementation.

The three 2024 Shopify CSV exports are distinct files, not byte-identical
duplicates. They remain historical evidence and must not be imported into the
live store without a reviewed diff.

## Known inspection limitation

`03-data/legacy-shopify-export-2024/SKU - code 128.xlsx` is preserved but was
not read during this pass. The installed spreadsheet workflow lacked its
required artifact runtime and reference files, so workbook contents were not
guessed or extracted with an unsupported substitute.

