import { Package, Weight, Thermometer, AlertTriangle, CheckCircle2, Trash2, Pencil } from "lucide-react";
import type { Product } from "./InventoryContent.types";
import { SkeletonGrid, ProductListSkeleton } from "./InventorySkeletons";
import "./ProductCatalog.scss";

interface ProductCatalogProps {
    products: Product[];
    viewMode: 'grid' | 'list';
    onDeleteProduct: (id: string | number) => Promise<void>;
    onEditProduct: (product: Product) => void;
    isLoading?: boolean;
}

export const ProductCatalog = ({ products, viewMode, onDeleteProduct, onEditProduct, isLoading = false }: ProductCatalogProps) => {

    if (viewMode === 'grid') {
        return (
            <div className="product-grid-view">
                {products.map((p) => (
                    <div className="product-card glass-card fade-in-up" key={p.id}>
                        <div className={`product-icon-box ${p.isHazardous ? 'hazardous' : ''}`}>
                            {p.isHazardous ? <AlertTriangle size={24} /> : <Package size={24} />}
                        </div>

                        <div className="product-info">
                            <span className="product-sku">{p.scanCode || p.id}</span>
                            <h3 className="product-name">{p.name}</h3>
                            <div className="product-meta">
                                <span><Weight size={12} /> {p.weightKg} kg</span>
                                <span><Thermometer size={12} /> {p.tempRequired}°C</span>
                            </div>
                        </div>

                        <div className="product-actions">
                            <button className="action-btn edit" onClick={() => onEditProduct(p)} title="Edytuj">
                                <Pencil size={18} />
                            </button>
                            <button className="action-btn delete" onClick={() => onDeleteProduct(p.id)} title="Usuń">
                                <Trash2 size={18} />
                            </button>
                        </div>

                        {p.isHazardous && (
                            <div className="hazard-indicator" title="Materiał niebezpieczny">
                                <AlertTriangle size={12} />
                            </div>
                        )}
                    </div>
                ))}
                {isLoading && <SkeletonGrid count={6} type="product" />}
            </div>
        );
    }

    return (
        <div className="glass-table-wrapper">
            <table className="ht-table">
                <thead>
                <tr>
                    <th>ID / SKU</th>
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
                    <tr key={p.id} className="fade-in-up">
                        <td className="id-col">{p.scanCode || p.id}</td>
                        <td className="name-col">{p.name}</td>
                        <td><div className="cell-with-icon"><Weight size={12}/> {p.weightKg} kg</div></td>
                        <td>{p.widthMm}x{p.heightMm}x{p.depthMm} mm</td>
                        <td>{p.tempRequired}°C</td>
                        <td>
                            {p.isHazardous ? (
                                <span className="badge-adr">
                                        <AlertTriangle size={12} strokeWidth={3} /> ADR
                                    </span>
                            ) : (
                                <span className="badge-ok">
                                        <CheckCircle2 size={12} /> OK
                                    </span>
                            )}
                        </td>
                        <td className="text-right">
                            <div className="table-actions">
                                <button className="btn-icon edit" onClick={() => onEditProduct(p)}><Pencil size={16} /></button>
                                <button className="btn-icon delete" onClick={() => onDeleteProduct(p.id)}><Trash2 size={16} /></button>
                            </div>
                        </td>
                    </tr>
                ))}
                {isLoading && <><ProductListSkeleton /><ProductListSkeleton /></>}
                </tbody>
            </table>
        </div>
    );
};