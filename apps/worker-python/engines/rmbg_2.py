from PIL import Image
import torch
import torch.nn.functional as F
from torchvision.transforms.functional import normalize
from transformers import AutoModelForImageSegmentation

# Load model globally to keep it in memory
model_id = "briaai/RMBG-2.0"
# Specify trust_remote_code=True since BiRefNet architecture requires it in some versions,
# but briaai/RMBG-2.0 is a standard AutoModelForImageSegmentation if using transformers >= 4.45
# We'll use the standard initialization for it.
device = "cpu"
try:
    model = AutoModelForImageSegmentation.from_pretrained(model_id, trust_remote_code=True)
    model.to(device)
    model.eval()
except Exception as e:
    print(f"Failed to load RMBG-2.0 model: {e}")
    model = None

def remove_bg_birefnet(image: Image.Image) -> Image.Image:
    if model is None:
        raise Exception("Model not loaded")

    # Resize image to model input size (usually 1024x1024 for RMBG-2.0)
    orig_size = image.size
    img_tensor = torch.tensor(image.resize((1024, 1024))).float().permute(2, 0, 1) / 255.0
    img_tensor = normalize(img_tensor, [0.5, 0.5, 0.5], [1.0, 1.0, 1.0])
    img_tensor = img_tensor.unsqueeze(0).to(device)

    with torch.no_grad():
        preds = model(img_tensor)[-1].sigmoid().cpu()
    
    pred = preds[0].squeeze()
    pred_pil = Image.fromarray((pred.numpy() * 255).astype("uint8")).resize(orig_size, resample=Image.Resampling.LANCZOS)
    
    # Apply mask to original image
    image = image.convert("RGBA")
    image.putalpha(pred_pil)
    
    return image
