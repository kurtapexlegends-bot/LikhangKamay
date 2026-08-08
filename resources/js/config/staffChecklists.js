export const staffChecklistPresets = {
    hr: [
        { id: '1', text: 'Clock in for your shift schedule', completed: true },
        { id: '2', text: 'Review employee attendance records', completed: false },
        { id: '3', text: 'Check pending payroll approvals', completed: false },
    ],
    accounting: [
        { id: '1', text: 'Clock in for your shift schedule', completed: true },
        { id: '2', text: 'Inspect base fund release requests', completed: false },
        { id: '3', text: 'Audit recent payroll release log ledger', completed: false },
    ],
    procurement: [
        { id: '1', text: 'Clock in for your shift schedule', completed: true },
        { id: '2', text: 'Check low-stock supply alert logs', completed: false },
        { id: '3', text: 'Review incoming stock request documents', completed: false },
    ],
    default: [
        { id: '1', text: 'Clock in for your shift schedule', completed: true },
        { id: '2', text: 'Review open active customer orders', completed: false },
        { id: '3', text: 'Respond to new message tickets', completed: false },
    ],
};

export function getDefaultChecklistForVariant(variant) {
    return staffChecklistPresets[variant] || staffChecklistPresets.default;
}
