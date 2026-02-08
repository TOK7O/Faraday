import { Package, Weight, Thermometer, AlertTriangle, CheckCircle2, Trash2 } from "lucide-react";
import type { Product } from "./InventoryContent.types";

interface ProductCatalogProps {
    products: Product[];
    viewMode: 'grid' | 'list';
    onDeleteProduct: (id: string | number) => Promise<void>; // Dodano brakujący prop
}

export const ProductCatalog = ({ products, viewMode, onDeleteProduct }: ProductCatalogProps) => {

    // Widok Siatki (Grid)
    if (viewMode === 'grid') {
        return (
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
                {products.map((p) => (
                    <div className="glass-card" key={p.id} style={{ padding: '1.2rem', display: 'flex', gap: '1.2rem', alignItems: 'center', position: 'relative' }}>
                        <div style={{ width: '50px', height: '50px', background: 'var(--bg-input)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {p.isHazardous ? (
                                <AlertTriangle size={28} style={{ color: '#ff4d4d' }} />
                            ) : (
                                <Package size={28} style={{ color: 'var(--accent-primary)' }} />
                            )}
                        </div>
                        <div style={{ flex: 1 }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', fontFamily: 'monospace' }}>{p.scanCode || p.id}</span>
                            <h3 style={{ margin: '2px 0', fontSize: '1.1rem' }}>{p.name}</h3>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '10px' }}>
                                <span><Weight size={12}/> {p.weight} kg</span>
                                <span><Thermometer size={12}/> {p.tempRequired}°C</span>
                            </div>
                        </div>

                        {/* Przycisk usuwania w widoku siatki */}
                        <button
                            onClick={() => onDeleteProduct(p.id)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '5px',
                                transition: 'color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#ff4d4d'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                            <Trash2 size={18} />
                        </button>

                        {p.isHazardous && (
                            <div style={{ position: 'absolute', top: '10px', right: '40px' }}>
                                <AlertTriangle size={14} color="#ff4d4d" />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    // Widok Listy (Table)
    return (
        <div className="glass-table-wrapper">
            <table className="ht-table">
                <thead>
                <tr>
                    <th>ID</th>
                    <th>Nazwa</th>
                    <th>Masa</th>
                    <th>Wymiary</th>
                    <th>Temp.</th>
                    <th>Status</th>
                    <th className="text-right">Akcje</th>
                </tr>
                </thead>
                <tbody>
                {products.map((p) => (
                    <tr key={p.id}>
                        <td className="id-col">{p.scanCode || p.id}</td>
                        <td className="name-col">{p.name}</td>
                        <td>{p.weight} kg</td>
                        <td>{p.width}x{p.height}x{p.depth}</td>
                        <td>{p.tempRequired}°C</td>
                        <td>
                            {p.isHazardous ? (
                                <span style={{
                                    color: '#ff4d4d',
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: 'rgba(255, 77, 77, 0.1)',
                                    padding: '4px 8px',
                                    borderRadius: '6px'
                                }}>
                                    <AlertTriangle size={14} strokeWidth={2.5} />
                                    ADR
                                </span>
                            ) : (
                                <span style={{
                                    color: 'var(--text-muted)',
                                    fontSize: '0.75rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    opacity: 0.7
                                }}>
                                    <CheckCircle2 size={14} />
                                    OK
                                </span>
                            )}
                        </td>
                        <td className="text-right">
                            <button
                                onClick={() => onDeleteProduct(p.id)}
                                className="btn-action-ht"
                                style={{ color: '#ff4d4d', background: 'transparent', border: 'none', cursor: 'pointer' }}
                                title="Usuń produkt"
                            >
                                <Trash2 size={16} />
                            </button>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
};