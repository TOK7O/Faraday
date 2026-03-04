import React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { BrainCircuit, Camera, Upload, Database, Search } from "lucide-react";
import type { Product } from "@/components/layouts/dashboard/inventory/InventoryContent.types";
import { ReferenceImageManager } from "@/components/layouts/dashboard/inventory/modals/ReferenceMediaManager";

interface IdentifyTabProps {
    products: Product[];
    trainingProduct: Product | null;
    setTrainingProduct: (p: Product | null) => void;
    identifiedProduct: any | null;
    setIsAiScannerOpen: (v: boolean) => void;
    aiFileInputRef: React.RefObject<HTMLInputElement | null>;
    invT: any;
}

export const IdentifyTab = ({
    products,
    trainingProduct,
    setTrainingProduct,
    identifiedProduct,
    setIsAiScannerOpen,
    aiFileInputRef,
    invT,
}: IdentifyTabProps) => (
    <Tabs.Content value="identify">
        <div
            style={{
                maxWidth: "1000px",
                margin: "0 auto",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "2rem",
            }}
        >
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "2rem",
                }}
            >
                <div
                    className="glass-card"
                    style={{
                        padding: "2rem",
                        textAlign: "center",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "1.5rem",
                        height: "100%",
                    }}
                >
                    <div
                        style={{
                            background: "rgba(var(--accent-primary-rgb), 0.1)",
                            padding: "1rem",
                            borderRadius: "50%",
                        }}
                    >
                        <BrainCircuit
                            size={48}
                            style={{ color: "var(--accent-primary)" }}
                        />
                    </div>
                    <div>
                        <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
                            {invT.identify.identifyCard.title}
                        </h2>
                        <p className="text-muted">
                            {invT.identify.identifyCard.subtitle}
                        </p>
                    </div>
                    <div
                        style={{
                            display: "flex",
                            gap: "1rem",
                            flexWrap: "wrap",
                            justifyContent: "center",
                        }}
                    >
                        <button
                            className="btn-primary-ht"
                            style={{ padding: "0.8rem 1.5rem" }}
                            onClick={() => setIsAiScannerOpen(true)}
                        >
                            <Camera size={20} />{" "}
                            {invT.identify.identifyCard.cameraBtn}
                        </button>
                        <button
                            className="btn-secondary"
                            style={{
                                padding: "0.8rem 1.5rem",
                                display: "flex",
                                gap: "8px",
                                alignItems: "center",
                            }}
                            onClick={() => aiFileInputRef.current?.click()}
                        >
                            <Upload size={20} />{" "}
                            {invT.identify.identifyCard.uploadBtn}
                        </button>
                    </div>

                    {identifiedProduct && (
                        <div
                            style={{
                                marginTop: "2rem",
                                width: "100%",
                                textAlign: "left",
                                borderTop: "1px solid var(--border-input)",
                                paddingTop: "1rem",
                                animation: "fadeIn 0.3s ease",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: "10px",
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: "0.8rem",
                                        color: "var(--text-muted)",
                                    }}
                                >
                                    {invT.identify.identifyCard.resultHeader}
                                </span>
                                <span
                                    className={`status-badge ${identifiedProduct.confidenceLevel === "Excellent" ? "new" : "conflict"}`}
                                >
                                    {identifiedProduct.confidenceLevel} (
                                    {(identifiedProduct.confidenceScore * 100).toFixed(0)}
                                    %)
                                </span>
                            </div>
                            <h3
                                style={{
                                    fontSize: "1.4rem",
                                    color: "var(--accent-primary)",
                                    margin: "0 0 5px 0",
                                }}
                            >
                                {identifiedProduct.name}
                            </h3>
                            <div
                                style={{
                                    fontFamily: "monospace",
                                    fontSize: "1rem",
                                    background: "rgba(255,255,255,0.05)",
                                    padding: "4px 8px",
                                    borderRadius: "4px",
                                    display: "inline-block",
                                }}
                            >
                                {identifiedProduct.scanCode}
                            </div>
                            <div
                                style={{
                                    marginTop: "1rem",
                                    fontSize: "0.9rem",
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: "10px",
                                }}
                            >
                                <div>
                                    {invT.identify.identifyCard.weightLabel}{" "}
                                    <strong>{identifiedProduct.weightKg} kg</strong>
                                </div>
                                <div>
                                    {invT.identify.identifyCard.hazardousLabel}{" "}
                                    <strong>
                                        {identifiedProduct.isHazardous
                                            ? invT.identify.identifyCard.yes
                                            : invT.identify.identifyCard.no}
                                    </strong>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="glass-card" style={{ padding: "2rem" }}>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        marginBottom: "1.5rem",
                        borderBottom: "1px solid var(--border-input)",
                        paddingBottom: "1rem",
                    }}
                >
                    <div
                        style={{
                            background: "rgba(255, 255, 255, 0.1)",
                            padding: "8px",
                            borderRadius: "8px",
                        }}
                    >
                        <Database size={24} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: "1.3rem", margin: 0 }}>
                            {invT.identify.trainingCard.title}
                        </h2>
                        <p
                            className="text-muted"
                            style={{ fontSize: "0.85rem", margin: 0 }}
                        >
                            {invT.identify.trainingCard.subtitle}
                        </p>
                    </div>
                </div>

                <div className="ht-form">
                    <div className="input-group">
                        <label>{invT.identify.trainingCard.selectLabel}</label>
                        <select
                            className="ht-input"
                            value={trainingProduct?.id || ""}
                            onChange={(e) => {
                                const prod = products.find(
                                    (p) => p.id === Number(e.target.value),
                                );
                                setTrainingProduct(prod || null);
                            }}
                        >
                            <option value="">
                                {invT.identify.trainingCard.chooseProduct}
                            </option>
                            {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name} ({p.scanCode})
                                </option>
                            ))}
                        </select>
                    </div>

                    {trainingProduct ? (
                        <div style={{ animation: "fadeIn 0.3s ease" }}>
                            <div
                                style={{
                                    background: "rgba(var(--accent-primary-rgb), 0.05)",
                                    border:
                                        "1px solid rgba(var(--accent-primary-rgb), 0.2)",
                                    padding: "1rem",
                                    borderRadius: "8px",
                                    marginBottom: "1rem",
                                    marginTop: "1rem",
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: "0.9rem",
                                        color: "var(--accent-primary)",
                                        fontWeight: 600,
                                        marginBottom: "4px",
                                    }}
                                >
                                    {invT.identify.trainingCard.activeContext}
                                </div>
                                <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                                    {trainingProduct.name}
                                </div>
                                <div style={{ fontFamily: "monospace", opacity: 0.8 }}>
                                    {invT.identify.trainingCard.barcodeLabel}{" "}
                                    {trainingProduct.scanCode}
                                </div>
                            </div>

                            <ReferenceImageManager
                                productId={trainingProduct.id}
                                scanCode={trainingProduct.scanCode}
                            />
                        </div>
                    ) : (
                        <div
                            style={{
                                textAlign: "center",
                                padding: "3rem 1rem",
                                color: "var(--text-muted)",
                                border: "2px dashed var(--border-input)",
                                borderRadius: "12px",
                                marginTop: "1rem",
                            }}
                        >
                            <Search
                                size={32}
                                style={{ opacity: 0.3, marginBottom: "1rem" }}
                            />
                            <p>{invT.identify.trainingCard.emptyState}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </Tabs.Content>
);
