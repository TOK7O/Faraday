import React, { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, AlertTriangle, AlertCircle, FileImage } from "lucide-react";
import "./ProductModal.scss";

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
        if (file) setFileName(file.name);
    };

    const validateField = (name: string, value: string, formData: FormData) => {
        let error = "";
        if ((name === "name" || name === "scanCode") && !value.trim()) error = "To pole jest wymagane";

        if (["weightKg", "widthMm", "heightMm", "depthMm"].includes(name)) {
            const numVal = parseFloat(value);
            if (isNaN(numVal) || numVal <= 0) error = "Wartość musi być większa od 0";

            const w = parseFloat(formData.get("widthMm") as string);
            const h = parseFloat(formData.get("heightMm") as string);
            const d = parseFloat(formData.get("depthMm") as string);
            setErrors(prev => ({ ...prev, dimensions: (isNaN(w) || w <= 0 || isNaN(h) || h <= 0 || isNaN(d) || d <= 0) ? "Wszystkie wymiary muszą być > 0" : "" }));
        }

        if (name === "requiredMinTemp" || name === "requiredMaxTemp") {
            const min = parseFloat(formData.get("requiredMinTemp") as string);
            const max = parseFloat(formData.get("requiredMaxTemp") as string);
            setErrors(prev => ({ ...prev, tempRange: (!isNaN(min) && !isNaN(max) && min > max) ? "Temp. Min > Max" : "" }));
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
        validateField(name, value, new FormData(form));
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!Object.values(errors).some(err => err)) onSave(e);
    };

    const ErrorMsg = ({ field }: { field: keyof ProductFormErrors }) => (
        errors[field] ? (
            <span className="error-text">
                <AlertCircle size={10} /> {errors[field]}
            </span>
        ) : null
    );

    const isInvalid = Object.values(errors).some(err => err);

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay-ht" />
                <Dialog.Content className="dialog-content-ht product-modal">
                    <div className="modal-accent-line secondary" />
                    <div className="modal-header">
                        <Dialog.Title><h2>{editingProduct ? "Edycja asortymentu" : "Definiowanie asortymentu"}</h2></Dialog.Title>
                        <Dialog.Description className="visually-hidden">Formularz produktu</Dialog.Description>
                        <Dialog.Close asChild><button className="btn-close"><X size={24} /></button></Dialog.Close>
                    </div>

                    {hasInventoryItems && editingProduct && (
                        <div className="alert-banner danger">
                            <AlertCircle size={20} />
                            <div className="alert-content">
                                <strong>Edycja ograniczona:</strong> Produkt znajduje się w magazynie. Parametry fizyczne są zablokowane.
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
                                <label>Zdjęcie produktu</label>
                                <div className="file-input-wrapper">
                                    <input type="hidden" name="photoUrl" value={fileName} />
                                    <label className="file-upload-label">
                                        <FileImage size={18} />
                                        <span className="file-name">{fileName || "Wybierz plik..."}</span>
                                        <input type="file" accept="image/*" onChange={handleFileChange} />
                                    </label>
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Waga [kg]</label>
                                <input
                                    type="number" step="0.01" name="weightKg"
                                    className={hasInventoryItems ? "readonly-field" : ""}
                                    defaultValue={editingProduct?.weightKg}
                                    required onChange={handleChange}
                                    readOnly={hasInventoryItems}
                                />
                                <ErrorMsg field="weightKg" />
                            </div>
                        </div>

                        <div className="input-row">
                            <div className="input-group">
                                <label>Wymagania temp. [°C]</label>
                                <div className="multi-input-group">
                                    <input type="number" step="0.1" name="requiredMinTemp" placeholder="Min" required
                                           className={hasInventoryItems ? "readonly-field" : ""}
                                           defaultValue={editingProduct?.requiredMinTemp} readOnly={hasInventoryItems} onChange={handleChange} />
                                    <input type="number" step="0.1" name="requiredMaxTemp" placeholder="Max" required
                                           className={hasInventoryItems ? "readonly-field" : ""}
                                           defaultValue={editingProduct?.requiredMaxTemp} readOnly={hasInventoryItems} onChange={handleChange} />
                                </div>
                                <ErrorMsg field="tempRange" />
                            </div>
                            <div className="input-group">
                                <label>Wymiary [mm]</label>
                                <div className="multi-input-group compact">
                                    <input type="number" name="widthMm" placeholder="Szer." required className={hasInventoryItems ? "readonly-field" : ""}
                                           defaultValue={editingProduct?.widthMm} readOnly={hasInventoryItems} onChange={handleChange} />
                                    <input type="number" name="heightMm" placeholder="Wys." required className={hasInventoryItems ? "readonly-field" : ""}
                                           defaultValue={editingProduct?.heightMm} readOnly={hasInventoryItems} onChange={handleChange} />
                                    <input type="number" name="depthMm" placeholder="Głęb." required className={hasInventoryItems ? "readonly-field" : ""}
                                           defaultValue={editingProduct?.depthMm} readOnly={hasInventoryItems} onChange={handleChange} />
                                </div>
                                <ErrorMsg field="dimensions" />
                            </div>
                        </div>

                        <div className="input-row flex-layout">
                            <div className="input-group flex-2">
                                <label>Komentarz</label>
                                <input name="comment" defaultValue={editingProduct?.comment} onChange={handleChange} />
                            </div>
                            <div className="input-group flex-1">
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

                        <div className="input-row align-end">
                            <div className="input-group">
                                <label>Dni ważności</label>
                                <input type="number" name="validityDays" defaultValue={editingProduct?.validityDays} placeholder="np. 30" onChange={handleChange} />
                                <ErrorMsg field="validityDays" />
                            </div>
                            <div className="adr-checkbox-container">
                                <input
                                    type="checkbox"
                                    id="isHazardous"
                                    name="isHazardous"
                                    defaultChecked={editingProduct?.isHazardous}
                                    className="adr-checkbox-input"
                                />
                                <label htmlFor="isHazardous" className="adr-checkbox-label">
                                    <div className="custom-check">
                                        <AlertTriangle size={12} className="check-icon" />
                                    </div>
                                    <span className="label-text">Klasyfikacja ADR</span>
                                </label>
                            </div>
                        </div>

                        <button type="submit" className="btn-submit-ht secondary" disabled={isInvalid}>
                            {editingProduct ? "Zaktualizuj produkt" : "Zapisz w systemie"}
                        </button>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};