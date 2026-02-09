import React, { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, AlertTriangle, AlertCircle, FileImage } from "lucide-react";

interface ProductModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (e: React.FormEvent<HTMLFormElement>) => void;
    editingProduct?: any;
    hasInventoryItems?: boolean;
}

interface ProductFormErrors {
    name?: string;
    scanCode?: string;
    weightKg?: string;
    widthMm?: string;
    heightMm?: string;
    depthMm?: string;
    tempRange?: string;
    validityDays?: string;
    dimensions?: string;
}

export const ProductModal = ({ open, onOpenChange, onSave, editingProduct, hasInventoryItems = false }: ProductModalProps) => {
    const [errors, setErrors] = useState<ProductFormErrors>({});
    const [fileName, setFileName] = useState<string>(editingProduct?.photoUrl || "");

    useEffect(() => {
        if (open) {
            setErrors({});
            setFileName(editingProduct?.photoUrl || "");
        }
    }, [open, editingProduct]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFileName(file.name);
        }
    };

    const validateField = (name: string, value: string, formData: FormData) => {
        let error = "";

        if ((name === "name" || name === "scanCode") && !value.trim()) {
            error = "To pole jest wymagane";
        }

        if (["weightKg", "widthMm", "heightMm", "depthMm"].includes(name)) {
            const numVal = parseFloat(value);
            if (isNaN(numVal) || numVal <= 0) {
                error = "Wartość musi być większa od 0";
            }
            if (["widthMm", "heightMm", "depthMm"].includes(name)) {
                const width = parseFloat(formData.get("widthMm") as string);
                const height = parseFloat(formData.get("heightMm") as string);
                const depth = parseFloat(formData.get("depthMm") as string);

                if (isNaN(width) || width <= 0 || isNaN(height) || height <= 0 || isNaN(depth) || depth <= 0) {
                    setErrors(prev => ({ ...prev, dimensions: "Wszystkie wymiary muszą być > 0" }));
                } else {
                    setErrors(prev => ({ ...prev, dimensions: "" }));
                }
            }
        }

        if (name === "requiredMinTemp" || name === "requiredMaxTemp") {
            const min = parseFloat(formData.get("requiredMinTemp") as string);
            const max = parseFloat(formData.get("requiredMaxTemp") as string);

            if (!isNaN(min) && !isNaN(max) && min > max) {
                setErrors(prev => ({ ...prev, tempRange: "Temp. Min nie może być wyższa niż Max" }));
            } else {
                setErrors(prev => ({ ...prev, tempRange: "" }));
            }
        }

        if (name === "validityDays" && value) {
            const days = parseInt(value);
            if (isNaN(days) || days <= 0) error = "Musi być > 0";
        }
        if (!["widthMm", "heightMm", "depthMm", "requiredMinTemp", "requiredMaxTemp"].includes(name)) {
            setErrors(prev => ({ ...prev, [name]: error }));
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, form } = e.target;
        if (!form) return;
        const formData = new FormData(form);
        validateField(name, value, formData);
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const hasErrors = Object.values(errors).some(err => err !== "" && err !== undefined);
        if (!hasErrors) {
            onSave(e);
        }
    };

    const ErrorMsg = ({ field }: { field: keyof ProductFormErrors }) => (
        errors[field] ? (
            <span className="error-text" style={{ color: '#ff4d4d', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '3px' }}>
                <AlertCircle size={10} /> {errors[field]}
            </span>
        ) : null
    );

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay-ht" />
                <Dialog.Content className="dialog-content-ht product-modal">
                    <div className="modal-accent-line" style={{ background: 'var(--accent-secondary)' }} />
                    <div className="modal-header">
                        <Dialog.Title><h2>{editingProduct ? "Edycja asortymentu" : "Definiowanie asortymentu"}</h2></Dialog.Title>
                        <Dialog.Description className="visually-hidden">
                            Formularz do {editingProduct ? "edycji" : "tworzenia"} produktu.
                        </Dialog.Description>
                        <Dialog.Close asChild><button className="btn-close"><X size={24} /></button></Dialog.Close>
                    </div>

                    {hasInventoryItems && editingProduct && (
                        <div style={{
                            padding: '12px 20px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '6px',
                            margin: '0 20px 16px 20px',
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start'
                        }}>
                            <AlertCircle size={20} color="#ef4444" />
                            <div style={{ fontSize: '0.85rem', color: '#ffaaaa' }}>
                                <strong>Edycja ograniczona:</strong> Produkt ma asortyment w magazynie. Zmiana parametrów fizycznych (temperatura, wymiary, waga) jest zablokowana.
                            </div>
                        </div>
                    )}

                    <form className="ht-form" onSubmit={handleSubmit}>
                        <div className="input-row">
                            <div className="input-group">
                                <label>Nazwa</label>
                                <input name="name" defaultValue={editingProduct?.name} required onChange={handleChange} />
                                <ErrorMsg field="name" />
                            </div>
                            <div className="input-group">
                                <label>Kod kreskowy (EAN/QR)</label>
                                <input name="scanCode" defaultValue={editingProduct?.scanCode} required onChange={handleChange} />
                                <ErrorMsg field="scanCode" />
                            </div>
                        </div>

                        <div className="input-row">
                            <div className="input-group">
                                <label>Zdjęcie produktu (tylko nazwa pliku)</label>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input
                                        type="hidden"
                                        name="photoUrl"
                                        value={fileName}
                                    />
                                    <label className="file-upload-label" style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        overflow: 'hidden'
                                    }}>
                                        <FileImage size={18} />
                                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {fileName || "Wybierz plik..."}
                                        </span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                            onChange={handleFileChange}
                                        />
                                    </label>
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Waga [kg]</label>
                                <input type="number" step="0.01" name="weightKg" defaultValue={editingProduct?.weightKg} required onChange={handleChange}
                                    readOnly={hasInventoryItems} style={{ opacity: hasInventoryItems ? 0.6 : 1, cursor: hasInventoryItems ? 'not-allowed' : 'text' }}
                                />
                                <ErrorMsg field="weightKg" />
                            </div>
                        </div>

                        <div className="input-row">
                            <div className="input-group">
                                <label>Wymagania temp. [°C]</label>
                                <div className="multi-input" style={{ display: 'flex', gap: '8px' }}>
                                    <input type="number" step="0.1" name="requiredMinTemp" defaultValue={editingProduct?.requiredMinTemp} placeholder="Min" required onChange={handleChange}
                                        readOnly={hasInventoryItems} style={{ opacity: hasInventoryItems ? 0.6 : 1, cursor: hasInventoryItems ? 'not-allowed' : 'text' }}
                                    />
                                    <input type="number" step="0.1" name="requiredMaxTemp" defaultValue={editingProduct?.requiredMaxTemp} placeholder="Max" required onChange={handleChange}
                                        readOnly={hasInventoryItems} style={{ opacity: hasInventoryItems ? 0.6 : 1, cursor: hasInventoryItems ? 'not-allowed' : 'text' }}
                                    />
                                </div>
                                <ErrorMsg field="tempRange" />
                            </div>
                            <div className="input-group">
                                <label>Wymiary [mm]</label>
                                <div className="multi-input" style={{ display: 'flex', gap: '4px' }}>
                                    <input type="number" step="1" name="widthMm" defaultValue={editingProduct?.widthMm} placeholder="Szer." required onChange={handleChange}
                                        readOnly={hasInventoryItems} style={{ opacity: hasInventoryItems ? 0.6 : 1, cursor: hasInventoryItems ? 'not-allowed' : 'text' }}
                                    />
                                    <input type="number" step="1" name="heightMm" defaultValue={editingProduct?.heightMm} placeholder="Wys." required onChange={handleChange}
                                        readOnly={hasInventoryItems} style={{ opacity: hasInventoryItems ? 0.6 : 1, cursor: hasInventoryItems ? 'not-allowed' : 'text' }}
                                    />
                                    <input type="number" step="1" name="depthMm" defaultValue={editingProduct?.depthMm} placeholder="Głęb." required onChange={handleChange}
                                        readOnly={hasInventoryItems} style={{ opacity: hasInventoryItems ? 0.6 : 1, cursor: hasInventoryItems ? 'not-allowed' : 'text' }}
                                    />
                                </div>
                                <ErrorMsg field="dimensions" />
                            </div>
                        </div>

                        <div className="input-row">
                            <div className="input-group" style={{ flex: 2 }}>
                                <label>Komentarz</label>
                                <input name="comment" defaultValue={editingProduct?.comment} onChange={handleChange} />
                            </div>
                            <div className="input-group" style={{ flex: 1 }}>
                                <label>Klasyfikacja ADR</label>
                                <select name="hazardClassification" className="ht-select" defaultValue={editingProduct?.hazardClassification || "0"} onChange={handleChange}>
                                    <option value="0">Brak</option>
                                    <option value="1">Klasa 1 (Wybuchowe)</option>
                                    <option value="2">Klasa 2 (Gazy)</option>
                                    <option value="4">Klasa 3 (Zapalne)</option>
                                    <option value="32">Klasa 6 (Toksyczne)</option>
                                    <option value="128">Klasa 8 (Żrące)</option>
                                </select>
                            </div>
                        </div>

                        <div className="input-row">
                            <div className="input-group">
                                <label>Dni ważności</label>
                                <input type="number" name="validityDays" defaultValue={editingProduct?.validityDays} placeholder="np. 30" onChange={handleChange} />
                                <ErrorMsg field="validityDays" />
                            </div>
                            <div className="checkbox-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '25px' }}>
                                <input type="checkbox" id="isHazardous" name="isHazardous" defaultChecked={editingProduct?.isHazardous} className="ht-checkbox" />
                                <label htmlFor="isHazardous" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                    <AlertTriangle size={16} color="#ffa500" /> ADR?
                                </label>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn-submit-ht"
                            disabled={Object.values(errors).some(err => err !== "" && err !== undefined)}
                            style={{
                                background: 'var(--accent-secondary)',
                                opacity: Object.values(errors).some(err => err !== "" && err !== undefined) ? 0.5 : 1,
                                cursor: Object.values(errors).some(err => err !== "" && err !== undefined) ? 'not-allowed' : 'pointer',
                                marginTop: '10px'
                            }}
                        >
                            {editingProduct ? "Zaktualizuj produkt" : "Zapisz w systemie"}
                        </button>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};