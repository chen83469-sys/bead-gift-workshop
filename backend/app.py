# -*- coding: utf-8 -*-
import json
import os
import sys
import uuid
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
VENDOR_PYTHON = ROOT_DIR / ".vendor" / "python"
if VENDOR_PYTHON.exists():
    sys.path.insert(0, str(VENDOR_PYTHON))

import numpy as np
from flask import Flask, jsonify, request, send_from_directory
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
GENERATED_DIR = BASE_DIR / "generated"
DATA_DIR = BASE_DIR / "data"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
GENERATED_DIR.mkdir(parents=True, exist_ok=True)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 15 * 1024 * 1024


def load_color_card():
    with open(DATA_DIR / "mard.json", "r", encoding="utf-8") as f:
        return json.load(f)


def srgb_to_linear(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def rgb_to_xyz(rgb):
    r, g, b = rgb
    r_lin = srgb_to_linear(r)
    g_lin = srgb_to_linear(g)
    b_lin = srgb_to_linear(b)
    x = 0.4124564 * r_lin + 0.3575761 * g_lin + 0.1804375 * b_lin
    y = 0.2126729 * r_lin + 0.7151522 * g_lin + 0.0721750 * b_lin
    z = 0.0193339 * r_lin + 0.1191920 * g_lin + 0.9503041 * b_lin
    return x, y, z


def xyz_to_lab(xyz):
    x, y, z = xyz
    xn, yn, zn = 0.95047, 1.0, 1.08883

    def f(t):
        delta = 6.0 / 29.0
        return t ** (1.0 / 3.0) if t > delta ** 3 else t / (3 * delta ** 2) + 4.0 / 29.0

    fx = f(x / xn)
    fy = f(y / yn)
    fz = f(z / zn)
    return 116.0 * fy - 16.0, 500.0 * (fx - fy), 200.0 * (fy - fz)


def rgb_to_lab(rgb):
    return xyz_to_lab(rgb_to_xyz(rgb))


def lab_distance(a, b):
    return np.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2)


COLOR_CARD = load_color_card()
COLOR_LIST_LAB = [
    {
        "code": item["code"],
        "name": item["name"],
        "rgb": item["rgb"],
        "lab": rgb_to_lab(item["rgb"]),
    }
    for item in COLOR_CARD["colors"]
]


MODE_PRESETS = {
    "couple": {
        "label": "情侣头像",
        "size": 48,
        "max_colors": 14,
        "gift_copy": "更适合做成双人头像小礼物，建议搭配简约相框或钥匙扣。",
    },
    "pet": {
        "label": "宠物纪念",
        "size": 56,
        "max_colors": 16,
        "gift_copy": "适合做宠物纪念摆件，建议保留毛色层次，成品更耐看。",
    },
    "portrait": {
        "label": "卡通人像",
        "size": 40,
        "max_colors": 12,
        "gift_copy": "适合做头像挂件或生日小礼物，颜色更简洁，上手更轻松。",
    },
}


def find_nearest_color(pixel_rgb, color_list_lab):
    pixel_lab = rgb_to_lab(pixel_rgb)
    min_dist = float("inf")
    nearest = None
    for color in color_list_lab:
        dist = lab_distance(pixel_lab, color["lab"])
        if dist < min_dist:
            min_dist = dist
            nearest = color
    return nearest


def compress_colors(grid, max_colors):
    color_count = {}
    for row in grid:
        for cell in row:
            key = cell["code"]
            color_count.setdefault(
                key,
                {
                    "code": cell["code"],
                    "name": cell["name"],
                    "rgb": cell["rgb"],
                    "count": 0,
                },
            )
            color_count[key]["count"] += 1

    if max_colors and len(color_count) > max_colors:
        sorted_colors = sorted(color_count.values(), key=lambda x: -x["count"])
        kept_codes = {item["code"] for item in sorted_colors[:max_colors]}
        kept_list = [item for item in COLOR_LIST_LAB if item["code"] in kept_codes]

        color_count = {}
        for row in grid:
            for cell in row:
                if cell["code"] not in kept_codes:
                    nearest = find_nearest_color(cell["original_rgb"], kept_list)
                    cell["code"] = nearest["code"]
                    cell["name"] = nearest["name"]
                    cell["rgb"] = nearest["rgb"]
                key = cell["code"]
                color_count.setdefault(
                    key,
                    {
                        "code": cell["code"],
                        "name": cell["name"],
                        "rgb": cell["rgb"],
                        "count": 0,
                    },
                )
                color_count[key]["count"] += 1
    else:
        color_count = {}
        for row in grid:
            for cell in row:
                key = cell["code"]
                color_count.setdefault(
                    key,
                    {
                        "code": cell["code"],
                        "name": cell["name"],
                        "rgb": cell["rgb"],
                        "count": 0,
                    },
                )
                color_count[key]["count"] += 1

    return grid, sorted(color_count.values(), key=lambda x: -x["count"])


def generate_preview(grid, cell_size=12):
    height = len(grid)
    width = len(grid[0]) if height else 0
    canvas = Image.new("RGB", (width * cell_size, height * cell_size), (255, 255, 255))
    draw = ImageDraw.Draw(canvas)

    for row_idx, row in enumerate(grid):
        for col_idx, cell in enumerate(row):
            x1 = col_idx * cell_size
            y1 = row_idx * cell_size
            x2 = x1 + cell_size
            y2 = y1 + cell_size
            draw.rectangle([x1, y1, x2, y2], fill=tuple(cell["rgb"]), outline=(235, 235, 235))

    if width >= 20 and height >= 20:
        for index in range(0, width + 1, 10):
            x = index * cell_size
            draw.line([x, 0, x, height * cell_size], fill=(214, 72, 72), width=2)
        for index in range(0, height + 1, 10):
            y = index * cell_size
            draw.line([0, y, width * cell_size, y], fill=(214, 72, 72), width=2)

    file_name = f"{uuid.uuid4().hex}.png"
    output_path = GENERATED_DIR / file_name
    canvas.save(output_path, format="PNG")
    return file_name


def load_render_font(size=12):
    candidate_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        str(DATA_DIR / "DejaVuSansMono.ttf"),
    ]
    for font_path in candidate_paths:
        if Path(font_path).exists():
            try:
                return ImageFont.truetype(font_path, size=size)
            except OSError:
                continue
    return ImageFont.load_default()


def build_pattern_palette(color_stats):
    palette = []
    for index, item in enumerate(color_stats, start=1):
        palette.append(
            {
                "index": index,
                "number": f"{index:02d}",
                "code": item["code"],
                "name": item["name"],
                "rgb": item["rgb"],
                "count": item["count"],
            }
        )
    return palette


def get_text_color_for_background(rgb):
    r, g, b = rgb
    luminance = 0.299 * r + 0.587 * g + 0.114 * b
    return (255, 255, 255) if luminance < 145 else (36, 36, 36)


def generate_pattern_sheet(grid, palette):
    height = len(grid)
    width = len(grid[0]) if height else 0
    cell_size = 18 if max(width, height) <= 48 else 16
    padding = 16
    header_height = 36
    footer_height = 22
    title_font = load_render_font(16)
    cell_font = load_render_font(10 if cell_size <= 16 else 11)
    legend_font = load_render_font(13)

    legend_columns = 2 if len(palette) > 8 else 1
    legend_rows = int(np.ceil(len(palette) / legend_columns)) if palette else 0
    legend_row_height = 28
    legend_section_height = 28 + legend_rows * legend_row_height + 20 if palette else 20

    canvas_width = width * cell_size + padding * 2
    canvas_height = header_height + height * cell_size + legend_section_height + footer_height
    canvas = Image.new("RGB", (canvas_width, canvas_height), (255, 255, 255))
    draw = ImageDraw.Draw(canvas)

    draw.text((padding, 10), "Bead Pattern Sheet", fill=(34, 34, 34), font=title_font)
    draw.text(
        (padding, canvas_height - footer_height),
        f"Size {width}x{height}  Colors {len(palette)}  Beads {width * height}",
        fill=(96, 96, 96),
        font=legend_font,
    )

    top = header_height
    for row_idx, row in enumerate(grid):
        for col_idx, cell in enumerate(row):
            x1 = padding + col_idx * cell_size
            y1 = top + row_idx * cell_size
            x2 = x1 + cell_size
            y2 = y1 + cell_size
            fill_rgb = tuple(cell["rgb"])
            draw.rectangle([x1, y1, x2, y2], fill=fill_rgb, outline=(220, 220, 220))
            text = cell["number"]
            bbox = draw.textbbox((0, 0), text, font=cell_font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            text_x = x1 + (cell_size - text_width) / 2
            text_y = y1 + (cell_size - text_height) / 2 - 1
            draw.text(
                (text_x, text_y),
                text,
                fill=get_text_color_for_background(fill_rgb),
                font=cell_font,
            )

    if width >= 20 and height >= 20:
        for index in range(0, width + 1, 10):
            x = padding + index * cell_size
            draw.line([x, top, x, top + height * cell_size], fill=(204, 77, 77), width=2)
        for index in range(0, height + 1, 10):
            y = top + index * cell_size
            draw.line([padding, y, padding + width * cell_size, y], fill=(204, 77, 77), width=2)

    legend_top = top + height * cell_size + 16
    draw.text((padding, legend_top), "Legend", fill=(34, 34, 34), font=title_font)
    legend_top += 24
    column_width = (canvas_width - padding * 2) / legend_columns if legend_columns else canvas_width

    for idx, item in enumerate(palette):
        col = idx // legend_rows if legend_rows else 0
        row = idx % legend_rows if legend_rows else idx
        base_x = int(padding + col * column_width)
        base_y = legend_top + row * legend_row_height
        draw.rectangle(
            [base_x, base_y, base_x + 18, base_y + 18],
            fill=tuple(item["rgb"]),
            outline=(180, 180, 180),
        )
        legend_text = f"{item['number']} {item['code']} x{item['count']}"
        draw.text((base_x + 26, base_y + 1), legend_text, fill=(64, 64, 64), font=legend_font)

    file_name = f"{uuid.uuid4().hex}_pattern.png"
    output_path = GENERATED_DIR / file_name
    canvas.save(output_path, format="PNG")
    return file_name


def pixelate_image(image_path, size, max_colors):
    img = Image.open(image_path)
    if img.mode == "RGBA":
        bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
        bg.paste(img, mask=img.split()[3])
        img = bg.convert("RGB")
    elif img.mode != "RGB":
        img = img.convert("RGB")

    img.thumbnail((size, size), Image.LANCZOS)
    canvas = Image.new("RGB", (size, size), (255, 255, 255))
    offset_x = (size - img.width) // 2
    offset_y = (size - img.height) // 2
    canvas.paste(img, (offset_x, offset_y))
    pixels = np.array(canvas)

    grid = []
    for row in range(size):
        row_cells = []
        for col in range(size):
            pixel_rgb = tuple(int(value) for value in pixels[row, col])
            nearest = find_nearest_color(pixel_rgb, COLOR_LIST_LAB)
            row_cells.append(
                {
                    "code": nearest["code"],
                    "name": nearest["name"],
                    "rgb": nearest["rgb"],
                    "original_rgb": list(pixel_rgb),
                }
            )
        grid.append(row_cells)

    grid, color_stats = compress_colors(grid, max_colors)
    pattern_palette = build_pattern_palette(color_stats)
    number_by_code = {item["code"]: item["number"] for item in pattern_palette}
    for row in grid:
        for cell in row:
            cell["number"] = number_by_code[cell["code"]]
    return grid, color_stats, pattern_palette


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    return response


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"ok": True})


@app.route("/media/<path:filename>", methods=["GET"])
def media(filename):
    return send_from_directory(GENERATED_DIR, filename)


@app.route("/api/generate", methods=["POST", "OPTIONS"])
def generate():
    if request.method == "OPTIONS":
        return ("", 204)

    file = request.files.get("image")
    mode = request.form.get("mode", "portrait")
    if mode not in MODE_PRESETS:
        mode = "portrait"

    if not file:
        return jsonify({"error": "请先上传图片。"}), 400

    preset = MODE_PRESETS[mode]
    size = int(request.form.get("size") or preset["size"])
    max_colors = int(request.form.get("max_colors") or preset["max_colors"])
    size = max(24, min(size, 96))
    max_colors = max(6, min(max_colors, 48))

    temp_name = f"{uuid.uuid4().hex}_{file.filename or 'upload.png'}"
    upload_path = UPLOAD_DIR / temp_name
    file.save(upload_path)

    try:
        grid, color_stats, pattern_palette = pixelate_image(upload_path, size=size, max_colors=max_colors)
        preview_name = generate_preview(grid)
        pattern_name = generate_pattern_sheet(grid, pattern_palette)
        response = {
            "mode": mode,
            "mode_label": preset["label"],
            "size": size,
            "total_beads": size * size,
            "max_colors": max_colors,
            "preview_url": f"{request.host_url.rstrip('/')}/media/{preview_name}",
            "pattern_url": f"{request.host_url.rstrip('/')}/media/{pattern_name}",
            "gift_copy": preset["gift_copy"],
            "color_stats": color_stats[:18],
            "pattern_legend": pattern_palette[:18],
            "craft_tips": [
                "建议先从边缘和大色块开始摆放，做起来更稳。",
                "如果想保留更多层次，可以把颜色数提高到 20~32 色。",
                "可以先截图保存图稿，再按颜色清单准备材料。",
            ],
        }
        return jsonify(response)
    finally:
        if upload_path.exists():
            upload_path.unlink()


if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "5050"))
    debug = os.environ.get("FLASK_DEBUG", "1") == "1"
    app.run(host=host, port=port, debug=debug)
