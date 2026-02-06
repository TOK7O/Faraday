import { useTranslation } from "../../../context/LanguageContext";
import "./InventoryContent.scss";

const InventoryContent = () => {
  const { t } = useTranslation();

  return (
    <div className="inventory-view">
      <div className="view-header">
        <h2>{t.dashboardPage.content.inventory.title}</h2>
        <p>{t.dashboardPage.content.inventory.subtitle}</p>
      </div>
      <div className="rack-grid-container">
        <div className="rack-preview-card">
          <div className="rack-info">
            <h3>{t.dashboardPage.content.inventory.rack} R-01</h3>
            <span>
              {t.dashboardPage.content.inventory.dimensions}: 5 x 10 |{" "}
              {t.dashboardPage.content.inventory.temp}: 0 - 5°C
            </span>
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
