import React from 'react';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
    size?: number;
    color?: string;
    className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 24, color = 'currentColor', className = '' }) => {
    return (
        <div className={`spinner-container ${className}`} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Loader2
                className="animate-spin"
                size={size}
                color={color}
                style={{ animation: 'spin 1s linear infinite', willChange: 'transform' }}
            />
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
            `}</style>
        </div>
    );
};
