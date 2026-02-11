import React, { useState, useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, AlertCircle } from "lucide-react";
import type { Rack } from "../InventoryContent.types.ts";
import { useTranslation } from "@/context/LanguageContext";

interface RackModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingRack: Rack | null;
    onSave: (e: React.FormEvent<HTMLFormElement>) => void;
    existingRacks: Rack[];
    hasItems?: boolean;
}

interface FormErrors {
    code?: string;
    rows?: string;
    columns?: string;
    maxWeightKg?: string;
    maxItemWidthMm?: string;
    maxItemHeightMm?: string;
    maxItemDepthMm?: string;
    tempRange?: string;
}

export const RackModal = ({ open, onOpenChange, editingRack, onSave, existingRacks, hasItems }: RackModalProps) => {
    const { t } = useTranslation();
    const invT = t.dashboardPage.content.inventory.modals.rack;

    const labels = {
        width: "Szer.",
        height: "Wys.",
        depth: "Głęb."
    };

    const [errors, setErrors] = useState<FormErrors>({});
    const [codeValue, setCodeValue] = useState("");
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (open) {
            setErrors({});
            if (editingRack) {
                setCodeValue(editingRack.code);
            } else {
                setCodeValue(getNextAvailableCode(existingRacks));
            }
        }
    }, [open, editingRack, existingRacks]);

    const getNextAvailableCode = (racks: Rack[]) => {
        const existingNumbers = racks
            .map(r => {
                const match = r.code.match(/\d+/);
                return match ? parseInt(match[0], 10) : null;
            })
            .filter((n): n is number => n !== null)
            .sort((a, b) => a - b);

        let nextNum = 1;
        for (const num of existingNumbers) {
            if (num === nextNum) nextNum++;
            else if (num > nextNum) break;
        }
        return `R-${nextNum.toString().padStart(2, '0')}`;
    };

    const runValidation = () => {
        if (!formRef.current) return;
        const formData = new FormData(formRef.current);
        const newErrors: FormErrors = {};

        const code = (formData.get("code")?.toString() || codeValue).toUpperCase();

        if (!code) {
            newErrors.code = invT.errors.required;
        } else if (!editingRack && existingRacks.some(r => r.code.toUpperCase() === code)) {
            newErrors.code = invT.errors.codeInUse.replace("{code}", code);
        }

        const validatePositive = (name: string, label: string, key: keyof FormErrors) => {
            const val = parseFloat(formData.get(name)?.toString() || "");
            if (formData.has(name)) {
                if (isNaN(val)) newErrors[key] = invT.errors.number;
                else if (val <= 0) newErrors[key] = invT.errors.gt0.replace("{label}", label);
            }
        };

        validatePositive("rows", invT.rows, "rows");
        validatePositive("columns", invT.cols, "columns");
        validatePositive("maxWeightKg", invT.capacity, "maxWeightKg");
        validatePositive("maxItemWidthMm", labels.width, "maxItemWidthMm");
        validatePositive("maxItemHeightMm", labels.height, "maxItemHeightMm");
        validatePositive("maxItemDepthMm", labels.depth, "maxItemDepthMm");

        const minT = formData.get("minTemperature");
        const maxT = formData.get("maxTemperature");
        if (minT && maxT) {
            const minNum = parseFloat(minT.toString());
            const maxNum = parseFloat(maxT.toString());
            if (minNum > maxNum) {
                newErrors.tempRange = invT.errors.tempRange.replace("{min}", minNum.toString()).replace("{max}", maxNum.toString());
            }
        }

        setErrors(newErrors);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === "code") setCodeValue(value.toUpperCase());

        setTimeout(runValidation, 0);
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        runValidation();
        if (Object.keys(errors).length === 0) {
            onSave(e);
        }
    };

    const ErrorLabel = ({ field }: { field: keyof FormErrors }) => (
        errors[field] ? (
            <span className="error-message" style={{
                color: '#ff4d4d',
                fontSize: '0.65rem',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                marginTop: '2px',
                fontWeight: 600
            }}>
                <AlertCircle size={10} /> {errors[field]}
            </span>
        ) : null
    );

    const hasErrors = Object.keys(errors).length > 0;

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay-ht" />
                <Dialog.Content className="dialog-content-ht">
                    <div className="modal-accent-line" />
                    <div className="modal-header">
                        <Dialog.Title><h2>{editingRack ? invT.titleEdit : invT.titleNew}</h2></Dialog.Title>
                        <Dialog.Description className="visually-hidden">
                            {invT.description}
                        </Dialog.Description>
                        <Dialog.Close asChild><button className="btn-close"><X size={24} /></button></Dialog.Close>
                    </div>

                    {hasItems && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '6px',
                            padding: '10px',
                            marginBottom: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            <AlertCircle size={20} color="#ef4444" />
                            <div style={{ fontSize: '0.85rem', color: '#ffaaaa' }}>
                                <strong>{invT.editLimited.split(':')[0]}:</strong> {invT.editLimited.split(':')[1]}
                            </div>
                        </div>
                    )}

                    <form className="ht-form" ref={formRef} onSubmit={handleSubmit}>
                        <div className="input-row">
                            <div className="input-group">
                                <label>{invT.code}</label>
                                <input
                                    name="code"
                                    value={codeValue}
                                    onChange={handleInputChange}
                                    required
                                    readOnly={!!editingRack}
                                    style={{
                                        cursor: editingRack ? 'not-allowed' : 'text',
                                        opacity: editingRack ? 0.7 : 1
                                    }}
                                    placeholder="R-00"
                                />
                                <ErrorLabel field="code" />
                            </div>
                            <div className="input-group">
                                <label>{invT.comment}</label>
                                <input
                                    name="comment"
                                    defaultValue={editingRack?.comment}
                                    onChange={handleInputChange}
                                    placeholder={invT.comment}
                                />
                            </div>
                        </div>

                        {!editingRack && (
                            <div className="input-row">
                                <div className="input-group">
                                    <label>{invT.rows}</label>
                                    <input type="number" name="rows" onChange={handleInputChange} required />
                                    <ErrorLabel field="rows" />
                                </div>
                                <div className="input-group">
                                    <label>{invT.cols}</label>
                                    <input type="number" name="columns" onChange={handleInputChange} required />
                                    <ErrorLabel field="columns" />
                                </div>
                            </div>
                        )}

                        <div className="input-row">
                            <div className="input-group">
                                <label>{invT.capacity}</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    name="maxWeightKg"
                                    onChange={handleInputChange}
                                    defaultValue={editingRack?.maxWeight ?? ""}
                                    required
                                    readOnly={hasItems}
                                    style={{ opacity: hasItems ? 0.6 : 1, cursor: hasItems ? 'not-allowed' : 'text' }}
                                />
                                <ErrorLabel field="maxWeightKg" />
                            </div>
                            <div className="input-group">
                                <label>{invT.environment} <ErrorLabel field="tempRange" /></label>
                                <div className="multi-input" style={{ display: 'flex', gap: '8px' }}>
                                    <input type="number" step="0.1" name="minTemperature" onChange={handleInputChange} defaultValue={editingRack?.tempMin ?? ""} placeholder="Min" required
                                        readOnly={hasItems} style={{ opacity: hasItems ? 0.6 : 1, cursor: hasItems ? 'not-allowed' : 'text' }}
                                    />
                                    <input type="number" step="0.1" name="maxTemperature" onChange={handleInputChange} defaultValue={editingRack?.tempMax ?? ""} placeholder="Max" required
                                        readOnly={hasItems} style={{ opacity: hasItems ? 0.6 : 1, cursor: hasItems ? 'not-allowed' : 'text' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="input-group">
                            <label>{invT.maxDims}</label>
                            <div className="multi-input" style={{ display: 'flex', gap: '8px' }}>
                                <div style={{ flex: 1 }}>
                                    <input
                                        type="number"
                                        name="maxItemWidthMm"
                                        onChange={handleInputChange}
                                        defaultValue={editingRack?.maxWidth ?? ""}
                                        placeholder={labels.width}
                                        required
                                        readOnly={hasItems} style={{ opacity: hasItems ? 0.6 : 1, cursor: hasItems ? 'not-allowed' : 'text' }}
                                    />
                                    <ErrorLabel field="maxItemWidthMm" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <input
                                        type="number"
                                        name="maxItemHeightMm"
                                        onChange={handleInputChange}
                                        defaultValue={editingRack?.maxHeight ?? ""}
                                        placeholder={labels.height}
                                        required
                                        readOnly={hasItems} style={{ opacity: hasItems ? 0.6 : 1, cursor: hasItems ? 'not-allowed' : 'text' }}
                                    />
                                    <ErrorLabel field="maxItemHeightMm" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <input
                                        type="number"
                                        name="maxItemDepthMm"
                                        onChange={handleInputChange}
                                        defaultValue={editingRack?.maxDepth ?? ""}
                                        placeholder={labels.depth}
                                        required
                                        readOnly={hasItems} style={{ opacity: hasItems ? 0.6 : 1, cursor: hasItems ? 'not-allowed' : 'text' }}
                                    />
                                    <ErrorLabel field="maxItemDepthMm" />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn-submit-ht"
                            disabled={hasErrors}
                            style={{
                                marginTop: '1.5rem',
                                transition: 'all 0.3s ease',
                                filter: hasErrors ? 'grayscale(1) opacity(0.5)' : 'none',
                                cursor: hasErrors ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {editingRack ? invT.submitEdit : invT.submitNew}
                        </button>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};