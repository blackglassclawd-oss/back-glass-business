#!/usr/bin/env python3
"""Prepare non-AI iPhone 17-series product images from MobileSentrix photos."""

from pathlib import Path
from urllib.request import Request, urlopen

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parent
SOURCE_DIR = ROOT / "source"
OUTPUT_DIR = ROOT / "shopify-ready"
CANVAS_SIZE = (2000, 2500)
CONTENT_SIZE = (1840, 2340)

PHOTOS = [
    ("iphone-17", "black", "https://static.mobilesentrix.com/catalog/product/image/1/7/1768896634-696f387a0bef6.webp"),
    ("iphone-17", "white", "https://static.mobilesentrix.com/catalog/product/image/1/7/1768896446-696f37bead630.webp"),
    ("iphone-17", "mist-blue", "https://static.mobilesentrix.com/catalog/product/image/1/7/1768896283-696f371b42490.webp"),
    ("iphone-17", "lavender", "https://static.mobilesentrix.com/catalog/product/image/1/7/1768896098-696f36624e40f.webp"),
    ("iphone-17", "sage", "https://static.mobilesentrix.com/catalog/product/image/1/7/1768817015-696e01778fc11.webp"),
    ("iphone-air", "space-black", "https://static.mobilesentrix.com/catalog/product/image/1/7/1768894936-696f31d8647aa.webp"),
    ("iphone-air", "cloud-white", "https://static.mobilesentrix.com/catalog/product/image/1/7/1768894747-696f311b01007.webp"),
    ("iphone-air", "light-gold", "https://static.mobilesentrix.com/catalog/product/image/1/7/1769074637-6971efcd32d1d.webp"),
    ("iphone-air", "sky-blue", "https://static.mobilesentrix.com/catalog/product/image/1/7/1768894540-696f304c7c50c.webp"),
    ("iphone-17-pro", "silver", "https://static.mobilesentrix.com/catalog/product/image/1/7/1769074302-6971ee7ed9648.webp"),
    ("iphone-17-pro", "cosmic-orange", "https://static.mobilesentrix.com/catalog/product/image/1/7/1768895917-696f35ad0342b.webp"),
    ("iphone-17-pro", "deep-blue", "https://static.mobilesentrix.com/catalog/product/image/1/7/1768895331-696f33639178f.webp"),
    ("iphone-17-pro-max", "cosmic-orange", "https://static.mobilesentrix.com/catalog/product/image/1/7/1769074474-6971ef2a58f07.webp"),
    ("iphone-17-pro-max", "deep-blue", "https://static.mobilesentrix.com/catalog/product/image/1/7/1768895113-696f3289900f5.webp"),
]

PRO_MAX_SILVER_REFERENCE_URL = (
    "https://static.mobilesentrix.eu/catalog/product/image/1/7/"
    "1775817186-69d8d1e230a01.webp"
)


def download(url: str, destination: Path) -> None:
    if destination.exists():
        return
    request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(request, timeout=30) as response:
        destination.write_bytes(response.read())


def content_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    rgba = image.convert("RGBA")
    alpha_bbox = rgba.getchannel("A").getbbox()
    if alpha_bbox and alpha_bbox != (0, 0, *rgba.size):
        return alpha_bbox

    rgb = rgba.convert("RGB")
    white = Image.new("RGB", rgb.size, "white")
    difference = ImageChops.difference(rgb, white).convert("L")
    mask = difference.point(lambda value: 255 if value > 10 else 0)
    return mask.getbbox() or (0, 0, *rgba.size)


def prepare(source: Path, destination: Path) -> None:
    with Image.open(source) as opened:
        rgba = opened.convert("RGBA")
    cropped = rgba.crop(content_bbox(rgba))
    scale = min(CONTENT_SIZE[0] / cropped.width, CONTENT_SIZE[1] / cropped.height)
    resized_size = (
        max(1, round(cropped.width * scale)),
        max(1, round(cropped.height * scale)),
    )
    cropped = cropped.resize(resized_size, Image.Resampling.LANCZOS)

    canvas = Image.new("RGB", CANVAS_SIZE, "white")
    x = (CANVAS_SIZE[0] - cropped.width) // 2
    y = (CANVAS_SIZE[1] - cropped.height) // 2
    canvas.paste(cropped.convert("RGB"), (x, y), cropped.getchannel("A"))
    canvas.save(destination, "JPEG", quality=92, optimize=True, progressive=True)


def prepare_pro_max_silver(
    deep_blue_source: Path,
    silver_reference: Path,
    destination: Path,
) -> None:
    """Disallowed: never synthesize a Silver variant from another color."""
    raise RuntimeError(
        "iPhone 17 Pro Max Silver requires an exact-model, exact-color supplier "
        "photo. The former Deep Blue recolor is disqualified."
    )


def main() -> None:
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for model, color, url in PHOTOS:
        source = SOURCE_DIR / f"{model}-{color}.webp"
        destination = OUTPUT_DIR / f"{model}-{color}-fa.jpg"
        download(url, source)
        prepare(source, destination)
        print(destination.name)

    silver_reference = SOURCE_DIR / "iphone-17-pro-max-silver-reference.webp"
    download(PRO_MAX_SILVER_REFERENCE_URL, silver_reference)
    prepare_pro_max_silver(
        SOURCE_DIR / "iphone-17-pro-max-deep-blue.webp",
        silver_reference,
        OUTPUT_DIR / "iphone-17-pro-max-silver-fa.jpg",
    )
    print("iphone-17-pro-max-silver-fa.jpg")


if __name__ == "__main__":
    main()
