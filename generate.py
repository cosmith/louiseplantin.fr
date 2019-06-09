import os
import json
from PIL import Image

filelist = []

if __name__ == "__main__":
    for root, dirs, files in os.walk("./public/images/"):
        if files:
            category = root.split("/")[-1]
            for filename in files:
                print("-", filename)
                filepath = root + "/" + filename
                img = Image.open(filepath)
                width, height = img.size
                img.thumbnail((1000, 1000), Image.ANTIALIAS)
                img.convert("RGB").save(filepath.replace("/images/", "/thumbs/"), "jpeg")
                filelist.append(
                    {
                        "src": f"/thumbs/{category}/{filename}",
                        "width": width,
                        "height": height,
                        "client": filename[:10],
                        "year": "2019",
                        "category": category,
                        "filter": category,
                        "project": filename.replace("_", " ").replace(".jpg", ""),
                    }
                )

    with open("./src/images.json", "w") as f:
        json.dump(filelist, f, indent=4)
