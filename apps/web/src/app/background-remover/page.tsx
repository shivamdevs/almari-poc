"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  CheckCircle2,
  Grid2X2,
  Image as ImageIcon,
  Maximize2,
  SlidersHorizontal,
  Square,
  UploadCloudIcon,
} from "lucide-react";
import {
  ReactCompareSlider,
  ReactCompareSliderImage,
} from "react-compare-slider";

type EngineStatus = "pending" | "processing" | "completed" | "failed";

interface EngineResult {
  id: string;
  name: string;
  status: EngineStatus;
  resultImage?: string;
  error?: string;
  metrics?: {
    latency: number;
    rtt: number;
    bbox: string;
  };
}

const ENGINES = [
  { id: "rmbg-2.0", name: "Bria RMBG 2.0 (BiRefNet)" },
  { id: "rembg", name: "U²-Net (rembg)" },
  { id: "rmbg-1.4", name: "RMBG-1.4 (Transformers.js)" },
];

export default function DashboardPage() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<"grid" | "single">("grid");
  const [viewMode, setViewMode] = useState<"slider" | "result">("slider");
  const [bgMode, setBgMode] = useState<
    "checkerboard" | "magenta" | "green" | "custom"
  >("checkerboard");
  const [results, setResults] = useState<EngineResult[]>(
    ENGINES.map((e) => ({ ...e, status: "pending" })),
  );

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSourceImage(url);

      // Reset results to processing
      setResults(
        ENGINES.map((e) => ({
          ...e,
          status: "processing",
          resultImage: undefined,
          error: undefined,
          metrics: undefined,
        })),
      );

      const wsUrl = process.env.NEXT_PUBLIC_WS_GATEWAY_URL ||
        "ws://localhost:8080";
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        // Send binary data
        file.arrayBuffer().then((buffer) => {
          ws.send(buffer);
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === "ENGINE_COMPLETE") {
            setResults((prev) =>
              prev.map((e) => {
                if (e.id === data.engine) {
                  return {
                    ...e,
                    status: data.status === "failed" ? "failed" : "completed",
                    resultImage: data.resultImageBase64,
                    error: data.error,
                    metrics: data.metrics,
                  };
                }
                return e;
              })
            );
          }
        } catch (err) {
          console.error("Failed to parse websocket message", err);
        }
      };

      ws.onerror = () => {
        setResults((prev) =>
          prev.map((e) => ({
            ...e,
            status: e.status === "processing" ? "failed" : e.status,
            error: "WebSocket connection error",
          }))
        );
      };
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpeg", ".jpg", ".webp"] },
    maxFiles: 1,
    maxSize: 15 * 1024 * 1024, // 15MB
  });

  // Background style computation
  const getBgStyle = () => {
    if (bgMode === "magenta") return { backgroundColor: "#FF00FF" };
    if (bgMode === "green") return { backgroundColor: "#00FF00" };
    if (bgMode === "checkerboard") {
      return {
        backgroundImage:
          `repeating-linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), repeating-linear-gradient(45deg, #ccc 25%, #fff 25%, #fff 75%, #ccc 75%, #ccc)`,
        backgroundPosition: `0 0, 10px 10px`,
        backgroundSize: `20px 20px`,
      };
    }
    return {};
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 rounded-t-xl">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4 my-auto" />
          <h1 className="text-sm font-semibold tracking-tight">
            Background Remover
          </h1>

          <div className="ml-auto flex items-center space-x-2">
            <div className="flex items-center space-x-1 border-r pr-2 mr-2">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size="icon"
                      variant={layoutMode === "grid" ? "secondary" : "ghost"}
                      className="h-8 w-8"
                      onClick={() => setLayoutMode("grid")}
                    >
                      <Grid2X2 className="h-4 w-4" />
                    </Button>
                  }
                />
                <TooltipContent>Grid Layout</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size="icon"
                      variant={layoutMode === "single" ? "secondary" : "ghost"}
                      className="h-8 w-8"
                      onClick={() => setLayoutMode("single")}
                    >
                      <Square className="h-4 w-4" />
                    </Button>
                  }
                />
                <TooltipContent>Single Column Layout</TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center space-x-1 border-r pr-2 mr-2">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size="icon"
                      variant={viewMode === "slider" ? "secondary" : "ghost"}
                      className="h-8 w-8"
                      onClick={() => setViewMode("slider")}
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                    </Button>
                  }
                />
                <TooltipContent>Slider View</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size="icon"
                      variant={viewMode === "result" ? "secondary" : "ghost"}
                      className="h-8 w-8"
                      onClick={() => setViewMode("result")}
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                  }
                />
                <TooltipContent>Result Image Only</TooltipContent>
              </Tooltip>
            </div>
            <span className="text-xs text-muted-foreground mr-2">
              Background:
            </span>
            <Button
              size="sm"
              variant={bgMode === "checkerboard" ? "default" : "outline"}
              onClick={() => setBgMode("checkerboard")}
            >
              Checker
            </Button>
            <Button
              size="sm"
              variant={bgMode === "magenta" ? "default" : "outline"}
              onClick={() => setBgMode("magenta")}
            >
              Magenta
            </Button>
            <Button
              size="sm"
              variant={bgMode === "green" ? "default" : "outline"}
              onClick={() => setBgMode("green")}
            >
              Green
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
          {!sourceImage
            ? (
              <div
                {...getRootProps()}
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-12 transition-colors cursor-pointer min-h-[400px] ${
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/25"
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                  <UploadCloudIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  Drop your image here
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Supports PNG, JPG, WEBP up to 15MB
                </p>
                <Button variant="secondary">Select File</Button>
              </div>
            )
            : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" /> Source & Real-Time Output
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSourceImage(null);
                      setResults(
                        ENGINES.map((e) => ({ ...e, status: "pending" })),
                      );
                    }}
                  >
                    Upload New Image
                  </Button>
                </div>

                <div
                  className={layoutMode === "grid"
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                    : "flex flex-col gap-6 w-full max-w-5xl mx-auto"}
                >
                  {/* Source Image Card */}
                  <div className="flex flex-col rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                    <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                      <span className="font-medium text-sm">
                        Original Image
                      </span>
                    </div>
                    <div className="relative bg-muted flex items-center justify-center overflow-hidden">
                      <img
                        src={sourceImage}
                        alt="Source"
                        className="w-full h-auto object-contain"
                      />
                    </div>
                  </div>

                  {/* Engine Result Cards */}
                  {results.map((engine) => (
                    <div
                      key={engine.id}
                      className="flex flex-col rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden"
                    >
                      <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                        <div className="flex items-center space-x-2 truncate">
                          <span className="font-medium text-sm truncate pr-2">
                            {engine.name}
                          </span>
                          {engine.status === "processing" && (
                            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                          )}
                          {engine.status === "completed" && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          )}
                          {engine.status === "failed" && (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>

                        {engine.status === "completed" && engine.resultImage &&
                          (
                            <Dialog>
                              <DialogTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 ml-2 shrink-0"
                                  >
                                    <Maximize2 className="h-3.5 w-3.5" />
                                  </Button>
                                }
                              />
                              <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-full flex flex-col p-0 overflow-hidden bg-muted/50 border-none shadow-2xl">
                                <DialogTitle className="sr-only">
                                  Fullscreen View
                                </DialogTitle>
                                <div className="flex-1 w-full h-full p-4 md:p-8 flex items-center justify-center">
                                  {viewMode === "slider"
                                    ? (
                                      <ReactCompareSlider
                                        className="w-full h-full max-h-[85vh] rounded-lg shadow-2xl border bg-background"
                                        style={getBgStyle()}
                                        itemOne={
                                          <ReactCompareSliderImage
                                            src={sourceImage}
                                            alt="Original"
                                            style={{ objectFit: "contain" }}
                                          />
                                        }
                                        itemTwo={
                                          <ReactCompareSliderImage
                                            src={engine.resultImage}
                                            alt="Result"
                                            style={{ objectFit: "contain" }}
                                          />
                                        }
                                      />
                                    )
                                    : (
                                      <img
                                        src={engine.resultImage}
                                        alt="Result"
                                        className="w-full h-full max-h-[85vh] object-contain rounded-lg shadow-2xl border"
                                        style={getBgStyle()}
                                      />
                                    )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                      </div>

                      <div
                        className="relative overflow-hidden flex items-center justify-center"
                        style={getBgStyle()}
                      >
                        {/* Hidden image to force exact aspect ratio of the original image without cropping */}
                        <img
                          src={sourceImage}
                          className="w-full h-auto opacity-0 pointer-events-none"
                          aria-hidden="true"
                        />

                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          {engine.status === "pending" && (
                            <div className="text-sm text-muted-foreground">
                              Waiting for input...
                            </div>
                          )}

                          {engine.status === "processing" && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10 space-y-4">
                              <Skeleton className="h-32 w-32 rounded-full" />
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-sm font-medium animate-pulse">
                                  Processing tensor...
                                </span>
                                <span className="text-xs text-muted-foreground font-mono">
                                  0.0ms
                                </span>
                              </div>
                            </div>
                          )}

                          {engine.status === "completed" &&
                            engine.resultImage &&
                            (viewMode === "slider"
                              ? (
                                <ReactCompareSlider
                                  className="w-full h-full"
                                  itemOne={
                                    <ReactCompareSliderImage
                                      src={sourceImage}
                                      alt="Original"
                                      style={{ objectFit: "contain" }}
                                    />
                                  }
                                  itemTwo={
                                    <ReactCompareSliderImage
                                      src={engine.resultImage}
                                      alt="Result"
                                      style={{ objectFit: "contain" }}
                                    />
                                  }
                                />
                              )
                              : (
                                <img
                                  src={engine.resultImage}
                                  alt="Result"
                                  className="absolute inset-0 w-full h-full object-contain"
                                />
                              ))}

                          {engine.status === "failed" && (
                            <div className="text-sm text-red-500 font-medium px-4 text-center">
                              {engine.error || "Inference failed"}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Metrics Drawer */}
                      {engine.status === "completed" && engine.metrics && (
                        <div className="p-3 bg-muted/10 text-xs space-y-1.5 border-t">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Latency
                            </span>
                            <span className="font-mono">
                              {engine.metrics.latency}ms
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Round Trip
                            </span>
                            <span className="font-mono">
                              {engine.metrics.rtt}ms
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Bounding Box
                            </span>
                            <span
                              className="font-mono truncate ml-2"
                              title={engine.metrics.bbox}
                            >
                              {engine.metrics.bbox}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
