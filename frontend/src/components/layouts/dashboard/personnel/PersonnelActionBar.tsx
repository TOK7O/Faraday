import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@radix-ui/react-select";
import {
    Search, Plus, X, User, Mail, Briefcase,
    Fingerprint, ChevronDown, Check
} from "lucide-react";
import "./PersonnelActionBar.scss";
import { useTranslation } from "@/context/LanguageContext";

interface ActionBarProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    isModalOpen: boolean;
    setIsModalOpen: (open: boolean) => void;
}

export const PersonnelActionBar = ({
                                       searchQuery,
                                       setSearchQuery,
                                       isModalOpen,
                                       setIsModalOpen
                                   }: ActionBarProps) => {
    const { t } = useTranslation();
    const persT = t.dashboardPage.content.personnel;

    return (
        <div className="action-bar">
            {/* WYSZUKIWARKA */}
            <div className="search-container">
                <Search size={18} className="search-icon" />
                <input
                    type="text"
                    placeholder={persT.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* MODAL REJESTRACJI */}
            <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
                <Dialog.Trigger asChild>
                    <button className="btn-primary-ht">
                        <Plus size={18} />
                        <span>{persT.registerOperator}</span>
                    </button>
                </Dialog.Trigger>

                <Dialog.Portal>
                    <Dialog.Overlay className="dialog-overlay-ht" />
                    <Dialog.Content className="dialog-content-ht">
                        <div className="modal-accent-line" />

                        <div className="modal-header">
                            <Dialog.Title asChild>
                                <h2>{persT.authOperator}</h2>
                            </Dialog.Title>
                            <Dialog.Close asChild>
                                <button className="btn-close"><X size={20} /></button>
                            </Dialog.Close>
                        </div>

                        <form className="ht-form" onSubmit={(e) => e.preventDefault()}>
                            <div className="input-group">
                                <label><User size={14} /> {persT.fullName}</label>
                                <input type="text" placeholder={persT.fullNamePlaceholder} required />
                            </div>

                            <div className="input-group">
                                <label><Mail size={14} /> {persT.systemEmail}</label>
                                <input type="email" placeholder={persT.emailPlaceholder} required />
                            </div>

                            <div className="input-row">
                                <div className="input-group">
                                    <label><Briefcase size={14} /> {persT.sectorRole}</label>
                                    <Select.Root defaultValue="operator">
                                        <Select.Trigger className="ht-select-trigger">
                                            <Select.Value />
                                            <Select.Icon className="select-chevron">
                                                <ChevronDown size={14} />
                                            </Select.Icon>
                                        </Select.Trigger>

                                        <Select.Portal>
                                            <Select.Content className="ht-select-content" position="popper" sideOffset={5}>
                                                <Select.Viewport className="ht-select-viewport">
                                                    <Select.Item className="ht-select-item" value="operator">
                                                        <Select.ItemText>{persT.roles.operator}</Select.ItemText>
                                                        <Select.ItemIndicator><Check size={14}/></Select.ItemIndicator>
                                                    </Select.Item>
                                                    <Select.Item className="ht-select-item" value="manager">
                                                        <Select.ItemText>{persT.roles.manager}</Select.ItemText>
                                                        <Select.ItemIndicator><Check size={14}/></Select.ItemIndicator>
                                                    </Select.Item>
                                                    <Select.Item className="ht-select-item" value="admin">
                                                        <Select.ItemText>{persT.roles.admin}</Select.ItemText>
                                                        <Select.ItemIndicator><Check size={14}/></Select.ItemIndicator>
                                                    </Select.Item>
                                                </Select.Viewport>
                                            </Select.Content>
                                        </Select.Portal>
                                    </Select.Root>
                                </div>

                                <div className="input-group">
                                    <label><Fingerprint size={14} /> {persT.securityId}</label>
                                    <input type="text" placeholder={persT.securityIdPlaceholder} required />
                                </div>
                            </div>

                            <button type="submit" className="btn-submit-ht">
                                {persT.confirmAuth}
                            </button>
                        </form>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </div>
    );
};