import React, { useEffect, useState, useRef } from "react";
import { Upload, Trash2, Image as ImageIcon, Loader2 } from "lucide-react";
import {
  getReferenceImages,
  uploadReferenceImages,
  deleteReferenceImage,
} from "@/api/axios";
import { useTranslation } from "@/context/LanguageContext";

interface ReferenceImageManagerProps {
  productId: number;
  scanCode: string;
}

export const ReferenceImageManager = ({
  productId,
  scanCode,
}: ReferenceImageManagerProps) => {
  const { t } = useTranslation();
  const refT: any = t.dashboardPage.content.inventory.referenceMedia;
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pobieranie istniejących obrazów referencyjnych dla tego produktu
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

  // Obsługa przesyłania nowych zdjęć (Trening AI)
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      // Wywołanie endpointu /upload-reference
      await uploadReferenceImages(scanCode, Array.from(files));
      await fetchImages(); // Odśwież listę po udanym uploadzie
    } catch (error) {
      console.error("Upload failed", error);
      alert(refT.uploadFailed);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Usuwanie błędnych wzorców
  const handleDelete = async (imageId: number) => {
    if (!confirm(refT.confirmDelete))
      return;
    try {
      await deleteReferenceImage(imageId);
      setImages(images.filter((img) => img.id !== imageId));
    } catch (error) {
      console.error("Delete failed", error);
      alert(refT.deleteFailed);
    }
  };

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h4
          style={{
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "1rem",
          }}
        >
          <ImageIcon size={18} className="icon-accent" />
          {refT.title}
        </h4>
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
          {images.length} {refT.countMaxSuffix}
        </div>
      </div>

      {/* Siatka zdjęć */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
          gap: "12px",
          marginBottom: "1rem",
        }}
      >
        {loading ? (
          <div
            style={{
              gridColumn: "1/-1",
              textAlign: "center",
              padding: "1rem",
              color: "var(--text-muted)",
            }}
          >
            <Loader2 className="animate-spin" style={{ margin: "0 auto" }} />
          </div>
        ) : (
          <>
            {images.map((img) => (
              <div
                key={img.id}
                style={{
                  position: "relative",
                  aspectRatio: "1",
                  borderRadius: "8px",
                  overflow: "hidden",
                  border: "1px solid var(--border-input)",
                  background: "#000",
                }}
              >
                <img
                  src={`${import.meta.env.VITE_API_URL || "http://localhost:5001"}${img.imageUrl}`}
                  alt="Ref"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
                    opacity: 0,
                    transition: "opacity 0.2s",
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "flex-end",
                    padding: "4px",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
                >
                  <button
                    onClick={() => handleDelete(img.id)}
                    style={{
                      background: "#ef4444",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      padding: "4px",
                      cursor: "pointer",
                      display: "flex",
                    }}
                    title={refT.removeTooltip}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}

            {/* Przycisk dodawania */}
            {images.length < 10 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  aspectRatio: "1",
                  background: "rgba(255,255,255,0.03)",
                  border: "2px dashed var(--border-input)",
                  borderRadius: "8px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: uploading ? "not-allowed" : "pointer",
                  color: "var(--accent-primary)",
                  transition: "all 0.2s",
                }}
              >
                {uploading ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : (
                  <Upload size={24} />
                )}
                <span
                  style={{
                    fontSize: "0.75rem",
                    marginTop: "8px",
                    fontWeight: 600,
                  }}
                >
                  {refT.addPhoto}
                </span>
              </button>
            )}
          </>
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

      <div
        style={{
          background: "rgba(234, 179, 8, 0.1)",
          borderLeft: "3px solid #eab308",
          padding: "10px",
          borderRadius: "0 4px 4px 0",
        }}
      >
        <p style={{ fontSize: "0.8rem", color: "#fef08a", margin: 0 }}>
          {refT.trainingTip}
        </p>
      </div>
    </div>
  );
};
