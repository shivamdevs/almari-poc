import { serve } from "bun"

const WORKER_PYTHON_URL = process.env.WORKER_PYTHON_URL || "http://worker-python:8000"
const WORKER_BUN_URL = process.env.WORKER_BUN_URL || "http://worker-bun:8001"

serve({
  port: 8080,
  fetch(req, server) {
    if (server.upgrade(req)) {
      return
    }
    return new Response("WebSocket Gateway for Almari POC Lab", { status: 200 })
  },
  websocket: {
    message(ws, message) {
      // Message can be string (JSON config) or binary (Image buffer)
      // Since it's a simple POC, we can assume binary buffer is preceded by a JSON message
      // Or we can just fan out the binary buffer to all workers via HTTP POST and return results
      
      if (message instanceof ArrayBuffer || message instanceof Uint8Array) {
        const jobId = `job_${Date.now()}`
        
        const engines = [
          { id: "rmbg-2.0", url: `${WORKER_PYTHON_URL}/api/rmbg-2.0` },
          { id: "rembg", url: `${WORKER_PYTHON_URL}/api/rembg` },
          { id: "rmbg-1.4", url: `${WORKER_BUN_URL}/api/rmbg-1.4` }
        ]

        const startTime = Date.now()

        engines.forEach(async (engine) => {
          try {
            const formData = new FormData()
            formData.append("image", new Blob([message]), "upload.png")
            
            const response = await fetch(engine.url, {
              method: "POST",
              body: formData
            })

            if (!response.ok) {
              throw new Error(`Worker returned ${response.status}`)
            }

            const arrayBuffer = await response.arrayBuffer()
            const base64String = Buffer.from(arrayBuffer).toString('base64')
            const resultImageBase64 = `data:image/png;base64,${base64String}`
            
            const rtt = Date.now() - startTime
            
            // Send back to client
            ws.send(JSON.stringify({
              event: "ENGINE_COMPLETE",
              jobId,
              engine: engine.id,
              metrics: {
                latency: Number(response.headers.get("X-Inference-Time") || rtt - 50),
                rtt,
                boundingBox: response.headers.get("X-Bounding-Box") || "{}"
              },
              resultImageBase64
            }))

          } catch (err: any) {
            ws.send(JSON.stringify({
              event: "ENGINE_COMPLETE",
              jobId,
              engine: engine.id,
              status: "failed",
              error: err.message
            }))
          }
        })
      }
    },
    open(ws) {
      console.log("Client connected")
    },
    close(ws, code, message) {
      console.log("Client disconnected")
    },
  },
})

console.log("WebSocket Gateway running on port 8080")
