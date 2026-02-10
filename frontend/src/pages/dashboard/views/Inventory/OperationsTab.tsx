import React from "react";
import {
    PackagePlus, Camera, CheckCircle2, AlertTriangle,
    Move, PackageMinus
} from "lucide-react";
import type { FullInventoryItem } from "./InventoryContent.types";

interface OperationsTabProps {
    // Przyjęcia
    inboundBarcode: string;
    setInboundBarcode: (val: string) => void;
    handleInbound: (e: React.FormEvent) => void;
    inboundResult: any;

    // Przesunięcia
    moveBarcode: string;
    setMoveBarcode: (val: string) => void;
    moveResult: any;
    setMoveResult: (val: any) => void;
    inventoryData: FullInventoryItem[];
    setMovingItem: (item: FullInventoryItem) => void;
    setIsMoveModalOpen: (open: boolean) => void;

    // Wydania
    outboundBarcode: string;
    setOutboundBarcode: (val: string) => void;
    handleOutbound: (e: React.FormEvent) => void;
    outboundResult: any;

    // Wspólne (Skaner i błędy)
    setScannerMode: (mode: 'inbound' | 'outbound' | 'move') => void;
    setIsScannerOpen: (open: boolean) => void;
    prettifyBackendError: (msg: string) => React.ReactNode;
}

export const OperationsTab = ({
                                  inboundBarcode, setInboundBarcode, handleInbound, inboundResult,
                                  moveBarcode, setMoveBarcode, moveResult, setMoveResult, inventoryData, setMovingItem, setIsMoveModalOpen,
                                  outboundBarcode, setOutboundBarcode, handleOutbound, outboundResult,
                                  setScannerMode, setIsScannerOpen, prettifyBackendError
                              }: OperationsTabProps) => {

    const handleMoveTrigger = () => {
        const item = inventoryData.find(i => i.barcode === moveBarcode);
        if (item) {
            setMovingItem(item);
            setIsMoveModalOpen(true);
            setMoveBarcode("");
        } else {
            setMoveResult({ success: false, message: "Nie znaleziono produktu." });
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', padding: '1rem' }}>
            {/* Przyjęcia */}
            <div className="glass-card operation-card">
                <div className="card-header-ht">
                    <h2 className="operation-title">
                        <PackagePlus size={20} color="var(--accent-primary)" /> Przyjęcia
                    </h2>
                    <p className="operation-desc">Automatyczna alokacja miejsca.</p>
                </div>

                <form onSubmit={handleInbound} className="ht-form">
                    <div className="input-group">
                        <div className="input-with-action">
                            <input
                                value={inboundBarcode}
                                onChange={(e) => setInboundBarcode(e.target.value)}
                                placeholder="Kod produktu..."
                            />
                            <button type="button" onClick={() => { setScannerMode('inbound'); setIsScannerOpen(true); }} className="btn-icon-ht">
                                <Camera size={18} />
                            </button>
                        </div>
                    </div>
                    <button type="submit" className="btn-primary-ht full-width">Przyjmij towar</button>
                </form>

                {inboundResult && (
                    <div className={`operation-result-mini ${inboundResult.success ? 'success' : 'error'}`}>
                        <div className="result-header">
                            {inboundResult.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                            <span>{inboundResult.success ? "Przyjęto" : "Błąd"}</span>
                        </div>
                        {inboundResult.success ? (
                            <div className="result-details">
                                <strong>{inboundResult.rackCode} [{inboundResult.slotX}, {inboundResult.slotY}]</strong>
                            </div>
                        ) : (
                            <div className="result-error-msg">{prettifyBackendError(inboundResult.message)}</div>
                        )}
                    </div>
                )}
            </div>

            {/* Przesunięcia */}
            <div className="glass-card operation-card">
                <div className="card-header-ht">
                    <h2 className="operation-title">
                        <Move size={20} color="var(--accent-primary)" /> Przesunięcia
                    </h2>
                    <p className="operation-desc">Relokacja między regałami.</p>
                </div>

                <div className="ht-form">
                    <div className="input-group">
                        <div className="input-with-action">
                            <input
                                type="text"
                                placeholder="Kod produktu..."
                                value={moveBarcode}
                                onChange={(e) => setMoveBarcode(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleMoveTrigger()}
                            />
                            <button type="button" onClick={() => { setScannerMode('move'); setIsScannerOpen(true); }} className="btn-icon-ht">
                                <Camera size={18} />
                            </button>
                        </div>
                    </div>
                    <button type="button" onClick={handleMoveTrigger} className="btn-primary-ht full-width">Inicjuj przesunięcie</button>
                </div>

                {moveResult && (
                    <div className={`operation-result-mini ${moveResult.success ? 'success' : 'error'}`}>
                        <div className="result-header">
                            {moveResult.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                            <span>{moveResult.success ? "Przesunięto" : "Błąd"}</span>
                        </div>
                        {moveResult.success ? (
                            <div className="result-details">
                                {moveResult.productName}<br />
                                <span>→ {moveResult.rackCode} [{moveResult.slotX}, {moveResult.slotY}]</span>
                            </div>
                        ) : (
                            <div className="result-error-msg">{moveResult.message}</div>
                        )}
                    </div>
                )}
            </div>

            {/* Wydania */}
            <div className="glass-card operation-card danger-border">
                <div className="card-header-ht">
                    <h2 className="operation-title danger-text">
                        <PackageMinus size={20} /> Wydania
                    </h2>
                    <p className="operation-desc">Wydanie towaru zgodnie z FIFO.</p>
                </div>

                <form onSubmit={handleOutbound} className="ht-form">
                    <div className="input-group">
                        <div className="input-with-action">
                            <input
                                value={outboundBarcode}
                                onChange={(e) => setOutboundBarcode(e.target.value)}
                                placeholder="Kod produktu..."
                            />
                            <button type="button" onClick={() => { setScannerMode('outbound'); setIsScannerOpen(true); }} className="btn-icon-ht">
                                <Camera size={18} />
                            </button>
                        </div>
                    </div>
                    <button type="submit" className="btn-primary-ht full-width danger-bg">Wydaj towar</button>
                </form>

                {outboundResult && (
                    <div className={`operation-result-mini ${outboundResult.success ? 'success' : 'error'}`}>
                        <div className="result-header">
                            {outboundResult.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                            <span>{outboundResult.success ? "Wydano" : "Błąd"}</span>
                        </div>
                        <div className="result-details">
                            {outboundResult.success ? "Produkt opuścił magazyn." : outboundResult.message}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};