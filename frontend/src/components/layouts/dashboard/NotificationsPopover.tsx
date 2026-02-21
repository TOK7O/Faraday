import { useState, useEffect, useCallback } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Bell, Info, AlertTriangle } from "lucide-react";
import "./NotificationsPopover.scss";
import { getActiveAlerts } from "@/api/axios";

const NotificationsPopover = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      const data = await getActiveAlerts();
      const alertsArray = Array.isArray(data) ? data : data.alerts || [];

      setAlerts(alertsArray);
    } catch (error) {
      console.error("Błąd powiadomień:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();

    const REFRESH_INTERVAL = 30000;
    const intervalId = setInterval(fetchAlerts, REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [fetchAlerts]);

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="action-btn" aria-label="Notifications">
          <Bell size={18} />
          {alerts.length > 0 && <span className="dot-alert"></span>}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content className="popover-content" sideOffset={10}>
          <div className="popover-header">
            <h3>Powiadomienia</h3>
            <span className="count">{alerts.length}</span>
          </div>

          <div className="notification-list">
            {loading && alerts.length === 0 ? (
              <div className="status-msg">Ładowanie...</div>
            ) : alerts.length > 0 ? (
              alerts.map((alert, index) => (
                <div
                  key={alert.id || index}
                  className={`notification-item ${alert.read ? "" : "unread"}`}
                >
                  {alert.type === "warning" ? (
                    <AlertTriangle size={16} className="notif-icon error" />
                  ) : (
                    <Info size={16} className="notif-icon" />
                  )}
                  <div className="notif-text">
                    <p>{alert.message}</p>
                    <span>{alert.time || "Przed chwilą"}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="status-msg">Brak nowych powiadomień</div>
            )}
          </div>
          <Popover.Arrow className="popover-arrow" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

export default NotificationsPopover;
