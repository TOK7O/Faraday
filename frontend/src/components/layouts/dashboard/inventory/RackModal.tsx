import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { Rack } from "./InventoryContent.types";

interface RackModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingRack: Rack | null;
    onSave: (e: React.FormEvent<HTMLFormElement>) => void;
    invT: any;
}

export const RackModal = ({ open, onOpenChange, editingRack, onSave, invT }: RackModalProps) => (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
            <Dialog.Overlay className="dialog-overlay-ht" />
            <Dialog.Content className="dialog-content-ht">
                <div className="modal-accent-line" />
                <div className="modal-header">
                    <Dialog.Title><h2>{editingRack ? invT.editRack : invT.newRack}</h2></Dialog.Title>
                    <Dialog.Close asChild><button className="btn-close"><X size={24} /></button></Dialog.Close>
                </div>
                <form
                    key={editingRack ? `edit-${editingRack.id}` : "new-rack"}
                    className="ht-form"
                    onSubmit={onSave}
                >
                    <div className="input-row">
                        <div className="input-group">
                            <label>Kod regału (code)</label>
                            <input
                                name="code"
                                defaultValue={editingRack?.id}
                                required
                                disabled={!!editingRack}
                                placeholder="np. R-01"
                            />
                        </div>
                        <div className="input-group">
                            <label>Komentarz (comment)</label>
                            <input name="comment" defaultValue={editingRack?.comment} />
                        </div>
                    </div>

                    {!editingRack && (
                        <div className="input-row">
                            <div className="input-group">
                                <label>Liczba rzędów (rows)</label>
                                <input type="number" name="rows" min="1" max="1000" required />
                            </div>
                            <div className="input-group">
                                <label>Liczba kolumn (columns)</label>
                                <input type="number" name="columns" min="1" max="1000" required />
                            </div>
                        </div>
                    )}

                    <div className="input-row">
                        <div className="input-group">
                            <label>Max Waga [kg] (maxWeightKg)</label>
                            <input type="number" step="0.1" name="maxWeightKg" defaultValue={editingRack?.maxWeight} required />
                        </div>
                        <div className="input-group">
                            <label>Temp Min/Max</label>
                            <div className="multi-input" style={{ display: 'flex', gap: '8px' }}>
                                <input type="number" step="0.1" name="minTemperature" defaultValue={editingRack?.tempMin} placeholder="Min" required />
                                <input type="number" step="0.1" name="maxTemperature" defaultValue={editingRack?.tempMax} placeholder="Max" required />
                            </div>
                        </div>
                    </div>

                    <div className="input-row">
                        <div className="input-group">
                            <label>Wymiary max przedmiotu [mm]</label>
                            <div className="multi-input" style={{ display: 'flex', gap: '4px' }}>
                                <input type="number" name="maxItemWidthMm" defaultValue={editingRack?.maxWidth} placeholder="Szer (W)" required />
                                <input type="number" name="maxItemHeightMm" defaultValue={editingRack?.maxHeight} placeholder="Wys (H)" required />
                                <input type="number" name="maxItemDepthMm" defaultValue={editingRack?.maxDepth} placeholder="Głęb (D)" required />
                            </div>
                        </div>
                    </div>

                    <button type="submit" className="btn-submit-ht">
                        {editingRack ? invT.confirmChanges : invT.addRack}
                    </button>
                </form>
            </Dialog.Content>
        </Dialog.Portal>
    </Dialog.Root>
);