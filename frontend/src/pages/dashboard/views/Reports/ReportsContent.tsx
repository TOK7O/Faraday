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
    Scale, RefreshCw
} from 'lucide-react';

type ReportTab = 'inventory' | 'utilization' | 'sensors' | 'alerts';

const ReportsContent = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<ReportTab>('inventory');
    const [isLoading, setIsLoading] = useState(false);

    // Filters
    const [fromDate, setFromDate] = useState<string>('');
    const [toDate, setToDate] = useState<string>('');
    const [rackIdFilter, setRackIdFilter] = useState<string>('');
    const [limit] = useState<number>(100);

    // Data States
    const [stats, setStats] = useState<any>(null);
    const [inventorySummary, setInventorySummary] = useState<any[]>([]);
    const [fullInventory, setFullInventory] = useState<any[]>([]);
    const [expiringItems, setExpiringItems] = useState<any[]>([]);
    const [rackUtilization, setRackUtilization] = useState<any[]>([]);
    const [tempHistory, setTempHistory] = useState<any[]>([]);
    const [weightHistory, setWeightHistory] = useState<any[]>([]);
    const [alertHistory, setAlertHistory] = useState<any[]>([]);
    const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
    const [rackViolations, setRackViolations] = useState<any[]>([]);
    const [itemViolations, setItemViolations] = useState<any[]>([]);

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
        return new Date(dateStr).toLocaleString();
    };

    // --- RENDER HELPERS ---

    const renderInventoryView = () => (
        <div className="view-container">
            {/* Summary Grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <h4>Total Items</h4>
                    <div className="value">{inventorySummary.reduce((acc, i) => acc + i.totalQuantity, 0)}</div>
                </div>
                <div className="stat-card">
                    <h4>Blocked Items</h4>
                    <div className="value" style={{color: '#f87171'}}>{inventorySummary.reduce((acc, i) => acc + i.blockedQuantity, 0)}</div>
                </div>
                <div className="stat-card">
                    <h4>Expiring Soon (7 days)</h4>
                    <div className="value" style={{color: '#facc15'}}>{expiringItems.length}</div>
                </div>
            </div>

            {/* Expiring Items Table */}
            <div className="table-container" style={{marginBottom: '2rem'}}>
                <h3>Items Expiring Soon</h3>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Barcode</th>
                            <th>Location</th>
                            <th>Exp. Date</th>
                            <th>Days Left</th>
                        </tr>
                    </thead>
                    <tbody>
                        {expiringItems.map(item => (
                            <tr key={item.id}>
                                <td>{item.productName}</td>
                                <td>{item.barcode}</td>
                                <td>{item.locationCode}</td>
                                <td>{formatDate(item.expirationDate)}</td>
                                <td><span className="badge warn">{item.daysRemaining} days</span></td>
                            </tr>
                        ))}
                        {expiringItems.length === 0 && <tr><td colSpan={5} className="empty-state">No items expiring soon.</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* Full Inventory Table */}
            <div className="table-container">
                <h3>Full Inventory List</h3>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Location</th>
                            <th>Product</th>
                            <th>Status</th>
                            <th>Temp (°C)</th>
                            <th>Entry Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {fullInventory.slice(0, 100).map(item => (
                            <tr key={item.itemId}>
                                <td>{item.locationCode}</td>
                                <td>
                                    <div>{item.productName}</div>
                                    <small style={{color:'#64748b'}}>{item.barcode}</small>
                                </td>
                                <td><span className={`badge ${item.status === 'InStock' ? 'success' : 'danger'}`}>{item.status}</span></td>
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
                {fullInventory.length > 100 && <div style={{padding: '10px', textAlign:'center', color: '#64748b'}}>Showing first 100 of {fullInventory.length} items</div>}
            </div>
        </div>
    );

    const renderUtilizationView = () => (
        <div className="view-container">
            <div className="table-container">
                <h3>Rack Utilization</h3>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Rack</th>
                            <th>Occupancy (Slots)</th>
                            <th>Weight Load</th>
                            <th>Max Weight</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rackUtilization.map(rack => (
                            <tr key={rack.rackCode}>
                                <td><strong>{rack.rackCode}</strong></td>
                                <td>
                                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                        <progress value={rack.slotUtilizationPercentage} max="100" style={{width: '100px'}}></progress>
                                        <span>{rack.slotUtilizationPercentage}% ({rack.occupiedSlots}/{rack.totalSlots})</span>
                                    </div>
                                </td>
                                <td>
                                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                        <progress value={rack.weightUtilizationPercentage} max="100" style={{width: '100px'}}></progress>
                                        <span>{rack.weightUtilizationPercentage}% ({rack.currentWeightKg.toFixed(1)}kg)</span>
                                    </div>
                                </td>
                                <td>{rack.maxWeightKg} kg</td>
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
            <div className="table-container" style={{marginBottom: '2rem', border: '1px solid #7f1d1d'}}>
                <h3 style={{background: 'rgba(127, 29, 29, 0.2)', color: '#fca5a5'}}>Temperature Violations</h3>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Target</th>
                            <th>Recorded</th>
                            <th>Allowed Range</th>
                            <th>Deviation</th>
                            <th>Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rackViolations.map(v => (
                            <tr key={v.readingId}>
                                <td>Rack {v.rackCode}</td>
                                <td>-</td>
                                <td>{v.recordedTemperature}°C</td>
                                <td>{v.allowedMinTemperature} - {v.allowedMaxTemperature}°C</td>
                                <td><span className="badge danger">+{v.violationDegrees.toFixed(1)}°C</span></td>
                                <td>{formatDate(v.timestamp)}</td>
                            </tr>
                        ))}
                        {itemViolations.map(v => (
                            <tr key={`item-${v.itemId}-${v.violationTimestamp}`}>
                                <td>Product</td>
                                <td>{v.productName} ({v.rackCode})</td>
                                <td>{v.recordedTemperature}°C</td>
                                <td>{v.requiredMinTemperature} - {v.requiredMaxTemperature}°C</td>
                                <td><span className="badge danger">+{v.violationDegrees.toFixed(1)}°C</span></td>
                                <td>{formatDate(v.violationTimestamp)}</td>
                            </tr>
                        ))}
                        {rackViolations.length === 0 && itemViolations.length === 0 && <tr><td colSpan={6} className="empty-state">No temperature violations found.</td></tr>}
                    </tbody>
                </table>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem'}}>
                <div className="table-container">
                    <h3><Thermometer size={16} /> Temperature History</h3>
                    <table className="data-table">
                        <thead><tr><th>Rack</th><th>Temp</th><th>Time</th></tr></thead>
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
                    <h3><Scale size={16} /> Weight History</h3>
                    <table className="data-table">
                        <thead><tr><th>Rack</th><th>Measured</th><th>Discrepancy</th><th>Time</th></tr></thead>
                        <tbody>
                            {weightHistory.map(w => (
                                <tr key={w.id}>
                                    <td>{w.rackCode}</td>
                                    <td>{w.measuredWeightKg.toFixed(2)} kg</td>
                                    <td style={{color: Math.abs(w.discrepancyKg) > 0.5 ? '#facc15' : 'inherit'}}>
                                        {w.discrepancyKg > 0 ? '+' : ''}{w.discrepancyKg.toFixed(2)} kg
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
            <div className="table-container" style={{marginBottom: '2rem'}}>
                <h3>Active Alerts</h3>
                <table className="data-table">
                    <thead><tr><th>Severity</th><th>Rack</th><th>Message</th><th>Duration</th></tr></thead>
                    <tbody>
                        {activeAlerts.map(a => (
                            <tr key={a.id}>
                                <td><span className={`badge ${a.type === 'Critical' ? 'danger' : 'warn'}`}>{a.type}</span></td>
                                <td>{a.rackCode || 'General'}</td>
                                <td>{a.message}</td>
                                <td>{a.durationMinutes} mins</td>
                            </tr>
                        ))}
                        {activeAlerts.length === 0 && <tr><td colSpan={4} className="empty-state">No active alerts. System healthy.</td></tr>}
                    </tbody>
                </table>
            </div>

            <div className="table-container">
                <h3>Alert History</h3>
                <table className="data-table">
                    <thead><tr><th>Status</th><th>Rack</th><th>Message</th><th>Created At</th><th>Resolved At</th></tr></thead>
                    <tbody>
                        {alertHistory.map(a => (
                            <tr key={a.id}>
                                <td><span className={`badge ${a.isResolved ? 'success' : 'danger'}`}>{a.isResolved ? 'Resolved' : 'Active'}</span></td>
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
            <div className="header">
                <h1>{t.dashboardPage.content.reports.title || "System Reports"}</h1>
            </div>

            {/* Dashboard Stats (Always Visible) */}
            {stats && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <h4>Occupancy</h4>
                        <div className="value">{stats.occupancyPercentage}%</div>
                        <div className="sub-value">{stats.occupiedSlots} / {stats.totalSlots} Slots</div>
                    </div>
                    <div className="stat-card">
                        <h4>Total Weight</h4>
                        <div className="value">{(stats.totalWeightKg / 1000).toFixed(1)}t</div>
                        <div className="sub-value">Cap: {(stats.totalCapacityKg / 1000).toFixed(1)}t</div>
                    </div>
                    <div className="stat-card">
                        <h4>Operations Today</h4>
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
                    <Box size={18} /> Inventory
                </button>
                <button
                    className={activeTab === 'utilization' ? 'active' : ''}
                    onClick={() => setActiveTab('utilization')}
                >
                    <BarChart3 size={18} /> Utilization
                </button>
                <button
                    className={activeTab === 'sensors' ? 'active' : ''}
                    onClick={() => setActiveTab('sensors')}
                >
                    <Thermometer size={18} /> Sensors & Violations
                </button>
                <button
                    className={activeTab === 'alerts' ? 'active' : ''}
                    onClick={() => setActiveTab('alerts')}
                >
                    <AlertTriangle size={18} /> Alerts
                </button>
            </div>

            {/* Filters (Conditional based on tab) */}
            {(activeTab === 'sensors' || activeTab === 'alerts') && (
                <div className="filters-bar">
                    <div className="filter-group">
                        <label>Rack ID</label>
                        <input
                            type="number"
                            placeholder="All Racks"
                            value={rackIdFilter}
                            onChange={e => setRackIdFilter(e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <label>From Date</label>
                        <input
                            type="datetime-local"
                            value={fromDate}
                            onChange={e => setFromDate(e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <label>To Date</label>
                        <input
                            type="datetime-local"
                            value={toDate}
                            onChange={e => setToDate(e.target.value)}
                        />
                    </div>
                    <button className="refresh-btn" onClick={handleFetchData}>
                        <RefreshCw size={16} /> Refresh
                    </button>
                </div>
            )}

            {/* Content Switch */}
            {isLoading ? (
                <div className="loading-overlay">Loading report data...</div>
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
