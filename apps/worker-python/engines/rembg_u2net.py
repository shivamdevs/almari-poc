from rembg import remove
from PIL import Image

def remove_bg_rembg(image: Image.Image) -> Image.Image:
    # Use default U2Net model for rembg
    return remove(image)
