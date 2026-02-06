const InventoryContent = () => {
  return (
    <div className="inventory-view">
      <div className="view-header">
        <h2>System Inwentaryzacji (M x N)</h2>
        <p>Zarządzanie regałami zgodnie z zasadą FIFO</p>
      </div>
      <div className="rack-grid-container">
        <div className="rack-preview-card">
          <div className="rack-info">
            <h3>Regał R-01</h3>
            <span>Wymiary: 5 x 10 | Temp: 0 - 5°C</span>
          </div>
          <div className="slots-grid">
            {Array.from({ length: 50 }).map((_, i) => (
              <div key={i} className="slot-pixel" title={`Slot ${i + 1}`}></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryContent;
