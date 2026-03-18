import * as Dialog from "@radix-ui/react-dialog";
import { BrainCircuit } from "lucide-react";
import { CameraSnapshot } from "@/components/ui/CameraSnapshot";

interface AiScannerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCapture: (file: File) => void;
}

export const AiScannerDialog = ({
    open,
    onOpenChange,
    onCapture,
}: AiScannerDialogProps) => (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
            <Dialog.Overlay
                className="modal-overlay"
                style={{ background: "black" }}
            />
            <Dialog.Content
                className="modal-content"
                style={{
                    padding: 0,
                    overflow: "hidden",
                    background: "#000",
                    border: "none",
                    maxWidth: "100vw",
                    height: "100vh",
                    width: "100vw",
                }}
            >
                <CameraSnapshot
                    onCapture={onCapture}
                    onClose={() => onOpenChange(false)}
                />
            </Dialog.Content>
        </Dialog.Portal>
    </Dialog.Root>
);

interface AiProcessingOverlayProps {
    visible: boolean;
}

export const AiProcessingOverlay = ({ visible }: AiProcessingOverlayProps) => {
    if (!visible) return null;

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                background: "rgba(0,0,0,0.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: "1rem",
                color: "white",
            }}
        >
            <BrainCircuit
                size={48}
                className="animate-pulse"
                style={{ color: "var(--accent-primary)" }}
            />
            <p style={{ fontFamily: "Space Grotesk", fontSize: "1.2rem" }}>
                Analyzing Image...
            </p>
        </div>
    );
};
