export interface StaffMember {
    id: string;
    name: string;
    email: string;
    role: string;
    status: "active" | "break" | "offline";
}