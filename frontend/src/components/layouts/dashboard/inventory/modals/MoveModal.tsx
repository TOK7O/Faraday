import React, { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ArrowRight, Move } from "lucide-react";
import type { FullInventoryItem, Rack, Product } from "./InventoryContent.types";

interface MoveModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: FullInventoryItem | null;
    racks: Rack[];
    products: Product[];
    inventory: FullInventoryItem[];
    onMove: (targetRackCode: string, targetSlotX: number, targetSlotY: number) => Promise<void>;
}

export const MoveModal = ({ open, onOpenChange, item, racks, products, inventory, onMove }: MoveModalProps) => {
    const [targetRackCode, setTargetRackCode] = useState("");
    const [targetSlotX, setTargetSlotX] = useState(1);
    const [targetSlotY, setTargetSlotY] = useState(1);

    const selectedRack = racks.find(r => r.code === targetRackCode);

    useEffect(() => {
        if (open && item) {
            setTargetRackCode("");
            setTargetSlotX(1);
            setTargetSlotY(1);
        }
    }, [open, item]);

    const product = item ? products.find(p => p.id === item.productId) : null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onMove(targetRackCode, targetSlotX, targetSlotY);
    };

    const handleSlotSelection = (slotX: number, slotY: number) => {
        if (!item) return;
        const isOccupied = inventory.some(i => i.rackCode === targetRackCode && i.slotX === slotX && i.slotY === slotY);
        if (item.rackCode === targetRackCode && item.slotX === slotX && item.slotY === slotY) return;
        if (isOccupied) return;
        setTargetSlotX(slotX);
        setTargetSlotY(slotY);
    };

    return (
        <Dialog.Root open={open && !!item} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay-ht" />
                <Dialog.Content className="dialog-content-ht">
                    <div className="modal-accent-line" />
                    <div className="modal-header">
                        <Move size={20} className="header-icon" />
                        <Dialog.Title><h2>Przesuń towar</h2></Dialog.Title>
                        <Dialog.Description className="visually-hidden">
                            Formularz relokacji produktu między regałami.
                        </Dialog.Description>
                        <Dialog.Close asChild>
                            <button className="btn-close"><X size={24} /></button>
                        </Dialog.Close>
                    </div>

                    {item && (
                        <form onSubmit={handleSubmit} className="ht-form">
                            <div className="source-info" style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '3px solid var(--accent-primary)' }}>
                                <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}><strong>Towar:</strong> {item.productName}</p>
                                <p style={{ margin: '0.25rem 0', fontSize: '0.8rem', opacity: 0.8 }}><strong>Kod:</strong> {item.barcode}</p>
                                <p style={{ margin: '0.25rem 0', fontSize: '0.8rem', opacity: 0.8 }}><strong>Z:</strong> {item.rackCode} (K-{item.slotX}, R-{item.slotY})</p>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
                                <ArrowRight size={20} style={{ color: 'var(--accent-primary)', opacity: 0.5 }} />
                            </div>

                            <div className="input-group">
                                <label>Regał docelowy</label>
                                <select
                                    value={targetRackCode}
                                    onChange={(e) => {
                                        setTargetRackCode(e.target.value);
                                        setTargetSlotX(1);
                                        setTargetSlotY(1);
                                    }}
                                    className="ht-input"
                                    required
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-input)', borderRadius: '6px', padding: '0.7rem', color: 'white' }}
                                >
                                    <option value="">Wybierz regał...</option>
                                    {racks.map(r => (
                                        <option key={r.id} value={r.code}>{r.code}</option>
                                    ))}
                                </select>
                            </div>

                            {selectedRack && (
                                <div style={{ marginTop: '1rem' }}>
                                    <label style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                                        Wybierz slot:
                                    </label>
                                    <div className="mini-grid" style={{ pointerEvents: 'auto' }}>
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: `repeat(${selectedRack.n}, 1fr)`,
                                            gap: '4px',
                                            padding: '8px',
                                            background: 'rgba(0,0,0,0.2)',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(255,255,255,0.05)'
                                        }}>
                                            {Array.from({ length: selectedRack.m }).map((_, rIndex) => {
                                                const rowNum = selectedRack.m - rIndex;
                                                return Array.from({ length: selectedRack.n }).map((_, cIndex) => {
                                                    const colNum = cIndex + 1;
                                                    const isOccupied = inventory.some(i => i.rackCode === targetRackCode && i.slotX === colNum && i.slotY === rowNum);
                                                    const isCurrent = item?.rackCode === targetRackCode && item.slotX === colNum && item.slotY === rowNum;
                                                    const isTarget = targetSlotX === colNum && targetSlotY === rowNum;

                                                    // Compatibility checks
                                                    const tooTall = product ? product.heightMm > selectedRack.maxHeight : false;
                                                    const tooWide = product ? product.widthMm > selectedRack.maxWidth : false;
                                                    const tooDeep = product ? product.depthMm > selectedRack.maxDepth : false;
                                                    const tooHeavy = item ? item.productWeightKg > selectedRack.maxWeight : false;

                                                    const tempMin = product?.requiredMinTemp ?? -999;
                                                    const tempMax = product?.requiredMaxTemp ?? 999;
                                                    const tempMismatch = (tempMin > selectedRack.tempMax) || (tempMax < selectedRack.tempMin);

                                                    const isIncompatible = tooTall || tooWide || tooDeep || tooHeavy || tempMismatch;

                                                    return (
                                                        <div
                                                            key={`${colNum}-${rowNum}`}
                                                            onClick={() => !isOccupied && !isCurrent && !isIncompatible && handleSlotSelection(colNum, rowNum)}
                                                            style={{
                                                                aspectRatio: '1',
                                                                background: isCurrent ? 'rgba(255,255,255,0.05)' : isTarget ? 'var(--accent-primary)' : isOccupied ? 'rgba(239,68,68,0.2)' : isIncompatible ? 'rgba(255, 77, 77, 0.1)' : 'rgba(255,255,255,0.1)',
                                                                borderRadius: '4px',
                                                                cursor: (isOccupied || isCurrent || isIncompatible) ? 'not-allowed' : 'pointer',
                                                                border: isTarget ? '2px solid white' : isIncompatible ? '1px dashed rgba(255, 77, 77, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                                                                opacity: (isCurrent || isIncompatible) ? 0.4 : 1,
                                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: '0.6rem',
                                                                color: isTarget ? 'black' : isIncompatible ? '#ff4d4d' : 'white'
                                                            }}
                                                            title={isOccupied ? "Zajęte" : isCurrent ? "Obecna lokalizacja" : isIncompatible ? `Niekompatybilne: ${tooHeavy ? 'Zbyt ciężkie' : tempMismatch ? 'Błąd temperatury' : 'Błąd wymiarów'}` : `Wybierz: ${colNum}x${rowNum}`}
                                                        >
                                                            {isTarget && colNum}
                                                            {isIncompatible && !isTarget && !isOccupied && !isCurrent && <X size={10} />}
                                                        </div>
                                                    );
                                                });
                                            })}
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', opacity: 0.8 }}>
                                        <span>Wybrano: <strong>{targetSlotX}x{targetSlotY}</strong></span>
                                        <span style={{ color: 'var(--accent-primary)' }}>Slot wolny</span>
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                className="btn-submit-ht"
                                disabled={!targetRackCode}
                                style={{ marginTop: '1.5rem' }}
                            >
                                Potwierdź przesunięcie
                            </button>
                        </form>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};