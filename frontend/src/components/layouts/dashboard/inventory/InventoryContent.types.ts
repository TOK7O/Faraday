export interface Rack {
    id: string;
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
    id: string;
    name: string;
    category: string;
    weight: number;
    width: number;
    height: number;
    depth: number;
    tempRequired: number;
    isHazardous: boolean;
}