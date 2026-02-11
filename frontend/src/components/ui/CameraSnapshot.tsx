import { useRef, useState, useEffect } from "react";
import { Camera, X } from "lucide-react";

interface CameraSnapshotProps {
    onCapture: (file: File) => void;
    onClose: () => void;
}

export const CameraSnapshot = ({ onCapture, onClose }: CameraSnapshotProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const startCamera = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "environment" }, // Prefer back camera on mobile
                });
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (err) {
                console.error("Camera access error:", err);
                setError("Could not access camera. Please check permissions.");
            }
        };

        startCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

    const handleCapture = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        if (context) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            canvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], "snapshot.jpg", { type: "image/jpeg" });
                    onCapture(file);
                }
            }, "image/jpeg", 0.9);
        }
    };

    return (
        <div style={{ position: "relative", width: "100%", height: "100%", background: "#000", borderRadius: "8px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {error ? (
                <div style={{ padding: "2rem", color: "#ef4444", textAlign: "center" }}>{error}</div>
            ) : (
                <>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <canvas ref={canvasRef} style={{ display: "none" }} />

                    <div style={{
                        position: "absolute",
                        bottom: "20px",
                        left: "0",
                        width: "100%",
                        display: "flex",
                        justifyContent: "center",
                        gap: "20px",
                        zIndex: 10
                    }}>
                        <button
                            onClick={onClose}
                            style={{
                                background: "rgba(255, 255, 255, 0.2)",
                                border: "none",
                                borderRadius: "50%",
                                width: "50px",
                                height: "50px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                cursor: "pointer"
                            }}
                        >
                            <X size={24} />
                        </button>
                        <button
                            onClick={handleCapture}
                            style={{
                                background: "var(--accent-primary)",
                                border: "4px solid rgba(255,255,255,0.3)",
                                borderRadius: "50%",
                                width: "70px",
                                height: "70px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "black",
                                cursor: "pointer",
                                boxShadow: "0 0 20px rgba(0,0,0,0.5)"
                            }}
                        >
                            <Camera size={32} />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};