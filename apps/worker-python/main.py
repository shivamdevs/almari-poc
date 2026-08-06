import time
from fastapi import FastAPI, File, UploadFile, Response
from fastapi.responses import JSONResponse
import io
from PIL import Image

from engines.rembg_u2net import remove_bg_rembg
from engines.rmbg_2 import remove_bg_birefnet

app = FastAPI(title="Python Background Removal Worker")

def extract_bbox(image: Image.Image) -> str:
    bbox = image.getbbox()
    if bbox:
        return f"{{ x: {bbox[0]}, y: {bbox[1]}, w: {bbox[2] - bbox[0]}, h: {bbox[3] - bbox[1]} }}"
    return "{}"

@app.post("/api/rembg")
async def process_rembg(image: UploadFile = File(...)):
    start_time = time.time()
    try:
        contents = await image.read()
        img = Image.open(io.BytesIO(contents)).convert("RGBA")
        
        # Process
        result_img = remove_bg_rembg(img)
        
        # Calculate latency and metrics
        latency_ms = int((time.time() - start_time) * 1000)
        bbox_str = extract_bbox(result_img)
        
        # Save to buffer
        img_byte_arr = io.BytesIO()
        result_img.save(img_byte_arr, format='PNG')
        
        return Response(
            content=img_byte_arr.getvalue(),
            media_type="image/png",
            headers={
                "X-Inference-Time": str(latency_ms),
                "X-Bounding-Box": bbox_str
            }
        )
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/api/rmbg-2.0")
async def process_rmbg_2(image: UploadFile = File(...)):
    start_time = time.time()
    try:
        contents = await image.read()
        img = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # Process
        result_img = remove_bg_birefnet(img)
        
        # Calculate latency and metrics
        latency_ms = int((time.time() - start_time) * 1000)
        bbox_str = extract_bbox(result_img)
        
        # Save to buffer
        img_byte_arr = io.BytesIO()
        result_img.save(img_byte_arr, format='PNG')
        
        return Response(
            content=img_byte_arr.getvalue(),
            media_type="image/png",
            headers={
                "X-Inference-Time": str(latency_ms),
                "X-Bounding-Box": bbox_str
            }
        )
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
