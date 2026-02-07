import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@radix-ui/react-select";
import {
    Search, Plus, X, User, Mail, Briefcase,
    Fingerprint, ChevronDown, Check
} from "lucide-react";
import "./PersonnelActionBar.scss";

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
    return (
        <div className="action-bar">
            {/* WYSZUKIWARKA */}
            <div className="search-container">
                <Search size={18} className="search-icon" />
                <input
                    type="text"
                    placeholder="Filtruj po ID lub nazwisku..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* MODAL REJESTRACJI */}
            <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
                <Dialog.Trigger asChild>
                    <button className="btn-primary-ht">
                        <Plus size={18} />
                        <span>Zarejestruj Operatora</span>
                    </button>
                </Dialog.Trigger>

                <Dialog.Portal>
                    <Dialog.Overlay className="dialog-overlay-ht" />
                    <Dialog.Content className="dialog-content-ht">
                        <div className="modal-accent-line" />

                        <div className="modal-header">
                            <Dialog.Title asChild>
                                <h2>Autoryzacja Operatora</h2>
                            </Dialog.Title>
                            <Dialog.Close asChild>
                                <button className="btn-close"><X size={20} /></button>
                            </Dialog.Close>
                        </div>

                        <form className="ht-form" onSubmit={(e) => e.preventDefault()}>
                            <div className="input-group">
                                <label><User size={14} /> Pełne Imię i Nazwisko</label>
                                <input type="text" placeholder="np. Jan Kowalski" required />
                            </div>

                            <div className="input-group">
                                <label><Mail size={14} /> Email Systemowy</label>
                                <input type="email" placeholder="j.kowalski@magazyn.pl" required />
                            </div>

                            <div className="input-row">
                                <div className="input-group">
                                    <label><Briefcase size={14} /> Rola w Sektorze</label>
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
                                                        <Select.ItemText>Operator Magazynu</Select.ItemText>
                                                        <Select.ItemIndicator><Check size={14}/></Select.ItemIndicator>
                                                    </Select.Item>
                                                    <Select.Item className="ht-select-item" value="manager">
                                                        <Select.ItemText>Kierownik Zmiany</Select.ItemText>
                                                        <Select.ItemIndicator><Check size={14}/></Select.ItemIndicator>
                                                    </Select.Item>
                                                    <Select.Item className="ht-select-item" value="admin">
                                                        <Select.ItemText>Administrator Systemu</Select.ItemText>
                                                        <Select.ItemIndicator><Check size={14}/></Select.ItemIndicator>
                                                    </Select.Item>
                                                </Select.Viewport>
                                            </Select.Content>
                                        </Select.Portal>
                                    </Select.Root>
                                </div>

                                <div className="input-group">
                                    <label><Fingerprint size={14} /> ID Bezpieczeństwa</label>
                                    <input type="text" placeholder="FS-XXXX" required />
                                </div>
                            </div>

                            <button type="submit" className="btn-submit-ht">
                                Potwierdź i Autoryzuj
                            </button>
                        </form>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </div>
    );
};