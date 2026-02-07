import { useState, useMemo } from "react";
import { PersonnelHeader } from "@/components/layouts/dashboard/personnel/PersonnelHeader";
import { PersonnelStats } from "@/components/layouts/dashboard/personnel/PersonnelStats";
import { PersonnelActionBar } from "@/components/layouts/dashboard/personnel/PersonnelActionBar";
import { StaffTable } from "@/components/layouts/dashboard/personnel/StaffTable";
import type {StaffMember} from "@/components/layouts/dashboard/personnel/types";
import "./PersonnelContent.scss";

const INITIAL_STAFF: StaffMember[] = [
    { id: "STAFF-01", name: "Jan Kowalski", email: "j.kowalski@faraday.systems", role: "Warehouse Manager", status: "active" },
    { id: "STAFF-02", name: "Anna Nowak", email: "a.nowak@faraday.systems", role: "Forklift Operator", status: "break" },
    { id: "STAFF-03", name: "Marek Zima", email: "m.zima@faraday.systems", role: "Logistics Specialist", status: "offline" },
];

const PersonnelContent = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [staff] = useState<StaffMember[]>(INITIAL_STAFF);

    const filteredStaff = useMemo(() => {
        return staff.filter(person =>
            person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            person.id.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery, staff]);

    return (
        <div className="personnel-view-container">
            <PersonnelHeader />
            <PersonnelStats staff={staff} />
            <PersonnelActionBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                isModalOpen={isAddModalOpen}
                setIsModalOpen={setIsAddModalOpen}
            />
            <StaffTable staff={filteredStaff} />
        </div>
    );
};

export default PersonnelContent;