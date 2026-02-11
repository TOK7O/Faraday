import * as Dialog from "@radix-ui/react-dialog";
import { X, Save, AlertTriangle } from "lucide-react";
import type { Product } from "@/components/layouts/dashboard/inventory/InventoryContent.types";
import { ReferenceImageManager } from "./ReferenceMediaManager.tsx";

interface ProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (e: React.FormEvent<HTMLFormElement>) => void;
  editingProduct: Product | null;
  hasInventoryItems: boolean;
}

export const ProductModal = ({
                               open,
                               onOpenChange,
                               onSave,
                               editingProduct,
                               hasInventoryItems,
                             }: ProductModalProps) => {
  return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay-ht" />
          <Dialog.Content className="dialog-content-ht">
            <div className="modal-header">
              <Dialog.Title>
                {editingProduct ? "Edit Product" : "New Product Definition"}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="close-btn">
                  <X size={20} />
                </button>
              </Dialog.Close>
            </div>

            <form onSubmit={onSave} className="ht-form">
              <input type="hidden" name="id" value={editingProduct?.id || 0} />

              <div className="input-row">
                <div className="input-group">
                  <label>Product Name</label>
                  <input
                      name="name"
                      defaultValue={editingProduct?.name}
                      required
                      className="ht-input"
                      placeholder="e.g. Industrial Solvent X"
                  />
                </div>
                <div className="input-group">
                  <label>Scan Code (Barcode/QR)</label>
                  <input
                      name="scanCode"
                      defaultValue={editingProduct?.scanCode}
                      required
                      className="ht-input"
                      placeholder="Unique ID"
                      disabled={hasInventoryItems}
                      title={hasInventoryItems ? "Cannot change code for products in stock" : ""}
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Photo URL (Optional preview)</label>
                <input
                    name="photoUrl"
                    defaultValue={editingProduct?.photoUrl}
                    className="ht-input"
                    placeholder="https://..."
                />
                <label>{invT.photo}</label>
                <div className="file-input-wrapper">
                  <input type="hidden" name="photoUrl" value={fileName} />
                  <label className="file-upload-label">
                    <FileImage size={18} />
                    <span className="file-name">
                      {fileName || invT.selectFile}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              </div>

              {/* --- AI REFERENCE IMAGES SECTION --- */}
              {editingProduct && (
                  <ReferenceImageManager
                      productId={editingProduct.id}
                      scanCode={editingProduct.scanCode}
                  />
              )}

              <div style={{ margin: "1rem 0", borderBottom: "1px solid var(--border-input)" }}></div>

              <div className="input-row triple-col">
                <div className="input-group">
                  <label>Weight (kg)</label>
                  <input
                      type="number"
                      step="0.01"
                      name="weightKg"
                      defaultValue={editingProduct?.weightKg}
                      required
                      className="ht-input"
                  />
                </div>
                <div className="input-group">
                  <label>Validity (Days)</label>
                  <input
                      type="number"
                      name="validityDays"
                      defaultValue={editingProduct?.validityDays}
                      className="ht-input"
                      placeholder="0 = Indefinite"
                  />
                </div>
              </div>

              <div className="input-group" style={{ margin: "10px 0" }}>
                <label style={{ flexDirection: "row", gap: "10px", alignItems: "center", cursor: "pointer" }}>
                  <input
                      type="checkbox"
                      name="isHazardous"
                      defaultChecked={editingProduct?.isHazardous}
                      style={{ width: "auto", height: "auto" }}
                  />
                  <span style={{ color: "#fca5a5", display: "flex", alignItems: "center", gap: "6px" }}>
                  <AlertTriangle size={14} /> Hazardous Material (ADR)
                </span>
                </label>
              </div>

              <div className="input-group">
                <label>Handling Comment</label>
                <textarea
                    name="comment"
                    defaultValue={editingProduct?.comment}
                    className="ht-input"
                    rows={2}
                />
              </div>

              <div className="modal-footer">
                <button type="submit" className="btn-submit-ht">
                  <Save size={18} /> Save Definition
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
  );
};