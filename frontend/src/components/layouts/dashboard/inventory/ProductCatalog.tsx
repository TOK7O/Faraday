import { Package, ShieldAlert, Weight, Thermometer } from "lucide-react";
import type { Product } from "./InventoryContent.types";

interface ProductCatalogProps {
    products: Product[];
    viewMode: 'grid' | 'list';
}

export const ProductCatalog = ({ products, viewMode }: ProductCatalogProps) => {
    if (viewMode === 'grid') {
        return (
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
                {products.map((p) => (
                    <div className="glass-card" key={p.id} style={{ padding: '1.2rem', display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
                        <div style={{ width: '50px', height: '50px', background: 'var(--bg-input)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                            <Package size={28} style={{ color: p.isHazardous ? '#ff4d4d' : 'var(--accent-primary)' }} />
                            {p.isHazardous && <ShieldAlert size={14} style={{ position: 'absolute', top: '-4px', right: '-4px', color: '#ff4d4d' }} />}
                        </div>
                        <div style={{ flex: 1 }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', fontFamily: 'monospace' }}>{p.id}</span>
                            <h3 style={{ margin: '2px 0', fontSize: '1.1rem' }}>{p.name}</h3>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '10px' }}>
                                <span><Weight size={12}/> {p.weight} kg</span>
                                <span><Thermometer size={12}/> {p.tempRequired}°C</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

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
                    <th className="text-right">Status</th>
                </tr>
                </thead>
                <tbody>
                {products.map((p) => (
                    <tr key={p.id}>
                        <td className="id-col">{p.id}</td>
                        <td className="name-col">{p.name}</td>
                        <td>{p.weight} kg</td>
                        <td>{p.width}x{p.height}x{p.depth}</td>
                        <td>{p.tempRequired}°C</td>
                        <td className="text-right">
                            {p.isHazardous ? <span style={{ color: '#ff4d4d', fontSize: '0.7rem', fontWeight: 800 }}>NIEBEZPIECZNY</span> : 'BEZPIECZNY'}
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
};