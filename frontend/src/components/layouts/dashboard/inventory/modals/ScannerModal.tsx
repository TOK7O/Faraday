import React, { useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Camera, X } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";

interface ScannerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'inbound' | 'outbound' | 'move';
    onScanSuccess: (decodedText: string) => void;
}

export const ScannerModal = ({ open, onOpenChange, mode, onScanSuccess }: ScannerModalProps) => {
    useEffect(() => {
        let scanner: Html5QrcodeScanner | null = null;

        if (open) {
            // Html5QrcodeScanner potrzebuje chwili na zamontowanie się elementu DOM
            const timer = setTimeout(() => {
                scanner = new Html5QrcodeScanner(
                    "reader",
                    { fps: 10, qrbox: 250 },
                    /* verbose= */ false
                );

                scanner.render(
                    (decodedText) => {
                        onScanSuccess(decodedText);
                        // Skaner jest czyszczony wewnątrz InventoryContent lub tutaj przy zamknięciu
                    },
                    (error) => { /* błędy skanowania można zignorować */ }
                );
            }, 300);

            return () => {
                clearTimeout(timer);
                if (scanner) {
                    scanner.clear().catch(err => console.error("Błąd czyszczenia skanera:", err));
                }
            };
        }
    }, [open, mode, onScanSuccess]);

    const getTitle = () => {
        switch (mode) {
            case 'inbound': return 'Przyjęcie';
            case 'outbound': return 'Wydanie';
            case 'move': return 'Przesunięcie';
            default: return '';
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="modal-overlay" />
                <Dialog.Content className="modal-content" style={{ maxWidth: '500px' }}>
                    <div className="modal-header">
                        <Camera size={20} className="header-icon" />
                        <Dialog.Title>Skaner kodów - {getTitle()}</Dialog.Title>
                        <Dialog.Close asChild>
                            <button className="close-btn"><X size={20} /></button>
                        </Dialog.Close>
                    </div>

                    <div id="reader" style={{ width: '100%', minHeight: '300px', overflow: 'hidden', borderRadius: '8px' }}></div>

                    <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', fontSize: '0.85rem' }}>
                        <p>Umieść kod kreskowy w polu widzenia kamery. Skanowanie nastąpi automatycznie.</p>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};