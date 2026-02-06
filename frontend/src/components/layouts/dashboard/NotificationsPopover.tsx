import * as Popover from "@radix-ui/react-popover";
import { Bell, Info, Package } from "lucide-react";
import "./NotificationsPopover.scss";

const NotificationsPopover = () => {
    return (
        <Popover.Root>
            <Popover.Trigger asChild>
                <button className="action-btn" aria-label="Notifications">
                    <Bell size={18} />
                    <span className="dot-alert"></span>
                </button>
            </Popover.Trigger>

            <Popover.Portal>
                <Popover.Content className="popover-content" sideOffset={10}>
                    <div className="popover-header">
                        <h3>Powiadomienia</h3>
                        <span className="count">2 nowe</span>
                    </div>

                    <div className="notification-list">
                        <div className="notification-item unread">
                            <Info size={16} className="notif-icon" />
                            <div className="notif-text">
                                <p>Wykryto nową operację w sektorze B-12</p>
                                <span>Przed chwilą</span>
                            </div>
                        </div>

                        <div className="notification-item">
                            <Package size={16} className="notif-icon" />
                            <div className="notif-text">
                                <p>Zaktualizowano stan inwentarza</p>
                                <span>2 godz. temu</span>
                            </div>
                        </div>
                    </div>

                    <Popover.Arrow className="popover-arrow" />
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
};

export default NotificationsPopover;