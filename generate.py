import json
import os

from tqdm import tqdm
from unidecode import unidecode
from PIL import Image

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
    path_no_ext = os.path.splitext(filepath)[0]
    path = unidecode(path_no_ext).replace("/images/", "/thumbs/").replace(" ", "_")

    MAX_SIZE = 2500 if category == "Facilitation" else 1500
    image = Image.open(filepath)
    original_image_size = max(image.width, image.height)
    max_image_size = min(MAX_SIZE, original_image_size)
    # print(f"original size: {original_image_size}, max size: {max_image_size}")

    for ratio, number in ((0.1, 1), (0.4, 2), (0.7, 3), (1, 4)):
        image = Image.open(filepath)
        size = max_image_size * ratio
        image.thumbnail((size, size), Image.ANTIALIAS)
        image.convert("RGB").save(f"{path}@{number}x.jpg", "jpeg")

    return image.size, path


if __name__ == "__main__":
    for root, dirs, files in os.walk("./public/images/"):
        if files:
            category = root.split("/")[-1]
            print(f"Processing {category}...")

            for filename in tqdm(files):
                if filename.startswith("."):
                    continue

                parts = get_parts(filename)
                filepath = root + "/" + filename
                (width, height), src = save_thumbnails(filepath, category)

                filelist.append(
                    dict(
                        src=f"./thumbs/{src.split('/thumbs/')[1]}",
                        width=width,
                        height=height,
                        category=category,
                        filter=category,
                        **parts,
                    )
                )

    with open("./src/images.json", "w") as f:
        json.dump(filelist, f, indent=4)
