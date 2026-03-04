import * as Dialog from "@radix-ui/react-dialog";
import {
    X,
    AlertTriangle,
    CheckCircle2,
    Search,
    LayoutGrid,
    FileUp,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

import "./ImportPreviewModal.scss";

interface ImportPreviewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    importType: "racks" | "products" | null;
    importPreviewData: any[];
    setImportPreviewData: (data: any[]) => void;
    selectedPreviewItem: any | null;
    setSelectedPreviewItem: (item: any | null) => void;
    batchProgress: { current: number; total: number } | null;
    onConfirmImport: () => void;
    invT: any;
}

export const ImportPreviewModal = ({
    open,
    onOpenChange,
    importType,
    importPreviewData,
    setImportPreviewData,
    selectedPreviewItem,
    setSelectedPreviewItem,
    batchProgress,
    onConfirmImport,
    invT,
}: ImportPreviewModalProps) => (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
            <Dialog.Overlay className="dialog-overlay-ht" />
            <Dialog.Content className="dialog-content-ht import-modal-ht">
                <div className="modal-header">
                    <Dialog.Title>
                        Import:{" "}
                        {importType === "racks"
                            ? invT.import.racksTitle
                            : invT.import.productsTitle}
                    </Dialog.Title>
                    <Dialog.Close asChild>
                        <button className="close-btn">
                            <X size={20} />
                        </button>
                    </Dialog.Close>
                </div>

                <div className="import-preview-container">
                    {batchProgress ? (
                        <div className="batch-progress-panel">
                            <Spinner size={40} />
                            <p className="progress-title">{invT.import.processing}</p>
                            <p className="progress-count">
                                {batchProgress.current} / {batchProgress.total}
                            </p>
                            <div className="progress-bar-container">
                                <div
                                    className="progress-bar-fill"
                                    style={{
                                        width: `${(batchProgress.current / batchProgress.total) * 100}%`,
                                    }}
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="import-summary-strip">
                                <div className="summary-item">
                                    <span className="label">{invT.import.summary.total}</span>
                                    <span className="value">{importPreviewData.length}</span>
                                </div>
                                <div className="summary-item">
                                    <span className="label">{invT.import.summary.new}</span>
                                    <span className="value success-text">
                                        {
                                            importPreviewData.filter((i) => i.status === "new")
                                                .length
                                        }
                                    </span>
                                </div>
                                <div className="summary-item">
                                    <span className="label">
                                        {invT.import.summary.conflicts}
                                    </span>
                                    <span className="value warning-text">
                                        {
                                            importPreviewData.filter(
                                                (i) => i.status === "conflict",
                                            ).length
                                        }
                                    </span>
                                </div>
                                <div className="summary-item">
                                    <span className="label">
                                        {invT.import.summary.toSave}
                                    </span>
                                    <span className="value">
                                        {
                                            importPreviewData.filter((i) => i.action !== "skip")
                                                .length
                                        }
                                    </span>
                                </div>
                            </div>

                            <div className="import-table-wrapper">
                                <table className="import-table">
                                    <thead>
                                        <tr>
                                            <th>{invT.import.table.status}</th>
                                            <th>{invT.import.table.code}</th>
                                            <th>{invT.import.table.decision}</th>
                                            <th>{invT.import.table.action}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {importPreviewData.map((item, idx) => (
                                            <tr
                                                key={idx}
                                                className={
                                                    selectedPreviewItem === item ? "row-selected" : ""
                                                }
                                            >
                                                <td>
                                                    <span
                                                        className={`status-badge ${item.status === "conflict" ? "conflict" : "new"}`}
                                                    >
                                                        {item.status === "conflict" ? (
                                                            <AlertTriangle size={12} />
                                                        ) : (
                                                            <CheckCircle2 size={12} />
                                                        )}
                                                        {item.status === "conflict"
                                                            ? invT.import.table.conflict
                                                            : invT.import.table.new}
                                                    </span>
                                                </td>
                                                <td className="mono-text">
                                                    {item.data.code || item.data.scanCode}
                                                </td>
                                                <td>
                                                    <select
                                                        value={item.action}
                                                        onChange={(e) => {
                                                            const newData = [...importPreviewData];
                                                            newData[idx].action = e.target.value;
                                                            setImportPreviewData(newData);
                                                        }}
                                                    >
                                                        {item.status === "conflict" ? (
                                                            <>
                                                                <option value="skip">
                                                                    {invT.import.actions.skip}
                                                                </option>
                                                                <option value="update">
                                                                    {invT.import.actions.update}
                                                                </option>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <option value="create">
                                                                    {invT.import.actions.create}
                                                                </option>
                                                                <option value="skip">
                                                                    {invT.import.actions.skip}
                                                                </option>
                                                            </>
                                                        )}
                                                    </select>
                                                </td>
                                                <td>
                                                    <button
                                                        className={`btn-action-ht ${selectedPreviewItem === item ? "active" : ""}`}
                                                        onClick={() =>
                                                            setSelectedPreviewItem(
                                                                selectedPreviewItem === item ? null : item,
                                                            )
                                                        }
                                                    >
                                                        {selectedPreviewItem === item ? (
                                                            <X size={16} />
                                                        ) : (
                                                            <Search size={16} />
                                                        )}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {selectedPreviewItem && (
                                <div className="diff-view-master-detail">
                                    <div className="validation-section">
                                        {selectedPreviewItem.validationErrors?.length > 0 && (
                                            <div className="validation-warning critical">
                                                <div className="warning-header">
                                                    <AlertTriangle size={18} />{" "}
                                                    {invT.import.warnings.critical}
                                                </div>
                                                <ul>
                                                    {selectedPreviewItem.validationErrors.map(
                                                        (err: string, i: number) => (
                                                            <li key={i}>{err}</li>
                                                        ),
                                                    )}
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    <div className="diff-grid">
                                        <div className="diff-card">
                                            <div className="card-title">
                                                <LayoutGrid size={14} /> {invT.import.diff.current}
                                            </div>
                                            <div className="diff-content">
                                                {selectedPreviewItem.existingData ? (
                                                    Object.entries(
                                                        selectedPreviewItem.existingData,
                                                    ).map(([key, val]) => (
                                                        <div key={key} className="diff-row">
                                                            <span className="label">{key}</span>
                                                            <span className="value">{String(val)}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="no-data-placeholder">
                                                        {invT.import.diff.noData}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="diff-card changed-data">
                                            <div className="card-title">
                                                <FileUp size={14} /> {invT.import.diff.csv}
                                            </div>
                                            <div className="diff-content">
                                                {Object.entries(selectedPreviewItem.data).map(
                                                    ([key, val]) => {
                                                        const isDifferent =
                                                            selectedPreviewItem.existingData &&
                                                            String(val) !==
                                                            String(
                                                                selectedPreviewItem.existingData[key],
                                                            );
                                                        return (
                                                            <div key={key} className="diff-row">
                                                                <span className="label">{key}</span>
                                                                <span
                                                                    className={`value ${isDifferent ? "changed" : ""}`}
                                                                >
                                                                    {String(val)}
                                                                </span>
                                                            </div>
                                                        );
                                                    },
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="modal-footer">
                    <button
                        className="btn-secondary"
                        onClick={() => onOpenChange(false)}
                    >
                        {invT.import.cancel}
                    </button>
                    <button
                        className="btn-primary-ht"
                        onClick={onConfirmImport}
                        disabled={!!batchProgress || importPreviewData.length === 0}
                    >
                        {invT.import.submit.replace(
                            "{count}",
                            importPreviewData
                                .filter((i) => i.action !== "skip")
                                .length.toString(),
                        )}
                    </button>
                </div>
            </Dialog.Content>
        </Dialog.Portal>
    </Dialog.Root>
);
