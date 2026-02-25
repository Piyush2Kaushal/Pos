import { useState, useEffect, useRef, useCallback } from "react";
import {
  Scan,
  Camera,
  X,
  CheckCircle2,
  XCircle,
  Zap,
  ZapOff,
  Clock,
  Package,
  RotateCcw,
  CameraOff,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { cn } from "@/app/components/ui/utils";
import { toast } from "sonner";
import { Product } from "@/app/types";

interface ScanHistoryEntry {
  barcode: string;
  product: Product | null;
  timestamp: Date;
  success: boolean;
}

interface BarcodeScannerProps {
  products: Product[];
  onProductFound: (product: Product) => void;
  className?: string;
}

// How fast (ms) successive keystrokes must come to be treated as scanner input
const SCANNER_SPEED_THRESHOLD = 80;

export function BarcodeScanner({ products, onProductFound, className }: BarcodeScannerProps) {
  const [isActive, setIsActive] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);
  const [lastScanResult, setLastScanResult] = useState<"success" | "error" | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [hasBarcodeDetector, setHasBarcodeDetector] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionLoopRef = useRef<number | null>(null);
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);
  const bufferTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check for native BarcodeDetector support
  useEffect(() => {
    setHasBarcodeDetector("BarcodeDetector" in window);
  }, []);

  // Find product by barcode (matches SKU or ID)
  const findProduct = useCallback(
    (barcode: string): Product | null => {
      const cleaned = barcode.trim().toUpperCase();
      return (
        products.find(
          (p) =>
            p.sku.toUpperCase() === cleaned ||
            p.id === barcode.trim() ||
            p.sku.toUpperCase().includes(cleaned)
        ) || null
      );
    },
    [products]
  );

  const handleScan = useCallback(
    (barcode: string) => {
      const code = barcode.trim();
      if (!code) return;

      const product = findProduct(code);
      const entry: ScanHistoryEntry = {
        barcode: code,
        product,
        timestamp: new Date(),
        success: !!product,
      };

      setScanHistory((prev) => [entry, ...prev].slice(0, 10));

      if (product) {
        onProductFound(product);
        setLastScanResult("success");
        toast.success(`Scanned: ${product.name}`, {
          description: `SKU: ${product.sku} · Stock: ${product.stock}`,
          duration: 2000,
        });
      } else {
        setLastScanResult("error");
        toast.error(`Barcode not found: ${code}`, {
          description: "No matching product for this barcode.",
          duration: 2500,
        });
      }

      setTimeout(() => setLastScanResult(null), 1500);
    },
    [findProduct, onProductFound]
  );

  // ─── Global keyboard wedge listener ───────────────────────────────────────
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName.toLowerCase();
      // Ignore if focused in another input/textarea (not our scan input)
      if ((tag === "input" || tag === "textarea") && target !== inputRef.current) return;

      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === "Enter") {
        if (bufferRef.current.length > 0) {
          const code = bufferRef.current;
          bufferRef.current = "";
          handleScan(code);
        }
        return;
      }

      if (e.key.length === 1) {
        // Long gap means manual typing — reset buffer
        if (timeDiff > SCANNER_SPEED_THRESHOLD * 3 && bufferRef.current.length > 0) {
          bufferRef.current = "";
        }
        bufferRef.current += e.key;

        if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
        bufferTimerRef.current = setTimeout(() => {
          if (bufferRef.current.length >= 4) {
            const code = bufferRef.current;
            bufferRef.current = "";
            handleScan(code);
          } else {
            bufferRef.current = "";
          }
        }, 200);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
    };
  }, [isActive, handleScan]);

  // Focus scan input when activated
  useEffect(() => {
    if (isActive && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isActive]);

  // ─── Camera scanner (BarcodeDetector + getUserMedia) ──────────────────────
  const stopCamera = useCallback(() => {
    if (detectionLoopRef.current) {
      cancelAnimationFrame(detectionLoopRef.current);
      detectionLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
    setCameraError(null);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setIsCameraLoading(true);
    setIsCameraOpen(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;

      // Wait a tick for the video element to mount
      await new Promise((r) => setTimeout(r, 150));

      if (!videoRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error("Video element not ready");
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setIsCameraLoading(false);

      if (!hasBarcodeDetector) {
        // No BarcodeDetector — show manual entry only
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detector = new (window as any).BarcodeDetector({
        formats: [
          "ean_13", "ean_8", "upc_a", "upc_e",
          "code_128", "code_39", "code_93",
          "qr_code", "data_matrix", "itf",
        ],
      });

      const detect = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          detectionLoopRef.current = requestAnimationFrame(detect);
          return;
        }
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const code: string = barcodes[0].rawValue;
            handleScan(code);
            stopCamera();
            return;
          }
        } catch (_) {
          // per-frame detection failure — continue
        }
        detectionLoopRef.current = requestAnimationFrame(detect);
      };

      detectionLoopRef.current = requestAnimationFrame(detect);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCameraError(
        msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("denied")
          ? "Camera permission denied. Please allow camera access and try again."
          : msg.toLowerCase().includes("notfound") || msg.toLowerCase().includes("device")
          ? "No camera found on this device."
          : "Could not start camera. Make sure no other app is using it."
      );
      setIsCameraLoading(false);
    }
  }, [hasBarcodeDetector, handleScan, stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // ─── Manual barcode submit ────────────────────────────────────────────────
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      handleScan(manualBarcode.trim());
      setManualBarcode("");
    }
  };

  const toggleScanner = () => {
    setIsActive((v) => !v);
    if (isCameraOpen) stopCamera();
  };

  return (
    <div className={cn("", className)}>
      {/* ── Compact scanner bar ─────────────────────────────────────── */}
      <div
        className={cn(
          "rounded-xl border transition-all duration-300",
          isActive
            ? "border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md shadow-blue-100"
            : "border-gray-200 bg-white"
        )}
      >
        {/* Header row */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          {/* Status dot */}
          <div
            className={cn(
              "w-2 h-2 rounded-full shrink-0 transition-colors",
              lastScanResult === "success"
                ? "bg-green-500 animate-ping"
                : lastScanResult === "error"
                ? "bg-red-500 animate-ping"
                : isActive
                ? "bg-blue-500 animate-pulse"
                : "bg-gray-300"
            )}
          />

          <Scan
            className={cn(
              "w-4 h-4 shrink-0",
              isActive ? "text-blue-600" : "text-gray-400"
            )}
          />

          <span
            className={cn(
              "text-sm font-semibold",
              isActive ? "text-blue-700" : "text-gray-500"
            )}
          >
            Barcode Scanner
          </span>

          {isActive && (
            <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] px-1.5 py-0">
              ACTIVE
            </Badge>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            {isActive && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
                onClick={startCamera}
                disabled={isCameraOpen}
              >
                <Camera className="w-3.5 h-3.5" />
                Camera
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              variant={isActive ? "default" : "outline"}
              className={cn(
                "h-7 gap-1.5 text-xs",
                isActive
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              )}
              onClick={toggleScanner}
            >
              {isActive ? (
                <>
                  <ZapOff className="w-3.5 h-3.5" />
                  Disable
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  Enable
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Active body */}
        {isActive && (
          <div className="px-3 pb-3 space-y-2.5 border-t border-blue-100">
            <form onSubmit={handleManualSubmit} className="flex gap-2 pt-2.5">
              <div className="relative flex-1">
                <Scan className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-400" />
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Scan or type barcode / SKU…"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  className="pl-8 h-8 text-sm border-blue-200 focus:border-blue-400 bg-white"
                  autoComplete="off"
                />
              </div>
              <Button
                type="submit"
                size="sm"
                className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                disabled={!manualBarcode.trim()}
              >
                Add
              </Button>
            </form>

            <p className="text-[11px] text-blue-600 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              USB scanner auto-detected · physical scanners work automatically
            </p>

            {/* Scan history */}
            {scanHistory.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Recent Scans
                  </p>
                  <button
                    type="button"
                    onClick={() => setScanHistory([])}
                    className="text-[10px] text-gray-400 hover:text-red-500 flex items-center gap-0.5"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    Clear
                  </button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {scanHistory.map((entry, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1 rounded-lg text-xs",
                        entry.success
                          ? "bg-green-50 border border-green-100"
                          : "bg-red-50 border border-red-100"
                      )}
                    >
                      {entry.success ? (
                        <CheckCircle2 className="w-3 h-3 text-green-600 shrink-0" />
                      ) : (
                        <XCircle className="w-3 h-3 text-red-500 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "truncate font-medium",
                            entry.success ? "text-green-800" : "text-red-700"
                          )}
                        >
                          {entry.product ? entry.product.name : entry.barcode}
                        </p>
                        {entry.product && (
                          <p className="text-[10px] text-gray-500">{entry.product.sku}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {entry.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Camera modal ────────────────────────────────────────────── */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
              <div className="flex items-center gap-2 text-white">
                <Camera className="w-4 h-4" />
                <span className="font-semibold text-sm">Camera Barcode Scanner</span>
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Loading */}
              {isCameraLoading && (
                <div className="flex flex-col items-center justify-center h-44 gap-3">
                  <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-500">Starting camera…</p>
                </div>
              )}

              {/* Error */}
              {cameraError && (
                <div className="flex flex-col items-center justify-center h-44 gap-3 text-center px-2">
                  <CameraOff className="w-10 h-10 text-red-400" />
                  <p className="text-sm text-red-600">{cameraError}</p>
                  <Button size="sm" variant="outline" onClick={startCamera}>
                    Try Again
                  </Button>
                </div>
              )}

              {/* Video feed */}
              {!cameraError && (
                <div className={cn("relative rounded-xl overflow-hidden bg-black", isCameraLoading ? "hidden" : "block")}>
                  <video
                    ref={videoRef}
                    className="w-full rounded-xl"
                    playsInline
                    muted
                  />
                  {/* Scanning reticle */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-52 h-20 border-2 border-blue-400 rounded-lg relative">
                      <span className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-blue-500 rounded-tl" />
                      <span className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-blue-500 rounded-tr" />
                      <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-blue-500 rounded-bl" />
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-blue-500 rounded-br" />
                      {/* Scanning line animation */}
                      <div className="absolute left-0 right-0 h-0.5 bg-blue-400/70 animate-[scan_2s_ease-in-out_infinite]" style={{ top: "50%" }} />
                    </div>
                  </div>
                </div>
              )}

              {!hasBarcodeDetector && !isCameraLoading && !cameraError && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 shrink-0" />
                  Auto-detection not supported in this browser. Use the manual entry below.
                </p>
              )}

              {!isCameraLoading && !cameraError && (
                <p className="text-xs text-center text-gray-500 flex items-center justify-center gap-1">
                  <Package className="w-3 h-3" />
                  Point camera at a product barcode or QR code
                </p>
              )}
            </div>

            {/* Manual fallback */}
            <div className="px-4 pb-4 border-t pt-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (manualBarcode.trim()) {
                    handleScan(manualBarcode.trim());
                    setManualBarcode("");
                    stopCamera();
                  }
                }}
                className="flex gap-2"
              >
                <Input
                  type="text"
                  placeholder="Or type barcode / SKU manually…"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  className="h-8 text-sm"
                  autoComplete="off"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                  disabled={!manualBarcode.trim()}
                >
                  Add
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
