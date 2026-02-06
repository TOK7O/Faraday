import { Activity, ShieldCheck, ArrowUpRight } from "lucide-react";
import { useTranslation } from "../../../context/LanguageContext.tsx";

const OverviewContent = () => {
  const { t } = useTranslation();

  return (
    <div className="bento-dashboard">
      <div className="bento-card large">
        <div className="card-header">
          <Activity size={16} /> {t.dashboardPage.content.overview.throughput}
        </div>
        <div className="card-body">
          <h2>
            142.8 <small>ops/m</small>
          </h2>
          <div className="mini-graph">
            {[30, 50, 40, 80, 60, 90, 70].map((h, i) => (
              <div key={i} className="bar" style={{ height: `${h}%` }}></div>
            ))}
          </div>
        </div>
      </div>
      <div className="bento-card gray">
        <div className="card-header">
          {t.dashboardPage.content.overview.warehouseLoad}
        </div>
        <div className="circle-progress">84%</div>
      </div>
      <div className="bento-card accent">
        <ShieldCheck size={20} />
        <p>{t.dashboardPage.content.overview.securityProtocol}</p>
        <ArrowUpRight size={16} className="corner-icon" />
      </div>
    </div>
  );
};
export default OverviewContent;
