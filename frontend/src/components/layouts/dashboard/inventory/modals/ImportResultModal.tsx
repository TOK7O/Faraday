import * as Dialog from "@radix-ui/react-dialog";
import { X, AlertTriangle } from "lucide-react";

import "./ImportResultModal.scss";

interface ImportResultModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    importResult: {
        successCount: number;
        errorCount: number;
        errors: string[];
    } | null;
    invT: any;
}

export const ImportResultModal = ({
    open,
    onOpenChange,
    importResult,
    invT,
}: ImportResultModalProps) => (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
            <Dialog.Overlay className="dialog-overlay-ht" />
            <Dialog.Content className="dialog-content-ht result-modal-content">
                <div className="modal-header">
                    <Dialog.Title>
                        <span className="outline-text">IMPORT</span> RESULT
                    </Dialog.Title>
                    <Dialog.Close asChild>
                        <button className="btn-ht">
                            <X size={20} />
                        </button>
                    </Dialog.Close>
                </div>

                <div className="modal-body">
                    <div className="result-stats-grid">
                        <div className="stat-card success">
                            <span className="stat-number">
                                {importResult?.successCount}
                            </span>
                            <span className="stat-label">
                                {invT.import.result.successes}
                            </span>
                        </div>

                        <div className="stat-card error">
                            <span className="stat-number">
                                {importResult?.errorCount}
                            </span>
                            <span className="stat-label">
                                {invT.import.result.failures}
                            </span>
                        </div>
                    </div>

                    {importResult && importResult.errors.length > 0 && (
                        <div className="error-details-container">
                            <p className="details-title">
                                <AlertTriangle size={14} /> {invT.import.result.details}
                            </p>
                            <div className="error-scroll-area">
                                <ul>
                                    {importResult.errors.map((err, i) => (
                                        <li key={i}>{err}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button
                        className="btn-primary-ht"
                        onClick={() => onOpenChange(false)}
                    >
                        {invT.import.close}
                    </button>
                </div>
            </Dialog.Content>
        </Dialog.Portal>
    </Dialog.Root>
);
