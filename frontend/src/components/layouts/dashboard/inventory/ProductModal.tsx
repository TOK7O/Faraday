import * as Dialog from "@radix-ui/react-dialog";
import { X, ImagePlusIcon, AlertTriangle } from "lucide-react";

interface ProductModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const ProductModal = ({ open, onOpenChange, onSave }: ProductModalProps) => (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
            <Dialog.Overlay className="dialog-overlay-ht" />
            <Dialog.Content className="dialog-content-ht product-modal">
                <div className="modal-accent-line" style={{ background: 'var(--accent-secondary)' }} />
                <div className="modal-header">
                    <Dialog.Title><h2>Definiowanie asortymentu</h2></Dialog.Title>
                    <Dialog.Close asChild><button className="btn-close"><X size={24} /></button></Dialog.Close>
                </div>
                <form className="ht-form" onSubmit={onSave}>
                    <div className="input-row">
                        <div className="input-group">
                            <label>Nazwa (name)</label>
                            <input name="name" maxLength={200} required />
                        </div>
                        <div className="input-group">
                            <label>Kod skanowania (scanCode)</label>
                            <input name="scanCode" maxLength={100} required />
                        </div>
                    </div>

                    <div className="input-row">
                        <div className="input-group">
                            <label>URL Zdjęcia (photoUrl)</label>
                            <input name="photoUrl" placeholder="http://..." maxLength={500} />
                        </div>
                        <div className="input-group">
                            <label>Waga [kg] (weightKg)</label>
                            <input type="number" step="0.01" name="weightKg" required />
                        </div>
                    </div>

                    <div className="input-row">
                        <div className="input-group">
                            <label>Wymagania temp. [°C]</label>
                            <div className="multi-input" style={{ display: 'flex', gap: '8px' }}>
                                <input type="number" step="0.1" name="requiredMinTemp" placeholder="Min" required />
                                <input type="number" step="0.1" name="requiredMaxTemp" placeholder="Max" required />
                            </div>
                        </div>
                        <div className="input-group">
                            <label>Wymiary [mm]</label>
                            <div className="multi-input" style={{ display: 'flex', gap: '4px' }}>
                                <input type="number" name="widthMm" placeholder="X" required />
                                <input type="number" name="heightMm" placeholder="Y" required />
                                <input type="number" name="depthMm" placeholder="Z" required />
                            </div>
                        </div>
                    </div>

                    <div className="input-row">
                        <div className="input-group" style={{ flex: 2 }}>
                            <label>Komentarz (comment)</label>
                            <input name="comment" maxLength={1000} />
                        </div>
                        <div className="input-group" style={{ flex: 1 }}>
                            <label>Klasyfikacja ADR</label>
                            <select name="hazardClassification" className="ht-select">
                                <option value="0">Brak (None)</option>
                                <option value="1">Klasa 1 (Explosive)</option>
                                <option value="2">Klasa 2 (Gas)</option>
                                <option value="4">Klasa 3 (Flammable)</option>
                                <option value="8">Klasa 4 (Solid)</option>
                                <option value="16">Klasa 5 (Oxidizing)</option>
                                <option value="32">Klasa 6 (Toxic)</option>
                                <option value="64">Klasa 7 (Radioactive)</option>
                                <option value="128">Klasa 8 (Corrosive)</option>
                            </select>
                        </div>
                    </div>

                    <div className="input-row">
                        <div className="input-group">
                            <label>Dni ważności (validityDays)</label>
                            <input type="number" name="validityDays" placeholder="np. 30" />
                        </div>
                        <div className="checkbox-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '25px' }}>
                            <input type="checkbox" id="isHazardous" name="isHazardous" className="ht-checkbox" />
                            <label htmlFor="isHazardous" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                <AlertTriangle size={16} color="#ffa500" /> ADR?
                            </label>
                        </div>
                    </div>

                    <button type="submit" className="btn-submit-ht" style={{ background: 'var(--accent-secondary)' }}>
                        Zapisz w systemie
                    </button>
                </form>
            </Dialog.Content>
        </Dialog.Portal>
    </Dialog.Root>
);