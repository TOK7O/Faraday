import { useEffect, useState } from 'react';
import { useTranslation } from "@/context/LanguageContext";
import "./ReportsContent.scss";
import {
    getDashboardStats,
    getInventorySummary,
    getFullInventory,
    getExpiringItems,
    getRackUtilization,
    getTemperatureHistory,
    getWeightHistory,
    getAlertHistory,
    getActiveAlerts,
    getRackTemperatureViolations,
    getItemTemperatureViolations
} from '@/api/axios';

import {
    BarChart3, Box, AlertTriangle, Thermometer,
    Scale, RefreshCw, Notebook
} from 'lucide-react';

type ReportTab = 'inventory' | 'utilization' | 'sensors' | 'alerts';

interface DashboardStats {
    occupancyPercentage: number;
    occupiedSlots: number;
    totalSlots: number;
    totalWeightKg: number;
    totalCapacityKg: number;
    operationsToday: number;
}

interface InventoryItem {
    itemId: number;
    productName: string;
    barcode: string;
    locationCode: string;
    status: string;
    currentRackTemperature: number;
    requiredMinTemp: number;
    requiredMaxTemp: number;
    entryDate: string;
}

interface ExpiringItem {
    id: number;
    productName: string;
    barcode: string;
    locationCode: string;
    expirationDate: string;
    daysRemaining: number;
}

interface RackUtilization {
    rackCode: string;
    slotUtilizationPercentage: number;
    occupiedSlots: number;
    totalSlots: number;
    weightUtilizationPercentage: number;
    currentWeightKg: number;
    maxWeightKg: number;
}

interface TempReading {
    id: number;
    rackCode: string;
    recordedTemperature: number;
    timestamp: string;
}

interface WeightReading {
    id: number;
    rackCode: string;
    measuredWeightKg: number;
    discrepancyKg: number;
    timestamp: string;
}

interface Alert {
    id: number;
    type: string;
    rackCode?: string;
    message: string;
    durationMinutes?: number;
    isResolved: boolean;
    createdAt: string;
    resolvedAt?: string;
}

interface TemperatureViolation {
    readingId?: number;
    rackCode: string;
    recordedTemperature: number;
    allowedMinTemperature: number;
    allowedMaxTemperature: number;
    violationDegrees: number;
    timestamp: string;
}

interface ItemTemperatureViolation {
    itemId: number;
    productName: string;
    rackCode: string;
    recordedTemperature: number;
    requiredMinTemperature: number;
    requiredMaxTemperature: number;
    violationDegrees: number;
    violationTimestamp: string;
}

const ReportsContent = () => {
    const { t, lang } = useTranslation();
    const reportsT: any = t.dashboardPage.content.reports;

    const [activeTab, setActiveTab] = useState<ReportTab>('inventory');
    const [isLoading, setIsLoading] = useState(false);

    const [fromDate, setFromDate] = useState<string>('');
    const [toDate, setToDate] = useState<string>('');
    const [rackIdFilter, setRackIdFilter] = useState<string>('');
    const [limit] = useState<number>(100);

    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [inventorySummary, setInventorySummary] = useState<any[]>([]); // Summary is just a POJO from backend
    const [fullInventory, setFullInventory] = useState<InventoryItem[]>([]);
    const [expiringItems, setExpiringItems] = useState<ExpiringItem[]>([]);
    const [rackUtilization, setRackUtilization] = useState<RackUtilization[]>([]);
    const [tempHistory, setTempHistory] = useState<TempReading[]>([]);
    const [weightHistory, setWeightHistory] = useState<WeightReading[]>([]);
    const [alertHistory, setAlertHistory] = useState<Alert[]>([]);
    const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
    const [rackViolations, setRackViolations] = useState<TemperatureViolation[]>([]);
    const [itemViolations, setItemViolations] = useState<ItemTemperatureViolation[]>([]);

    useEffect(() => {
        fetchDashboardStats();
        handleFetchData();
    }, [activeTab]);

    const fetchDashboardStats = async () => {
        try {
            const data = await getDashboardStats();
            setStats(data);
        } catch (error) {
            console.error("Failed to fetch stats", error);
        }
    };

    const handleFetchData = async () => {
        setIsLoading(true);
        try {
            const filterParams = {
                rackId: rackIdFilter ? parseInt(rackIdFilter) : undefined,
                fromDate: fromDate ? new Date(fromDate).toISOString() : undefined,
                toDate: toDate ? new Date(toDate).toISOString() : undefined,
                limit: limit
            };

            switch (activeTab) {
                case 'inventory':
                    const [summary, full, expiring] = await Promise.all([
                        getInventorySummary(),
                        getFullInventory(),
                        getExpiringItems(7)
                    ]);
                    setInventorySummary(summary);
                    setFullInventory(full);
                    setExpiringItems(expiring);
                    break;

                case 'utilization':
                    const util = await getRackUtilization();
                    setRackUtilization(util);
                    break;

                case 'sensors':
                    const [temp, weight, rackV, itemV] = await Promise.all([
                        getTemperatureHistory(filterParams),
                        getWeightHistory(filterParams),
                        getRackTemperatureViolations(filterParams),
                        getItemTemperatureViolations({ fromDate: filterParams.fromDate, toDate: filterParams.toDate })
                    ]);
                    setTempHistory(temp);
                    setWeightHistory(weight);
                    setRackViolations(rackV);
                    setItemViolations(itemV);
                    break;

                case 'alerts':
                    const [active, history] = await Promise.all([
                        getActiveAlerts(),
                        getAlertHistory({
                            rackId: filterParams.rackId,
                            fromDate: filterParams.fromDate,
                            toDate: filterParams.toDate
                        })
                    ]);
                    setActiveAlerts(active);
                    setAlertHistory(history);
                    break;
            }
        } catch (error) {
            console.error("Failed to fetch report data", error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString(lang === 'pl' ? 'pl-PL' : 'en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const renderInventoryView = () => (
        <div className="view-container">
            <div className="stats-grid">
                <div className="stat-card">
                    <h4>{reportsT.stats.totalItems}</h4>
                    <div className="value">{inventorySummary.reduce((acc, i) => acc + i.totalQuantity, 0)}</div>
                </div>
                <div className="stat-card">
                    <h4>{reportsT.stats.blockedItems}</h4>
                    <div className="value" style={{ color: '#f87171' }}>{inventorySummary.reduce((acc, i) => acc + i.blockedQuantity, 0)}</div>
                </div>
                <div className="stat-card">
                    <h4>{reportsT.stats.expiring}</h4>
                    <div className="value" style={{ color: '#facc15' }}>{expiringItems.length}</div>
                </div>
            </div>

            {/* Expiring Items Table */}
            <div className="table-container" style={{ marginBottom: '2rem' }}>
                <h3>{reportsT.inventory.expiringTitle}</h3>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>{reportsT.inventory.table.product}</th>
                            <th>{reportsT.inventory.table.barcode}</th>
                            <th>{reportsT.inventory.table.location}</th>
                            <th>{reportsT.inventory.table.expDate}</th>
                            <th>{reportsT.inventory.table.daysLeft}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {expiringItems.map(item => (
                            <tr key={item.id}>
                                <td>{item.productName}</td>
                                <td>{item.barcode}</td>
                                <td>{item.locationCode}</td>
                                <td>{formatDate(item.expirationDate)}</td>
                                <td><span className="badge warn">{item.daysRemaining} {reportsT.inventory?.days || 'days'}</span></td>
                            </tr>
                        ))}
                        {expiringItems.length === 0 && <tr><td colSpan={5} className="empty-state">{reportsT.inventory.emptyExpiring}</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* Full Inventory Table */}
            <div className="table-container">
                <h3>{reportsT.inventory.fullTitle}</h3>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>{reportsT.inventory.table.location}</th>
                            <th>{reportsT.inventory.table.product}</th>
                            <th>{reportsT.inventory.table.status}</th>
                            <th>{reportsT.inventory.table.temp}</th>
                            <th>{reportsT.inventory.table.entryDate}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {fullInventory.slice(0, 100).map(item => (
                            <tr key={item.itemId}>
                                <td>{item.locationCode}</td>
                                <td>
                                    <div>{item.productName}</div>
                                    <small style={{ color: '#64748b' }}>{item.barcode}</small>
                                </td>
                                <td>
                                    <span className={`badge ${item.status === 'InStock' ? 'success' : 'danger'}`}>
                                        {reportsT.inventoryStatus?.[item.status] || item.status}
                                    </span>
                                </td>
                                <td>
                                    <span style={{
                                        color: (item.currentRackTemperature < item.requiredMinTemp || item.currentRackTemperature > item.requiredMaxTemp) ? '#f87171' : 'inherit'
                                    }}>
                                        {item.currentRackTemperature}°C
                                    </span>
                                </td>
                                <td>{formatDate(item.entryDate)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {fullInventory.length > 100 && (
                    <div style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>
                        {reportsT.inventory.showingFirst.replace('{count}', '100').replace('{total}', fullInventory.length.toString())}
                    </div>
                )}
            </div>
        </div>
    );

    const renderUtilizationView = () => (
        <div className="view-container">
            <div className="table-container">
                <h3>{reportsT.utilization.title}</h3>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>{reportsT.utilization.table.rack}</th>
                            <th>{reportsT.utilization.table.occupancy}</th>
                            <th>{reportsT.utilization.table.weight}</th>
                            <th>{reportsT.utilization.table.maxWeight}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rackUtilization.map(rack => (
                            <tr key={rack.rackCode}>
                                <td><strong>{rack.rackCode}</strong></td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <progress value={rack.slotUtilizationPercentage} max="100" style={{ width: '100px' }}></progress>
                                        <span>{rack.slotUtilizationPercentage}% ({rack.occupiedSlots}/{rack.totalSlots})</span>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <progress value={rack.weightUtilizationPercentage} max="100" style={{ width: '100px' }}></progress>
                                        <span>{rack.weightUtilizationPercentage}% ({rack.currentWeightKg.toFixed(1)}{(reportsT.common?.kg || 'kg')})</span>
                                    </div>
                                </td>
                                <td>{rack.maxWeightKg} {(reportsT.common?.kg || 'kg')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderSensorsView = () => (
        <div className="view-container">
            {/* Violations */}
            <div className="table-container">
                <h3>{reportsT.sensors.violationsTitle}</h3>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>{reportsT.sensors.table.type}</th>
                            <th>{reportsT.sensors.table.target}</th>
                            <th>{reportsT.sensors.table.recorded}</th>
                            <th>{reportsT.sensors.table.range}</th>
                            <th>{reportsT.sensors.table.deviation}</th>
                            <th>{reportsT.sensors.table.time}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rackViolations.map(v => (
                            <tr key={v.readingId}>
                                <td>{(reportsT.common?.rackPrefix || 'Rack')} {v.rackCode}</td>
                                <td>-</td>
                                <td>{v.recordedTemperature}°C</td>
                                <td>{v.allowedMinTemperature} - {v.allowedMaxTemperature}°C</td>
                                <td><span className="badge danger">+{v.violationDegrees.toFixed(1)}°C</span></td>
                                <td>{formatDate(v.timestamp)}</td>
                            </tr>
                        ))}
                        {itemViolations.map(v => (
                            <tr key={`item-${v.itemId}-${v.violationTimestamp}`}>
                                <td>{(reportsT.common?.product || 'Product')}</td>
                                <td>{v.productName} ({v.rackCode})</td>
                                <td>{v.recordedTemperature}°C</td>
                                <td>{v.requiredMinTemperature} - {v.requiredMaxTemperature}°C</td>
                                <td><span className="badge danger">+{v.violationDegrees.toFixed(1)}°C</span></td>
                                <td>{formatDate(v.violationTimestamp)}</td>
                            </tr>
                        ))}
                        {rackViolations.length === 0 && itemViolations.length === 0 && <tr><td colSpan={6} className="empty-state">{reportsT.sensors.emptyViolations}</td></tr>}
                    </tbody>
                </table>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="table-container">
                    <h3><Thermometer size={16} /> {reportsT.sensors.tempHistory}</h3>
                    <table className="data-table">
                        <thead><tr><th>{reportsT.sensors.table.rack}</th><th>{reportsT.inventory.table.temp}</th><th>{reportsT.sensors.table.time}</th></tr></thead>
                        <tbody>
                            {tempHistory.map(t => (
                                <tr key={t.id}>
                                    <td>{t.rackCode}</td>
                                    <td>{t.recordedTemperature}°C</td>
                                    <td>{formatDate(t.timestamp)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="table-container">
                    <h3><Scale size={16} /> {reportsT.sensors.weightHistory}</h3>
                    <table className="data-table">
                        <thead><tr><th>{reportsT.sensors.table.rack}</th><th>{reportsT.sensors.table.measured}</th><th>{reportsT.sensors.table.discrepancy}</th><th>{reportsT.sensors.table.time}</th></tr></thead>
                        <tbody>
                            {weightHistory.map(w => (
                                <tr key={w.id}>
                                    <td>{w.rackCode}</td>
                                    <td>{w.measuredWeightKg.toFixed(2)} {(reportsT.common?.kg || 'kg')}</td>
                                    <td style={{ color: Math.abs(w.discrepancyKg) > 0.5 ? '#facc15' : 'inherit' }}>
                                        {w.discrepancyKg > 0 ? '+' : ''}{w.discrepancyKg.toFixed(2)} {(reportsT.common?.kg || 'kg')}
                                    </td>
                                    <td>{formatDate(w.timestamp)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderAlertsView = () => (
        <div className="view-container">
            <div className="table-container" style={{ marginBottom: '2rem' }}>
                <h3>{reportsT.alerts.activeTitle}</h3>
                <table className="data-table">
                    <thead><tr><th>{reportsT.alerts.table.severity}</th><th>{reportsT.alerts.table.rack}</th><th>{reportsT.alerts.table.message}</th><th>{reportsT.alerts.table.duration}</th></tr></thead>
                    <tbody>
                        {activeAlerts.map(a => (
                            <tr key={a.id}>
                                <td><span className={`badge ${a.type === 'Critical' ? 'danger' : 'warn'}`}>{reportsT.alerts.severityLevels?.[a.type] || a.type}</span></td>
                                <td>{a.rackCode || reportsT.alerts.general}</td>
                                <td>{a.message}</td>
                                <td>{a.durationMinutes} {(reportsT.common?.mins || 'mins')}</td>
                            </tr>
                        ))}
                        {activeAlerts.length === 0 && <tr><td colSpan={4} className="empty-state">{reportsT.alerts.emptyActive}</td></tr>}
                    </tbody>
                </table>
            </div>

            <div className="table-container">
                <h3>{reportsT.alerts.historyTitle}</h3>
                <table className="data-table">
                    <thead><tr><th>{reportsT.alerts.table.status}</th><th>{reportsT.alerts.table.rack}</th><th>{reportsT.alerts.table.message}</th><th>{reportsT.alerts.table.created}</th><th>{reportsT.alerts.table.resolved}</th></tr></thead>
                    <tbody>
                        {alertHistory.map(a => (
                            <tr key={a.id}>
                                <td><span className={`badge ${a.isResolved ? 'success' : 'danger'}`}>{a.isResolved ? reportsT.alerts.status.resolved : reportsT.alerts.status.active}</span></td>
                                <td>{a.rackCode || '-'}</td>
                                <td>{a.message}</td>
                                <td>{formatDate(a.createdAt)}</td>
                                <td>{formatDate(a.resolvedAt)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="reports-view">
            <div className="bg-grid-overlay" />
            <div className="system-tag">
                <Notebook size={14} className="icon-glow" />
                <span>{reportsT.tag}</span>
            </div>
            <div className="header">
                <h1>{reportsT.title}</h1>
            </div>

            {stats && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <h4>{reportsT.stats.occupancy}</h4>
                        <div className="value">{stats.occupancyPercentage}%</div>
                        <div className="sub-value">{stats.occupiedSlots} / {stats.totalSlots} {reportsT.stats.slots}</div>
                    </div>
                    <div className="stat-card">
                        <h4>{reportsT.stats.totalWeight}</h4>
                        <div className="value">{(stats.totalWeightKg / 1000).toFixed(1)}t</div>
                        <div className="sub-value">{reportsT.stats.cap}: {(stats.totalCapacityKg / 1000).toFixed(1)}t</div>
                    </div>
                    <div className="stat-card">
                        <h4>{reportsT.stats.opsToday}</h4>
                        <div className="value">{stats.operationsToday}</div>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <div className="report-tabs">
                <button
                    className={activeTab === 'inventory' ? 'active' : ''}
                    onClick={() => setActiveTab('inventory')}
                >
                    <Box size={18} /> {reportsT.tabs.inventory}
                </button>
                <button
                    className={activeTab === 'utilization' ? 'active' : ''}
                    onClick={() => setActiveTab('utilization')}
                >
                    <BarChart3 size={18} /> {reportsT.tabs.utilization}
                </button>
                <button
                    className={activeTab === 'sensors' ? 'active' : ''}
                    onClick={() => setActiveTab('sensors')}
                >
                    <Thermometer size={18} /> {reportsT.tabs.sensors}
                </button>
                <button
                    className={activeTab === 'alerts' ? 'active' : ''}
                    onClick={() => setActiveTab('alerts')}
                >
                    <AlertTriangle size={18} /> {reportsT.tabs.alerts}
                </button>
            </div>

            {/* Filters (Conditional based on tab) */}
            {(activeTab === 'sensors' || activeTab === 'alerts') && (
                <div className="filters-bar">
                    <div className="filter-group">
                        <label>{reportsT.filters.rackId}</label>
                        <input
                            type="number"
                            placeholder={reportsT.filters.allRacks}
                            value={rackIdFilter}
                            onChange={e => setRackIdFilter(e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <label>{reportsT.filters.fromDate}</label>
                        <input
                            type="datetime-local"
                            value={fromDate}
                            onChange={e => setFromDate(e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <label>{reportsT.filters.toDate}</label>
                        <input
                            type="datetime-local"
                            value={toDate}
                            onChange={e => setToDate(e.target.value)}
                        />
                    </div>
                    <button className="refresh-btn" onClick={handleFetchData}>
                        <RefreshCw size={16} /> {reportsT.filters.refresh}
                    </button>
                </div>
            )}

            {/* Content Switch */}
            {isLoading ? (
                <div className="loading-overlay">{reportsT.loading}</div>
            ) : (
                <>
                    {activeTab === 'inventory' && renderInventoryView()}
                    {activeTab === 'utilization' && renderUtilizationView()}
                    {activeTab === 'sensors' && renderSensorsView()}
                    {activeTab === 'alerts' && renderAlertsView()}
                </>
            )}
        </div>
    );
};

export default ReportsContent;
