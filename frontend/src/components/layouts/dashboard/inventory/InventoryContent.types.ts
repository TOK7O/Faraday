export interface Rack {
    id: number;
    code: string;
    m: number;
    n: number;
    tempMin: number;
    tempMax: number;
    maxWeight: number;
    maxWidth: number;
    maxHeight: number;
    maxDepth: number;
    comment: string;
}

export interface Product {
    id: number;
    scanCode: string;
    name: string;
    category?: string;
    weight: number;
    width: number;
    height: number;
    depth: number;
    tempRequired: number;
    requiredMinTemp?: number;
    requiredMaxTemp?: number;
    isHazardous: boolean;
    hazardClassification?: number;
    validityDays?: number;
    photoUrl?: string;
}

export interface ProductCatalogProps {
    products: Product[];
    viewMode: 'grid' | 'list';
    onDeleteProduct: (id: number) => Promise<void>;
}

export interface RackModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingRack: Rack | null;
    onSave: (e: React.FormEvent<HTMLFormElement>) => void;
    invT: any;
    existingRacks: Rack[];
}

export interface FullInventoryItem {
    itemId: number;
    productId: number;
    productName: string;
    barcode: string;
    productPhotoUrl?: string;
    productWeightKg: number;
    rackCode: string;
    slotX: number;
    slotY: number;
    locationCode: string;
    status: string;
    expirationDate?: string;
    daysUntilExpiration?: number;
    currentRackTemperature: number;
    isHazardous: boolean;
}