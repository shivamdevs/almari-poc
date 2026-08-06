import { AutoModel, AutoProcessor, env, RawImage } from "@xenova/transformers"
import sharp from "sharp"

// Configure transformers to use local cache and avoid downloading every time
env.allowLocalModels = false
env.useBrowserCache = false

let model: any = null
let processor: any = null

async function init() {
  if (!model) {
    console.log("Loading RMBG-1.4...")
    model = await AutoModel.from_pretrained('briaai/RMBG-1.4', {
      config: { model_type: 'custom' },
    })
    processor = await AutoProcessor.from_pretrained('briaai/RMBG-1.4', {
      config: {
        do_normalize: true,
        do_pad: false,
        do_rescale: true,
        do_resize: false, // Prevent canvas usage in Bun
        image_mean: [0.5, 0.5, 0.5],
        feature_extractor_type: "ImageFeatureExtractor",
        image_std: [1, 1, 1],
        resample: 2,
        rescale_factor: 0.00392156862745098,
        size: { width: 1024, height: 1024 },
      }
    })
    console.log("RMBG-1.4 loaded!")
  }
}

// Pre-load the model
init()

export async function removeBackground(imageBuffer: ArrayBuffer): Promise<ArrayBuffer> {
  await init()
  
  const image = sharp(imageBuffer)
  const metadata = await image.metadata()
  
  if (!metadata.width || !metadata.height) {
    throw new Error("Could not determine image dimensions")
  }

  // 1. Resize to 1024x1024 using sharp instead of canvas
  const resizedForModel = await image
    .clone()
    .resize(1024, 1024, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  
  const rawImage = new RawImage(
    new Uint8ClampedArray(resizedForModel.data),
    resizedForModel.info.width,
    resizedForModel.info.height,
    resizedForModel.info.channels
  )

  // 2. Preprocess (normalization only, no resize)
  const { pixel_values } = await processor(rawImage)
  
  // 3. Predict
  const { output } = await model({ input: pixel_values })
  
  // 4. Extract mask array (1024x1024, 1 channel)
  const maskData = output[0].mul(255).to('uint8').data
  const maskBuffer = Buffer.from(maskData)
  
  // 5. Resize mask back to original dimensions using sharp
  const resizedMaskBuffer = await sharp(maskBuffer, {
    raw: {
      width: 1024,
      height: 1024,
      channels: 1
    }
  })
    .resize(metadata.width, metadata.height, { fit: "fill" })
    .toBuffer()

  // 6. Apply mask to original image
  const finalImage = await sharp(Buffer.from(imageBuffer))
    .ensureAlpha()
    .joinChannel(Buffer.from(resizedMaskBuffer), {
      raw: {
        width: metadata.width,
        height: metadata.height,
        channels: 1
      }
    }) // Replace alpha channel
    .png()
    .toBuffer()

  return finalImage
}
