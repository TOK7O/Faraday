import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

interface ScannerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    invT: any;
}

export const ScannerDialog = ({ open, onOpenChange, invT }: ScannerDialogProps) => (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
            <Dialog.Overlay className="modal-overlay" />

            <Dialog.Content
                className="modal-content"
                aria-describedby="scanner-description"
            >
                <div className="modal-header">
                    <Dialog.Title>{invT.scanner.title}</Dialog.Title>
                    <Dialog.Description
                        id="scanner-description"
                        className="visually-hidden"
                    >
                        {invT.scanner.description}
                    </Dialog.Description>
                    <Dialog.Close asChild>
                        <button className="close-btn">
                            <X size={20} />
                        </button>
                    </Dialog.Close>
                </div>

                <div
                    id="reader"
                    style={{
                        width: "100%",
                        minHeight: "300px",
                        background: "#000",
                        borderRadius: "8px",
                        overflow: "hidden",
                    }}
                ></div>
            </Dialog.Content>
        </Dialog.Portal>
    </Dialog.Root>
);
