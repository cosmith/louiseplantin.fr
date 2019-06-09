import os
import json
from PIL import Image

filelist = []

if __name__ == "__main__":
    for root, dirs, files in os.walk("./public/images/"):
        if files:
            category = root.split("/")[-1]
            for filename in files:
                width, height = Image.open(root + "/" + filename).size
                filelist.append(
                    {
                        "src": f"/images/{category}/{filename}",
                        "width": width,
                        "height": height,
                        "client": "Vinci",
                        "year": "2019",
                        "category": category,
                        "filter": category,
                        "project": filename.replace("_", " ").replace(".jpg", ""),
                    }
                )

    with open("./src/images.json", "w") as f:
        json.dump(filelist, f, indent=4)
