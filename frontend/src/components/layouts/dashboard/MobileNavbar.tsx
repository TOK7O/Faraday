import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import Sidebar from "@/components/layouts/dashboard/Sidebar";
import { Link } from "react-router-dom";

const MobileNavbar = () => (
  <div className="mobile-interface">
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className="hamburger-btn">
          <Menu size={18} />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-sidebar-content">
          <div className="sidebar-header-mobile">
            <div className="sidebar-logo">
              <Link to="/">
                <span>
                  Faraday<span>Systems</span>
                </span>
              </Link>
            </div>
            <Dialog.Close asChild>
              <button className="close-btn">
                <X size={24} />
              </button>
            </Dialog.Close>
          </div>
          <Sidebar />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </div>
);

export default MobileNavbar;
