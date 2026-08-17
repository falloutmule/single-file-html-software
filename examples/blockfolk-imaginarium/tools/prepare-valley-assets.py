from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont, features


REGIONS = {
    "coastline": (0.00, 0.00, 0.39, 0.48),
    "mountain-lake-waterfall": (0.52, 0.00, 0.91, 0.43),
    "mountain-trail": (0.70, 0.14, 1.00, 0.68),
    "central-clearing-plains": (0.20, 0.27, 0.69, 0.76),
    "forest-clearing": (0.57, 0.45, 1.00, 0.91),
    "forest-trail": (0.70, 0.34, 1.00, 0.96),
    "lower-trail": (0.13, 0.68, 0.87, 1.00),
    "river-mouth": (0.00, 0.25, 0.38, 0.64),
}


def file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def pixel_hash(image: Image.Image) -> str:
    return hashlib.sha256(image.convert("RGB").tobytes()).hexdigest()


def metrics(reference: Image.Image, candidate: Image.Image) -> dict[str, object]:
    a = np.asarray(reference.convert("RGB"), dtype=np.float32)
    b = np.asarray(candidate.convert("RGB"), dtype=np.float32)
    difference = a - b
    mse = float(np.mean(difference * difference))
    mae = float(np.mean(np.abs(difference)))
    channel_mae = [float(value) for value in np.mean(np.abs(difference), axis=(0, 1))]
    return {
        "mse": mse,
        "mae": mae,
        "channelMaeRgb": channel_mae,
        "maxAbsoluteError": int(np.max(np.abs(difference))),
        "psnrDb": None if mse == 0 else float(20 * math.log10(255.0 / math.sqrt(mse))),
        "pixelEqual": bool(np.array_equal(a, b)),
    }


def fit(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    copy = image.copy()
    copy.thumbnail(size, Image.Resampling.LANCZOS)
    surface = Image.new("RGB", size, "#ecebe7")
    surface.paste(copy, ((size[0] - copy.width) // 2, (size[1] - copy.height) // 2))
    return surface


def crop_normalized(image: Image.Image, box: tuple[float, float, float, float]) -> Image.Image:
    return image.crop(tuple(round(value * dimension) for value, dimension in zip(box, (image.width, image.height, image.width, image.height))))


def make_comparison(source: Image.Image, master: Image.Image, output: Path) -> None:
    font = ImageFont.load_default(size=22)
    small_font = ImageFont.load_default(size=17)
    margin = 24
    full_size = (480, 480)
    crop_size = (250, 190)
    pair_width = crop_size[0] * 2 + 12
    width = margin * 3 + pair_width * 2
    header_height = 46
    full_height = header_height + full_size[1]
    row_height = 34 + crop_size[1]
    height = margin * 3 + full_height + row_height * 4
    sheet = Image.new("RGB", (width, height), "#f6f3ea")
    draw = ImageDraw.Draw(sheet)
    draw.text((margin, margin), "Complete approved source", fill="#243126", font=font)
    draw.text((margin + full_size[0] + 36, margin), "Complete NVIDIA 4096 result", fill="#243126", font=font)
    sheet.paste(fit(source, full_size), (margin, margin + header_height))
    sheet.paste(fit(master, full_size), (margin + full_size[0] + 36, margin + header_height))
    y = margin * 2 + full_height
    for index, (name, box) in enumerate(REGIONS.items()):
        column = index % 2
        row = index // 2
        x = margin + column * (pair_width + margin)
        top = y + row * row_height
        draw.text((x, top), name.replace("-", " ").title(), fill="#3f513f", font=small_font)
        source_crop = crop_normalized(source, box)
        master_crop = crop_normalized(master, box)
        sheet.paste(fit(source_crop, crop_size), (x, top + 30))
        sheet.paste(fit(master_crop, crop_size), (x + crop_size[0] + 12, top + 30))
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, format="PNG", optimize=False)


def make_webp_comparison(master: Image.Image, candidates: list[dict[str, object]], output: Path) -> None:
    crop_size = 320
    margin = 16
    header = 38
    row_header = 28
    samples = {
        "coast water": (0.16, 0.19),
        "mountain waterfall": (0.70, 0.23),
        "central flowers": (0.44, 0.50),
        "forest trail": (0.82, 0.69),
        "lower trail": (0.54, 0.82),
    }
    columns = [("master", master)] + [
        (f"WebP q{item['quality']}", Image.open(Path(str(item["path"]))).convert("RGB"))
        for item in candidates
    ]
    width = margin * 2 + crop_size * len(columns)
    height = margin * 2 + header + (crop_size + row_header) * len(samples)
    sheet = Image.new("RGB", (width, height), "#f6f3ea")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default(size=18)
    for index, (label, _) in enumerate(columns):
        draw.text((margin + index * crop_size + 8, margin + 8), label, fill="#243126", font=font)
    y = margin + header
    for label, (cx, cy) in samples.items():
        draw.text((margin + 8, y + 4), label, fill="#3f513f", font=font)
        top = y + row_header
        center_x = round(cx * master.width)
        center_y = round(cy * master.height)
        box = (center_x - crop_size // 2, center_y - crop_size // 2, center_x + crop_size // 2, center_y + crop_size // 2)
        for index, (_, image) in enumerate(columns):
            sheet.paste(image.crop(box), (margin + index * crop_size, top))
        y += crop_size + row_header
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, format="PNG", optimize=False)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--master", type=Path, required=True)
    parser.add_argument("--repeat", type=Path, required=True)
    parser.add_argument("--candidate-dir", type=Path, required=True)
    parser.add_argument("--comparison", type=Path, required=True)
    parser.add_argument("--webp-comparison", type=Path, required=True)
    parser.add_argument("--metrics", type=Path, required=True)
    args = parser.parse_args()

    if not features.check("webp"):
        raise RuntimeError("Pillow WebP support is unavailable")

    source = Image.open(args.source).convert("RGB")
    master = Image.open(args.master).convert("RGB")
    repeat = Image.open(args.repeat).convert("RGB")
    if source.size != (1280, 1280):
        raise ValueError(f"unexpected source dimensions: {source.size}")
    if master.size != (4096, 4096) or repeat.size != (4096, 4096):
        raise ValueError(f"unexpected upscale dimensions: {master.size}, {repeat.size}")

    args.candidate_dir.mkdir(parents=True, exist_ok=True)
    candidate_results = []
    for quality in (88, 90, 92, 94, 96, 98):
        path = args.candidate_dir / f"blockfolk-valley-q{quality}.webp"
        master.save(path, format="WEBP", quality=quality, method=6, exact=True)
        decoded = Image.open(path).convert("RGB")
        candidate_results.append({
            "quality": quality,
            "path": str(path),
            "bytes": path.stat().st_size,
            "sha256": file_hash(path),
            "comparisonToMaster": metrics(master, decoded),
        })

    reduced = master.resize(source.size, Image.Resampling.LANCZOS)
    result = {
        "source": {"path": str(args.source), "dimensions": source.size, "bytes": args.source.stat().st_size, "sha256": file_hash(args.source), "decodedPixelSha256": pixel_hash(source)},
        "master": {"path": str(args.master), "dimensions": master.size, "bytes": args.master.stat().st_size, "sha256": file_hash(args.master), "decodedPixelSha256": pixel_hash(master)},
        "repeat": {"path": str(args.repeat), "dimensions": repeat.size, "bytes": args.repeat.stat().st_size, "sha256": file_hash(args.repeat), "decodedPixelSha256": pixel_hash(repeat)},
        "repeatability": metrics(master, repeat),
        "masterReducedToSource": metrics(source, reduced),
        "webpCandidates": candidate_results,
    }
    args.metrics.parent.mkdir(parents=True, exist_ok=True)
    args.metrics.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    make_comparison(source, master, args.comparison)
    make_webp_comparison(master, candidate_results, args.webp_comparison)
    print(json.dumps(result, separators=(",", ":")))


if __name__ == "__main__":
    main()
