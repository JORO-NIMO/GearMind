import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, Check, RotateCcw, ImageIcon } from "lucide-react";

const CameraScreen = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
      setCameraActive(true);
      setError(null);
    } catch {
      setError("Camera not available. Use file upload instead.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setCameraActive(false);
  }, [stream]);

  const compressImage = (base64: string, maxWidth = 1024, maxHeight = 1024): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // 70% quality, resized
      };
    });
  };

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    
    // Compress immediately
    const compressed = await compressImage(dataUrl);
    setCapturedImage(compressed);
    stopCamera();
  }, [stopCamera]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const rawBase64 = ev.target?.result as string;
      const compressed = await compressImage(rawBase64);
      setCapturedImage(compressed);
      stopCamera();
    };
    reader.readAsDataURL(file);
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirm = () => {
    if (capturedImage) {
      navigate("/result", { state: { image: capturedImage } });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-foreground max-w-lg mx-auto relative">
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
        <button
          onClick={() => { stopCamera(); navigate("/"); }}
          className="w-10 h-10 rounded-full bg-background/20 backdrop-blur-sm flex items-center justify-center"
        >
          <X className="w-5 h-5 text-background" />
        </button>
        <span className="text-xs font-mono text-background/70 tracking-wider uppercase">
          {capturedImage ? "Preview" : "Camera"}
        </span>
        <div className="w-10" />
      </div>

      {/* Viewfinder */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          {capturedImage ? (
            <motion.img
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          ) : cameraActive ? (
            <motion.video
              key="video"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center gap-6 px-8 text-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-background/10 flex items-center justify-center">
                <Camera className="w-10 h-10 text-background/50" />
              </div>
              {error && (
                <p className="text-sm text-background/60">{error}</p>
              )}
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <button
                  onClick={startCamera}
                  className="h-14 rounded-xl bg-primary text-primary-foreground font-display font-semibold flex items-center justify-center gap-2"
                >
                  <Camera className="w-5 h-5" />
                  Open Camera
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="h-14 rounded-xl bg-background/15 text-background font-display font-semibold flex items-center justify-center gap-2 border border-background/20"
                >
                  <ImageIcon className="w-5 h-5" />
                  Upload Photo
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Crosshair overlay when camera active */}
        {cameraActive && !capturedImage && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-64 h-64 border-2 border-background/30 rounded-2xl" />
            <div className="absolute w-4 h-4 border-t-2 border-l-2 border-primary top-1/2 left-1/2 -translate-x-[8.5rem] -translate-y-[8.5rem] rounded-tl" />
            <div className="absolute w-4 h-4 border-t-2 border-r-2 border-primary top-1/2 left-1/2 translate-x-[7.5rem] -translate-y-[8.5rem] rounded-tr" />
            <div className="absolute w-4 h-4 border-b-2 border-l-2 border-primary top-1/2 left-1/2 -translate-x-[8.5rem] translate-y-[7.5rem] rounded-bl" />
            <div className="absolute w-4 h-4 border-b-2 border-r-2 border-primary top-1/2 left-1/2 translate-x-[7.5rem] translate-y-[7.5rem] rounded-br" />
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="p-6 pb-8">
        {capturedImage ? (
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={retake}
              className="w-14 h-14 rounded-full bg-background/15 flex items-center justify-center border border-background/20"
            >
              <RotateCcw className="w-6 h-6 text-background" />
            </button>
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={confirm}
              className="h-14 px-10 rounded-full bg-accent text-accent-foreground font-display font-semibold text-lg flex items-center gap-2"
            >
              <Check className="w-5 h-5" />
              Analyze
            </motion.button>
          </div>
        ) : cameraActive ? (
          <div className="flex justify-center">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={capturePhoto}
              className="w-18 h-18 rounded-full border-4 border-background/40 flex items-center justify-center"
            >
              <div className="w-14 h-14 rounded-full bg-background" />
            </motion.button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CameraScreen;
