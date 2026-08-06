# Product Requirements Document (PRD)

**Project Title:** Almari POC Lab

**Version:** 1.0.0

**Status:** Draft / Technical Specification

**Primary Stack:** Next.js (App Router), `shadcn/ui`, Bun (Turborepo), FastAPI, WebSockets

**Cost Constraint:** 100% Free / Open Source (Zero API costs, zero cloud database costs, zero managed GPU fees)

---

## 1. Executive Summary & Vision

The **POC Lab** is a self-hosted, modular monorepo platform designed to benchmark and evaluate emerging machine learning pipelines before integrating them into a production mobile app.

The initial milestone (**POC #1: Background Removal Suite**) establishes a real-time, multi-pipeline image segmentation engine. It allows users to upload a photograph and simultaneously execute multiple **free and open-source** background removal models. The system evaluates execution latency, image quality degradation, alpha mask precision, and bounding box metrics necessary for downstream Virtual Try-On (VTO) workflows.

---

## 2. System Architecture & Infrastructure

### 2.1 Monorepo & Container Topology

The platform uses **Bun** as the primary package manager within a **Turborepo** monorepo, orchestrated locally or on self-hosted infrastructure via `docker-compose`.

```text
/poc-lab-monorepo
├── apps/
│   ├── web/                 # Next.js App Router + shadcn/ui (Frontend & UI)
│   ├── ws-gateway/          # Bun Native WebSocket Server (Orchestrator)
│   ├── worker-python/       # FastAPI + PyTorch/ONNX (Bria RMBG 2.0, BiRefNet, rembg)
│   └── worker-bun/          # Bun Runtime (Transformers.js / ONNX in JS)
├── packages/
│   ├── ui/                  # Shared UI components & design system
│   └── types/               # Shared TypeScript definitions (WS Events, Metrics, Payloads)
├── docker-compose.yml       # Local container orchestration
└── turbo.json               # Monorepo build caching setup

```

```
[ Next.js Web UI ]
       │  ▲
       │  │ (WebSocket Streaming / Client ArrayBuffer)
       ▼  │
[ Bun WS Gateway ] ──(In-Memory Fan-Out)──► [ Python Worker (RMBG-2.0 / BiRefNet / rembg) ]
                   ──(In-Memory Fan-Out)──► [ Bun Worker (Transformers.js / RMBG-1.4) ]

```

### 2.2 Zero-Storage Strategy (In-Memory Transit)

- **Hard Storage Rule:** Disk writes are strictly prohibited. Images exist in server memory (`RAM`) strictly for the duration of inference.
- **Buffer Transit:** The client transmits images as binary `ArrayBuffer` payloads over WebSockets. Workers read the buffer, process the tensor in-memory, and stream the transparent PNG buffer back to the WebSocket Gateway.
- **Garbage Collection:** Once sent to the client, the reference is dropped for V8 / Python garbage collection.

---

## 3. Global Application Infrastructure

### 3.1 Authentication & Session Management

A lightweight, zero-database authentication system secures access to the lab environment.

- **TOTP Verification:** Access requires a 6-digit Time-based One-Time Password (TOTP) synced via a master key stored in `.env` (`TOTP_SECRET`).
- **Session Lifecycle:** Successful authentication sets an HTTP-only, secure `poc_session` cookie containing a signed JWT (via `jose`) with a hard **15-minute expiration**.
- **Edge Middleware Guard:** Next.js `middleware.ts` intercepts all requests except `/login` and static assets, validating the JWT state.

### 3.2 Layout & Navigation (`shadcn/ui`)

- **Collapsible Sidebar Layout:** Built using `shadcn/ui` Sidebar components.
- **Navigation Items:**

1. **Background Removal** _(Active / Initial POC)_
2. _Cloth Stitching / VTO (Placeholder for future POC)_
3. _Settings / Environment Metrics (Placeholder)_

---

## 4. POC #1: Background Removal Suite

### 4.1 Free & Open-Source Engine Matrix

The POC executes three open-source engines in parallel:

| Engine Name          | Architecture / Weights           | Container       | Execution Layer             | Resource Requirement     |
| -------------------- | -------------------------------- | --------------- | --------------------------- | ------------------------ |
| **Bria RMBG 2.0**    | BiRefNet Architecture (High Res) | `worker-python` | PyTorch / Python            | CPU / Optional Local GPU |
| **U²-Net (`rembg`)** | Dichotomous Image Segmentation   | `worker-python` | `rembg` Python package      | Lightweight CPU          |
| **RMBG-1.4 (Local)** | ONNX Quantized                   | `worker-bun`    | `@huggingface/transformers` | Bun WASM / JS Runtime    |

_(Note: Paid services like Remove.bg or Photoroom are explicitly excluded from scope)._

---

### 4.2 Detailed UI & Functional Requirements

#### A. Upload & Input Stage

- **Drag-and-Drop Zone:** Built with `react-dropzone` and styled using `shadcn/ui` Card & Button components.
- **Accepted Formats:** `image/png`, `image/jpeg`, `image/webp` (Max file size: 15MB).
- **Preset Test Suite:** Includes 3 pre-loaded test images (e.g., Full-body human portrait, complex hair close-up, loose clothing with semi-transparent edges) to perform repeatable comparisons.

#### B. Real-Time Execution Dashboard

- **WebSocket Dispatch:** Upon uploading, the browser pushes the binary buffer across the WebSocket connection.
- **Progressive Rendering Grid:** The dashboard presents a multi-column responsive grid (one card per engine).
- **Streaming Card States:**
- **Pending/Processing:** Animated `shadcn/ui` Skeleton loader showing dynamic elapsed time counter (ms).
- **Completed:** Immediate swap to the rendered transparent result image.
- **Failed:** Error banner with stack trace details.

#### C. Interactive Background Inspector

A global toolbar allowing the user to modify the background behind **all** engine output cards simultaneously:

- **Checkerboard Pattern:** Default transparency display.
- **Solid Keying Colors:**
- High-visibility **Magenta (`#FF00FF`)** and **Neon Green (`#00FF00`)** to reveal color bleeding and halo edges.

- **Custom Background Overlay:** Upload or select a sample background (e.g., studio backdrop, outdoor scene) to evaluate real-world edge blend.

---

### 4.3 Quality & Performance Inspector Tools

To evaluate suitability for downstream Virtual Try-On models, each completed result card includes an inspectable metadata drawer and visual debugging modes:

```
+-----------------------------------------------------------------------+
|  [ Original / Processed Compare Slider ]                              |
|                                                                       |
|  Controls: [ Checkerboard | Magenta | Green Screen | Pure Mask ]     |
+-----------------------------------------------------------------------+
| Metrics Summary:                                                      |
| • Inference Latency: 1,240 ms    • Input Res: 2048x2048                |
| • Round-Trip Time: 1,380 ms      • Output Res: 2048x2048 (100% Retained)|
| • Subject Bounding Box: { x: 210, y: 84, width: 1628, height: 1880 }  |
+-----------------------------------------------------------------------+

```

1. **Image Comparison Slider:**

- Embedded `react-compare-slider` on each card to drag between the original uploaded image and the transparent cutout.

2. **Alpha Mask View (Pure B&W):**

- A toggle switch converting the image output into a pure binary/grayscale Alpha Channel mask.
- _Purpose:_ Identifies semi-transparent pixels, pinholes, or incomplete human segmentation.

3. **Resolution Preservation Tracker:**

- Displays input resolution ($W \times H$) versus output resolution. Flags engines that forcibly downsample images during pre-processing.

4. **Latency Metrics:**

- **Inference Time ($T_{inf}$):** Exact execution duration recorded within the worker container.
- **Round-Trip Time ($T_{rtt}$):** Total duration from WebSocket dispatch to client frame rendering.

5. **VTO Bounding Box Extractor:**

- Calculates and displays the tight bounding box coordinates (`x`, `y`, `width`, `height`) of the non-transparent human subject pixels.
- Includes a toggle for **Auto-Crop & Aspect Ratio Pad** (centering the subject into a standard 3:4 aspect ratio).

---

## 5. Data Flow & WebSocket Protocol

### 5.1 Message Schemas

#### Client to Gateway: Dispatch Job

```json
{
	"event": "JOB_SUBMIT",
	"jobId": "job_1029384",
	"options": {
		"engines": ["rmbg-2.0", "rembg-u2net", "rmbg-1.4-bun"],
		"extractBoundingBox": true
	},
	"imageBuffer": "<Binary ArrayBuffer attached in frame>"
}
```

#### Gateway to Client: Engine Result Stream (Dispatched per worker completion)

```json
{
	"event": "ENGINE_COMPLETE",
	"jobId": "job_1029384",
	"engine": "rmbg-2.0",
	"metrics": {
		"inferenceTimeMs": 1120,
		"roundTripTimeMs": 1250,
		"originalWidth": 1920,
		"originalHeight": 2560,
		"outputWidth": 1920,
		"outputHeight": 2560,
		"boundingBox": { "x": 320, "y": 110, "width": 1280, "height": 2300 }
	},
	"resultImageBase64": "data:image/png;base64,..."
}
```

---

## 6. Non-Functional Requirements

1. **Zero Financial Overhead:** The entire infrastructure must run using local compute, self-hosted Docker containers, or completely free open-source software libraries. No paid subscriptions or cloud API tokens are required.
2. **Sub-second Edge Response Target:** Bun runtime engines should return within 1,000ms on CPU; heavier Python models must aim under 3,000ms on CPU.
3. **Extensibility:** Adding a new background removal engine should only require adding a route in the worker container and registering the key in the shared `types` package.
4. **Clean Decoupling:** The frontend application must have zero direct knowledge of machine learning dependencies (PyTorch, ONNX, OpenCV); all ML logic remains isolated within worker containers.

---

## 7. Out of Scope (Current Iteration)

- Commercial API integrations (Remove.bg, Photoroom, Cloudinary, Fal.ai, Replicate).
- Persistent database storage (PostgreSQL, MongoDB, Redis).
- Cloud object storage uploads (S3, Cloudflare R2).
- Clothing stitching / generative AI diffusion models (reserved for **POC #2**).
- Multi-tenant authorization / user account management.
