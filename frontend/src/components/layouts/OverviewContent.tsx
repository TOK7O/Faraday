import { Activity, ShieldCheck, ArrowUpRight } from "lucide-react";

const OverviewContent = () => {
  return (
    <div className="bento-dashboard">
      <div className="bento-card large">
        <div className="card-header">
          <Activity size={16} /> Real-time Throughput
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
        <div className="card-header">Warehouse Load</div>
        <div className="circle-progress">84%</div>
      </div>
      <div className="bento-card accent">
        <ShieldCheck size={20} />
        <p>Security Protocol Active</p>
        <ArrowUpRight size={16} className="corner-icon" />
      </div>
    </div>
  );
};
export default OverviewContent;
