import React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import {
    PackagePlus,
    Move,
    PackageMinus,
    Camera,
    CheckCircle2,
    AlertTriangle,
} from "lucide-react";
import type { FullInventoryItem } from "@/components/layouts/dashboard/inventory/InventoryContent.types";

interface OperationsTabProps {
    inboundBarcode: string;
    setInboundBarcode: (v: string) => void;
    inboundResult: any;
    outboundBarcode: string;
    setOutboundBarcode: (v: string) => void;
    outboundResult: any;
    moveBarcode: string;
    setMoveBarcode: (v: string) => void;
    moveResult: any;
    inventoryData: FullInventoryItem[];
    handleInbound: (e?: React.FormEvent) => void;
    handleOutbound: (e?: React.FormEvent) => void;
    setMovingItem: (item: FullInventoryItem | null) => void;
    setIsMoveModalOpen: (v: boolean) => void;
    setMoveResult: never; // not exposed — handled via hook
    setScannerMode: (mode: "inbound" | "outbound" | "move") => void;
    setIsScannerOpen: (v: boolean) => void;
    prettifyBackendError: (msg: string) => React.ReactNode;
    invT: any;
}

export const OperationsTab = ({
    inboundBarcode,
    setInboundBarcode,
    inboundResult,
    outboundBarcode,
    setOutboundBarcode,
    outboundResult,
    moveBarcode,
    setMoveBarcode,
    moveResult,
    inventoryData,
    handleInbound,
    handleOutbound,
    setMovingItem,
    setIsMoveModalOpen,
    setScannerMode,
    setIsScannerOpen,
    prettifyBackendError,
    invT,
}: Omit<OperationsTabProps, "setMoveResult">) => (
    <Tabs.Content value="operations">
        <div className="operations-grid">
            {/* Przyjęcia (Inbound) */}
            <div className="glass-card inbound">
                <div className="card-header">
                    <h2>
                        <PackagePlus size={20} className="icon-accent" />
                        {invT.operations.inbound.title}
                    </h2>
                    <p className="text-muted">
                        {invT.operations.inbound.subtitle}
                    </p>
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleInbound(e);
                    }}
                    className="ht-form"
                >
                    <div className="input-group">
                        <div className="input-wrapper">
                            <input
                                className="operation-barcode-input"
                                value={inboundBarcode}
                                onChange={(e) => setInboundBarcode(e.target.value)}
                                placeholder={invT.operations.inbound.placeholder}
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    setScannerMode("inbound");
                                    setIsScannerOpen(true);
                                }}
                                className="btn-action-ht"
                                title="Scan Barcode"
                            >
                                <Camera size={18} />
                            </button>
                        </div>
                    </div>
                    <button type="submit" className="btn-primary-ht btn-submit">
                        {invT.operations.inbound.submit}
                    </button>
                </form>

                {inboundResult && (
                    <div
                        className={`operation-result-mini ${inboundResult.success ? "success" : "error"}`}
                    >
                        <div className="result-status">
                            {inboundResult.success ? (
                                <CheckCircle2 size={16} />
                            ) : (
                                <AlertTriangle size={16} />
                            )}
                            <span>
                                {inboundResult.success
                                    ? invT.operations.inbound.success
                                    : invT.operations.inbound.error}
                            </span>
                        </div>
                        <div className="result-details">
                            {inboundResult.success ? (
                                <span className="location-badge">
                                    {inboundResult.rackCode} [{inboundResult.slotX},{" "}
                                    {inboundResult.slotY}]
                                </span>
                            ) : (
                                <span className="error-text">
                                    {prettifyBackendError(inboundResult.message)}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="glass-card move">
                <div className="card-header">
                    <h2>
                        <Move size={20} className="icon-accent" />
                        {invT.operations.move.title}
                    </h2>
                    <p className="text-muted">{invT.operations.move.subtitle}</p>
                </div>

                <div className="ht-form">
                    <div className="input-group">
                        <div className="input-wrapper">
                            <input
                                className="operation-barcode-input"
                                type="text"
                                placeholder={invT.operations.move.placeholder}
                                value={moveBarcode}
                                onChange={(e) => setMoveBarcode(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        const item = inventoryData.find(
                                            (i) => i.barcode === moveBarcode,
                                        );
                                        if (item) {
                                            setMovingItem(item);
                                            setIsMoveModalOpen(true);
                                            setMoveBarcode("");
                                        }
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    setScannerMode("move");
                                    setIsScannerOpen(true);
                                }}
                                className="btn-action-ht"
                            >
                                <Camera size={18} />
                            </button>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="btn-primary-ht btn-submit"
                        onClick={() => {
                            const item = inventoryData.find(
                                (i) => i.barcode === moveBarcode,
                            );
                            if (item) {
                                setMovingItem(item);
                                setIsMoveModalOpen(true);
                                setMoveBarcode("");
                            }
                        }}
                    >
                        {invT.operations.move.submit}
                    </button>
                </div>

                {moveResult && (
                    <div
                        className={`operation-result-mini ${moveResult.success ? "success" : "error"}`}
                    >
                        <div className="result-status">
                            {moveResult.success ? (
                                <CheckCircle2 size={16} />
                            ) : (
                                <AlertTriangle size={16} />
                            )}
                            <span>
                                {moveResult.success
                                    ? invT.operations.move.success
                                    : invT.operations.move.error}
                            </span>
                        </div>
                        <div className="result-details">
                            {moveResult.success ? (
                                <>
                                    <span className="location-badge">
                                        → {moveResult.rackCode} [{moveResult.slotX},{" "}
                                        {moveResult.slotY}]
                                    </span>
                                </>
                            ) : (
                                <span className="error-text">{moveResult.message}</span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="glass-card outbound">
                <div className="card-header">
                    <h2>
                        <PackageMinus size={20} className="icon-error" />
                        {invT.operations.outbound.title}
                    </h2>
                    <p className="text-muted">
                        {invT.operations.outbound.subtitle}
                    </p>
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleOutbound(e);
                    }}
                    className="ht-form"
                >
                    <div className="input-group">
                        <div className="input-wrapper">
                            <input
                                className="operation-barcode-input"
                                value={outboundBarcode}
                                onChange={(e) => setOutboundBarcode(e.target.value)}
                                placeholder={invT.operations.outbound.placeholder}
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    setScannerMode("outbound");
                                    setIsScannerOpen(true);
                                }}
                                className="btn-action-ht"
                            >
                                <Camera size={18} />
                            </button>
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="btn-primary-ht btn-submit btn-danger"
                    >
                        {invT.operations.outbound.submit}
                    </button>
                </form>

                {outboundResult && (
                    <div
                        className={`operation-result-mini ${outboundResult.success ? "success" : "error"}`}
                    >
                        <div className="result-status">
                            {outboundResult.success ? (
                                <CheckCircle2 size={16} />
                            ) : (
                                <AlertTriangle size={16} />
                            )}
                            <span>
                                {outboundResult.success
                                    ? invT.operations.outbound.success
                                    : invT.operations.outbound.error}
                            </span>
                        </div>
                        <div className="result-details">
                            {outboundResult.success
                                ? invT.operations.outbound.details
                                : outboundResult.message}
                        </div>
                    </div>
                )}
            </div>
        </div>
    </Tabs.Content>
);
