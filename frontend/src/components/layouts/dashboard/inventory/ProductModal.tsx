import React, { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, AlertTriangle, AlertCircle } from "lucide-react";

interface ProductModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (e: React.FormEvent<HTMLFormElement>) => void;
    editingProduct?: any;
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
}

export const ProductModal = ({ open, onOpenChange, onSave, editingProduct }: ProductModalProps) => {
    const [errors, setErrors] = useState<ProductFormErrors>({});

    useEffect(() => {
        if (open) setErrors({});
    }, [open]);

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

        if (name !== "requiredMinTemp" && name !== "requiredMaxTemp") {
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
                        <Dialog.Close asChild><button className="btn-close"><X size={24} /></button></Dialog.Close>
                    </div>

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
                                <label>URL Zdjęcia</label>
                                <input name="photoUrl" defaultValue={editingProduct?.photoUrl} placeholder="http://..." onChange={handleChange} />
                            </div>
                            <div className="input-group">
                                <label>Waga [kg]</label>
                                <input type="number" step="0.01" name="weightKg" defaultValue={editingProduct?.weight} required onChange={handleChange} />
                                <ErrorMsg field="weightKg" />
                            </div>
                        </div>

                        <div className="input-row">
                            <div className="input-group">
                                <label>Wymagania temp. [°C]</label>
                                <div className="multi-input" style={{ display: 'flex', gap: '8px' }}>
                                    <input type="number" step="0.1" name="requiredMinTemp" defaultValue={editingProduct?.requiredMinTemp} placeholder="Min" required onChange={handleChange} />
                                    <input type="number" step="0.1" name="requiredMaxTemp" defaultValue={editingProduct?.requiredMaxTemp} placeholder="Max" required onChange={handleChange} />
                                </div>
                                <ErrorMsg field="tempRange" />
                            </div>
                            <div className="input-group">
                                <label>Wymiary [mm]</label>
                                <div className="multi-input" style={{ display: 'flex', gap: '4px' }}>
                                    <div style={{flex:1}}>
                                        <input type="number" name="widthMm" defaultValue={editingProduct?.width} placeholder="X" required onChange={handleChange} />
                                        <ErrorMsg field="widthMm" />
                                    </div>
                                    <div style={{flex:1}}>
                                        <input type="number" name="heightMm" defaultValue={editingProduct?.height} placeholder="Y" required onChange={handleChange} />
                                        <ErrorMsg field="heightMm" />
                                    </div>
                                    <div style={{flex:1}}>
                                        <input type="number" name="depthMm" defaultValue={editingProduct?.depth} placeholder="Z" required onChange={handleChange} />
                                        <ErrorMsg field="depthMm" />
                                    </div>
                                </div>
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
                                cursor: Object.values(errors).some(err => err !== "" && err !== undefined) ? 'not-allowed' : 'pointer'
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