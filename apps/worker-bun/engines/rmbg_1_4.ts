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
        do_resize: true,
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
  
  // Use sharp to read the image buffer and convert to RawImage format
  const image = sharp(imageBuffer)
  const metadata = await image.metadata()
  
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  
  const rawImage = new RawImage(
    new Uint8ClampedArray(data),
    info.width,
    info.height,
    info.channels
  )

  // Preprocess
  const { pixel_values } = await processor(rawImage)
  
  // Predict
  const { output } = await model({ input: pixel_values })
  
  // Read mask
  const mask = await RawImage.fromTensor(output[0].mul(255).to('uint8')).resize(rawImage.width, rawImage.height)
  
  // Apply mask to original image
  const maskBuffer = Buffer.from(mask.data)
  
  const finalImage = await sharp(imageBuffer)
    .ensureAlpha()
    .joinChannel(maskBuffer) // Extract alpha channel
    .png()
    .toBuffer()

  return finalImage
}
