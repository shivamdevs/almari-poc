import { serve } from "bun"
import { removeBackground } from "../engines/rmbg_1_4"

serve({
  port: 8001,
  async fetch(req) {
    const url = new URL(req.url)
    if (url.pathname === "/api/rmbg-1.4" && req.method === "POST") {
      const startTime = Date.now()
      try {
        const formData = await req.formData()
        const image = formData.get("image") as File
        
        if (!image) {
          return new Response("No image provided", { status: 400 })
        }

        const arrayBuffer = await image.arrayBuffer()
        const resultBuffer = await removeBackground(arrayBuffer)
        
        const latency = Date.now() - startTime

        return new Response(resultBuffer, {
          headers: {
            "Content-Type": "image/png",
            "X-Inference-Time": latency.toString(),
            "X-Bounding-Box": "{}" // BBox extraction can be implemented in JS using canvas or sharp
          }
        })
      } catch (err: any) {
        return new Response(err.message, { status: 500 })
      }
    }
    
    return new Response("Bun Worker", { status: 200 })
  },
})

console.log("Bun worker running on port 8001")
