import json
import os

from PIL import Image
from tqdm import tqdm
from unidecode import unidecode

ORIGINALS_DIR = "./originals/"
THUMBS_DIR = "./public/thumbs/"

filelist = []


def get_parts(filename):
    name = os.path.splitext(filename)[0]
    parts = name.split("|")

    if len(parts) == 4:
        [client, year, project, description] = parts
        number = 0
    elif len(parts) == 5:
        [client, year, project, description, number] = parts
    else:
        raise ValueError(f"invalid file name {name} (path: {filename})")

    return {
        "client": client,
        "year": year,
        "project": project,
        "description": description,
        "number": number,
    }


def save_thumbnails(filepath, category):
    relpath = os.path.relpath(os.path.splitext(filepath)[0], ORIGINALS_DIR)
    path = os.path.join(THUMBS_DIR, unidecode(relpath).replace(" ", "_"))
    os.makedirs(os.path.dirname(path), exist_ok=True)

    max_size = 3500 if category == "Facilitation" else 1500
    image = Image.open(filepath)
    original_image_size = max(*image.size)

    for ratio, number in ((0.1, 1), (0.4, 2), (0.7, 3), (1, 4)):
        image = Image.open(filepath)
        factor = max_size / original_image_size * ratio
        new_size = (round(image.width * factor), round(image.height * factor))
        image = image.resize(new_size, Image.LANCZOS)
        image.convert("RGB").save(
            f"{path}@{number}x.jpg",
            "jpeg",
            quality=75,
            optimize=True,
            progressive=True,
        )

    return image.size, path


if __name__ == "__main__":
    for root, dirs, files in os.walk(ORIGINALS_DIR):
        if files:
            category = root.split("/")[-1]
            print(f"Processing {category}...")

            for filename in tqdm(files):
                if filename.startswith("."):
                    continue

                try:
                    parts = get_parts(filename)
                except ValueError as e:
                    print(f"Skipping file", e)
                    continue

                filepath = root + "/" + filename
                (width, height), src = save_thumbnails(filepath, category)

                filelist.append(
                    dict(
                        src=f"./thumbs/{os.path.relpath(src, THUMBS_DIR)}",
                        width=width,
                        height=height,
                        category=category,
                        filter=category,
                        **parts,
                    )
                )

    with open("./src/images.json", "w") as f:
        json.dump(filelist, f, indent=4)
