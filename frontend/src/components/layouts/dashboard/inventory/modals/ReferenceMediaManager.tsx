import React, { useEffect, useState, useRef } from "react";
import { Upload, Trash2, Image as ImageIcon, Loader2 } from "lucide-react";
import {
    getReferenceImages,
    uploadReferenceImages,
    deleteReferenceImage
} from "@/api/axios";

interface ReferenceImageManagerProps {
    productId: number;
    scanCode: string;
}

export const ReferenceImageManager = ({ productId, scanCode }: ReferenceImageManagerProps) => {
    const [images, setImages] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchImages = async () => {
        if (!productId) return;
        setLoading(true);
        try {
            const data = await getReferenceImages(productId);
            setImages(data);
        } catch (error) {
            console.error("Failed to load reference images", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchImages();
    }, [productId]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        try {
            // API expects a list of files
            await uploadReferenceImages(scanCode, Array.from(files));
            await fetchImages();
        } catch (error) {
            console.error("Upload failed", error);
            alert("Failed to upload images. Ensure files are valid images and under 10MB.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleDelete = async (imageId: number) => {
        if (!confirm("Are you sure you want to delete this reference image?")) return;
        try {
            await deleteReferenceImage(imageId);
            setImages(images.filter(img => img.id !== imageId));
        } catch (error) {
            console.error("Delete failed", error);
            alert("Failed to delete image.");
        }
    };

    return (
        <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--border-input)", paddingTop: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h4 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                    <ImageIcon size={18} className="icon-accent" />
                    AI Reference Images
                </h4>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    {images.length} / 10 images
                </div>
            </div>

            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
                gap: "10px",
                marginBottom: "1rem"
            }}>
                {images.map(img => (
                    <div key={img.id} style={{ position: "relative", aspectRatio: "1", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border-input)" }}>
                        {/* Używamy baseURL z axiosa, bo ścieżka z bazy jest relatywna */}
                        <img
                            src={`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${img.imageUrl}`}
                            alt="Ref"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                        <button
                            onClick={() => handleDelete(img.id)}
                            style={{
                                position: "absolute", top: 2, right: 2,
                                background: "rgba(0,0,0,0.6)", color: "#ef4444",
                                border: "none", borderRadius: "4px",
                                padding: "4px", cursor: "pointer"
                            }}
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                ))}

                {images.length < 10 && (
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        style={{
                            aspectRatio: "1",
                            background: "rgba(255,255,255,0.05)",
                            border: "1px dashed var(--border-input)",
                            borderRadius: "8px",
                            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                            cursor: uploading ? "not-allowed" : "pointer",
                            color: "var(--text-muted)",
                            transition: "all 0.2s"
                        }}
                    >
                        {uploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                        <span style={{ fontSize: "0.7rem", marginTop: "4px" }}>Add</span>
                    </button>
                )}
            </div>

            <input
                type="file"
                multiple
                accept="image/png, image/jpeg"
                ref={fileInputRef}
                hidden
                onChange={handleUpload}
            />

            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>
                Upload photos of this product from different angles to enable AI recognition.
            </p>
        </div>
    );
};