#!/usr/bin/env python3
"""Build Shopify draft products for the iPhone 17 full-assembly series."""

import csv
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "iphone17-full-assembly-drafts.csv"
CDN_BASE = "https://cdn.shopify.com/s/files/1/0666/3644/7916/files"

HEADERS = [
    "Handle",
    "Title",
    "Body (HTML)",
    "Vendor",
    "Product Category",
    "Type",
    "Tags",
    "Published",
    "Option1 Name",
    "Option1 Value",
    "Option1 Linked To",
    "Option2 Name",
    "Option2 Value",
    "Option2 Linked To",
    "Option3 Name",
    "Option3 Value",
    "Option3 Linked To",
    "Variant SKU",
    "Variant Grams",
    "Variant Inventory Tracker",
    "Variant Inventory Qty",
    "Variant Inventory Policy",
    "Variant Fulfillment Service",
    "Variant Price",
    "Variant Compare At Price",
    "Variant Requires Shipping",
    "Variant Taxable",
    "Variant Barcode",
    "Image Src",
    "Image Position",
    "Image Alt Text",
    "Gift Card",
    "SEO Title",
    "SEO Description",
    "Google Shopping / Google Product Category",
    "Google Shopping / Gender",
    "Google Shopping / Age Group",
    "Google Shopping / MPN",
    "Google Shopping / Condition",
    "Google Shopping / Custom Product",
    "Google Shopping / Custom Label 0",
    "Google Shopping / Custom Label 1",
    "Google Shopping / Custom Label 2",
    "Google Shopping / Custom Label 3",
    "Google Shopping / Custom Label 4",
    "互补产品 (product.metafields.shopify--discovery--product_recommendation.complementary_products)",
    "相关产品 (product.metafields.shopify--discovery--product_recommendation.related_products)",
    "相关产品设置 (product.metafields.shopify--discovery--product_recommendation.related_products_display)",
    "Variant Image",
    "Variant Weight Unit",
    "Variant Tax Code",
    "Cost per item",
    "Included / United States",
    "Price / United States",
    "Compare At Price / United States",
    "Included / International",
    "Price / International",
    "Compare At Price / International",
    "Status",
]

MODELS = [
    {
        "name": "iPhone 17",
        "handle": "iphone-17",
        "sku": "I17",
        "colors": [
            ("Black", "BLACK", "iphone-17-black-fa.jpg"),
            ("White", "WHITE", "iphone-17-white-fa.jpg"),
            ("Mist Blue", "MISTBLUE", "iphone-17-mist-blue-fa.jpg"),
            ("Lavender", "LAVENDER", "iphone-17-lavender-fa.jpg"),
            ("Sage", "SAGE", "iphone-17-sage-fa.jpg"),
        ],
    },
    {
        "name": "iPhone Air",
        "handle": "iphone-air",
        "sku": "I17-AIR",
        "colors": [
            ("Space Black", "SPACEBLACK", "iphone-air-space-black-fa.jpg"),
            ("Cloud White", "CLOUDWHITE", "iphone-air-cloud-white-fa.jpg"),
            ("Light Gold", "LIGHTGOLD", "iphone-air-light-gold-fa.jpg"),
            ("Sky Blue", "SKYBLUE", "iphone-air-sky-blue-fa.jpg"),
        ],
    },
    {
        "name": "iPhone 17 Pro",
        "handle": "iphone-17-pro",
        "sku": "I17-PRO",
        "colors": [
            ("Silver", "SILVER", "iphone-17-pro-silver-fa.jpg"),
            ("Cosmic Orange", "COSMICORANGE", "iphone-17-pro-cosmic-orange-fa.jpg"),
            ("Deep Blue", "DEEPBLUE", "iphone-17-pro-deep-blue-fa.jpg"),
        ],
    },
    {
        "name": "iPhone 17 Pro Max",
        "handle": "iphone-17-pro-max",
        "sku": "I17-PRO-MAX",
        "colors": [
            ("Silver", "SILVER", "iphone-17-pro-max-silver-fa.jpg"),
            ("Cosmic Orange", "COSMICORANGE", "iphone-17-pro-max-cosmic-orange-fa.jpg"),
            ("Deep Blue", "DEEPBLUE", "iphone-17-pro-max-deep-blue-fa.jpg"),
        ],
    },
]

GRADES = [
    ("A Grade", "A-GRADE", "a grade"),
    ("Premium", "PREMIUM", "premium"),
]


def make_row() -> dict[str, str]:
    return {header: "" for header in HEADERS}


def build_rows() -> list[dict[str, str]]:
    rows = []
    for model in MODELS:
        for grade_name, grade_sku, tag in GRADES:
            handle = (
                f"{model['handle']}-back-glass-full-assembly-with-coil-"
                f"{grade_name.lower().replace(' ', '-')}"
            )
            for position, (color, color_sku, filename) in enumerate(
                model["colors"], start=1
            ):
                row = make_row()
                row["Handle"] = handle
                if position == 1:
                    row["Title"] = (
                        f"{model['name']} Back Glass Full Assembly "
                        f"(With Coil) - {grade_name}"
                    )
                    row["Body (HTML)"] = (
                        f"<p>{grade_name} back cover glass for {model['name']} "
                        "full assembly with MagSafe wireless charging coil "
                        "preinstalled</p>"
                    )
                    row["Vendor"] = "Apple"
                    row["Type"] = "Back Glass"
                    row["Tags"] = tag
                    row["Published"] = "false"
                    row["Option1 Name"] = "Color"
                    row["Gift Card"] = "false"
                    row["Status"] = "draft"

                row["Option1 Value"] = color
                row["Variant SKU"] = (
                    f"SKU-{model['sku']}-{grade_sku}-{color_sku}-FA"
                )
                row["Variant Grams"] = "0.0"
                row["Variant Inventory Qty"] = "0"
                row["Variant Inventory Policy"] = "deny"
                row["Variant Fulfillment Service"] = "manual"
                row["Variant Price"] = "0.00"
                row["Variant Requires Shipping"] = "true"
                row["Variant Taxable"] = "true"
                image_url = f"{CDN_BASE}/{filename}"
                row["Image Src"] = image_url
                row["Image Position"] = str(position)
                row["Image Alt Text"] = (
                    f"{model['name']} {color} back glass full assembly "
                    "with charging coil"
                )
                row["Variant Image"] = image_url
                row["Variant Weight Unit"] = "lb"
                row["Included / United States"] = "true"
                row["Included / International"] = "true"
                rows.append(row)
    return rows


def main() -> None:
    with OUTPUT.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=HEADERS)
        writer.writeheader()
        writer.writerows(build_rows())
    print(OUTPUT)


if __name__ == "__main__":
    main()
