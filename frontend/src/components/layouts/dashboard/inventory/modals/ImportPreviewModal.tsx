import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { FileUp, AlertTriangle, CheckCircle2, Search, X, LayoutGrid, Box } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

interface ImportPreviewModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    importType: 'racks' | 'products' | null;
    importPreviewData: any[];
    setImportPreviewData: (data: any[]) => void;
    batchProgress: { current: number, total: number } | null;
    onConfirm: () => void;
}

export const ImportPreviewModal = ({
                                       isOpen,
                                       onOpenChange,
                                       importType,
                                       importPreviewData,
                                       setImportPreviewData,
                                       batchProgress,
                                       onConfirm
                                   }: ImportPreviewModalProps) => {
    const [selectedItem, setSelectedItem] = React.useState<any | null>(null);

    return (
        <DialogPrimitive.Root open={isOpen} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="dialog-overlay-ht" />
                <DialogPrimitive.Content className="dialog-content-ht import-modal-ht">
                    <div className="modal-header">
                        <FileUp size={20} className="header-icon" style={{ color: 'var(--accent-primary)', filter: 'drop-shadow(0 0 8px var(--accent-primary))' }} />
                        <DialogPrimitive.Title>Paczka importowa: {importType === 'racks' ? 'Regały' : 'Produkty'}</DialogPrimitive.Title>
                        <DialogPrimitive.Close asChild>
                            <button className="close-btn"><X size={20} /></button>
                        </DialogPrimitive.Close>
                    </div>

                    <div className="import-preview-container">
                        {batchProgress ? (
                            <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '24px' }}>
                                <Spinner size={40} />
                                <p style={{ marginTop: '1.5rem', fontWeight: 600, fontSize: '1.1rem' }}>Przetwarzanie pakietu...</p>
                                <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>{batchProgress.current} z {batchProgress.total} operacji zakończonych</p>
                                <div style={{ width: '100%', maxWidth: '400px', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', margin: '2rem auto 0', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${(batchProgress.current / batchProgress.total) * 100}%`,
                                        height: '100%',
                                        background: 'linear-gradient(90deg, var(--accent-primary), #4ade80)',
                                        boxShadow: '0 0 15px var(--accent-primary)',
                                        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }} />
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="import-summary-strip">
                                    <div className="summary-item">
                                        <span className="label">Łącznie</span>
                                        <span className="value">{importPreviewData.length}</span>
                                    </div>
                                    <div className="summary-item">
                                        <span className="label">Nowe</span>
                                        <span className="value" style={{ color: '#4ade80' }}>
                      {importPreviewData.filter(i => i.status === 'new').length}
                    </span>
                                    </div>
                                    <div className="summary-item">
                                        <span className="label">Konflikty</span>
                                        <span className="value" style={{ color: '#facc15' }}>
                      {importPreviewData.filter(i => i.status === 'conflict').length}
                    </span>
                                    </div>
                                    <div className="summary-item" style={{ marginLeft: 'auto' }}>
                                        <span className="label">Do zapisu</span>
                                        <span className="value">
                      {importPreviewData.filter(i => i.action !== 'skip').length}
                    </span>
                                    </div>
                                </div>

                                <div className="import-table-wrapper">
                                    <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                                        <table className="import-table">
                                            <thead>
                                            <tr>
                                                <th>Status</th>
                                                <th>Kod / Identyfikator</th>
                                                <th>Decyzja</th>
                                                <th>Działanie</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {importPreviewData.map((item, idx) => (
                                                <tr key={idx} style={{ background: selectedItem === item ? 'rgba(var(--accent-primary-rgb), 0.08)' : 'transparent' }}>
                                                    <td>
                              <span className={`status-badge ${item.status === 'conflict' ? 'conflict' : 'new'}`}>
                                {item.status === 'conflict' ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                                  {item.status === 'conflict' ? 'Konflikt' : 'Nowy'}
                              </span>
                                                    </td>
                                                    <td style={{ fontWeight: 700, fontFamily: 'Space Grotesk' }}>{item.data.code || item.data.scanCode}</td>
                                                    <td>
                                                        <select
                                                            value={item.action}
                                                            className="import-select"
                                                            onChange={(e) => {
                                                                const newData = [...importPreviewData];
                                                                newData[idx].action = e.target.value;
                                                                setImportPreviewData(newData);
                                                            }}
                                                        >
                                                            {item.status === 'conflict' ? (
                                                                <>
                                                                    <option value="skip">Pomiń (Zachowaj obecny)</option>
                                                                    <option value="update">Zaktualizuj (Nadpisz)</option>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <option value="create">Utwórz nowy</option>
                                                                    <option value="skip">Anuluj ten wiersz</option>
                                                                </>
                                                            )}
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <button className="btn-action-ht" onClick={() => setSelectedItem(selectedItem === item ? null : item)}>
                                                            {selectedItem === item ? <X size={16} /> : <Search size={16} />}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {selectedItem && (
                                    <div className="diff-view-master-detail">
                                        {/* Renderowanie różnic - tak jak w oryginale */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div className="diff-card">
                                                <div className="card-title" style={{ opacity: 0.5 }}><LayoutGrid size={14} /> Obecnie</div>
                                                {selectedItem.existingData ? Object.entries(selectedItem.existingData).map(([k, v]) => (
                                                    <div key={k} className="diff-row"><span className="label">{k}</span><span className="value">{String(v)}</span></div>
                                                )) : <div className="empty-diff">Nowy element</div>}
                                            </div>
                                            <div className="diff-card" style={{ borderLeft: '2px solid var(--accent-primary)' }}>
                                                <div className="card-title" style={{ color: 'var(--accent-primary)' }}><FileUp size={14} /> Plik CSV</div>
                                                {Object.entries(selectedItem.data).map(([k, v]) => {
                                                    const diff = selectedItem.existingData && String(v) !== String(selectedItem.existingData[k]);
                                                    return <div key={k} className="diff-row"><span className="label">{k}</span><span className={`value ${diff ? 'changed' : ''}`}>{String(v)}</span></div>
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                        <button className="btn-secondary" onClick={() => onOpenChange(false)}>Anuluj</button>
                        <button className="btn-primary-ht" onClick={onConfirm} disabled={!!batchProgress || importPreviewData.length === 0}>
                            Zatwierdź i importuj ({importPreviewData.filter(i => i.action !== 'skip').length})
                        </button>
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
};