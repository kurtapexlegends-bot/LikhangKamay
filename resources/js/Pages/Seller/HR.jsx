import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import SellerSidebar from '@/Components/SellerSidebar';
import Modal from '@/Components/Modal';
import Dropdown from '@/Components/Dropdown';
import NotificationDropdown from '@/Components/NotificationDropdown';
import { 
    Users, UserPlus, Trash2, ChevronDown, User, LogOut,
    Briefcase, Building2, Search, Menu, Banknote, Settings as SettingsIcon, X, Edit
} from 'lucide-react';
import { useToast } from '@/Components/ToastContext';

export default function HR({ auth, staff = [], payrolls = [] }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const { addToast } = useToast();
    
    // Overtime Rate Settings Modal
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const { data: settingsData, setData: setSettingsData, post: postSettings, processing: settingsProcessing } = useForm({
        overtime_rate: auth.user.overtime_rate || 50.00,
        payroll_working_days: auth.user.payroll_working_days || 22,
    });

    const submitSettings = (e) => {
        e.preventDefault();
        postSettings(route('hr.settings'), {
            onSuccess: () => {
                setIsSettingsOpen(false);
                addToast('Payroll settings updated successfully', 'success');
            }
        });
    };

    // FORM: Simple "Dummy Account" creation
    const { data, setData, post, processing, reset, errors } = useForm({
        name: '',
        role: 'Potter',
        salary: ''
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('hr.store'), {
            onSuccess: () => {
                setIsModalOpen(false);
                reset();
                addToast('New staff member added', 'success');
            }
        });
    };

    const deleteEmployee = (id) => {
        if(confirm('Remove this employee? This will stop their payroll calculation.')) {
            router.delete(route('hr.destroy', id), {
                onSuccess: () => addToast('Employee removed', 'success')
            });
        }
    };

    // Filter Logic for the Table
    const filteredStaff = staff.filter(emp => 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // PAYROLL FORM
    const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
    const { data: payrollData, setData: setPayrollData, post: postPayroll, processing: payrollProcessing, reset: resetPayroll, transform: transformPayroll } = useForm({
        month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
        items: []
    });

    const openPayrollModal = () => {
        // Initialize items with active staff
        const initialItems = staff.map(emp => ({
            employee_id: emp.id,
            name: emp.name,
            salary: Number(emp.salary),
            absences_days: 0,
            undertime_hours: 0,
            overtime_hours: 0,
            isSelected: true
        }));
        setPayrollData('items', initialItems);
        setIsPayrollModalOpen(true);
    };

    const updatePayrollItem = (index, field, value) => {
        const newItems = [...payrollData.items];
        newItems[index][field] = value;
        setPayrollData('items', newItems);
    };

    const submitPayroll = (e) => {
        e.preventDefault();
        
        const selectedItems = payrollData.items.filter(i => i.isSelected);
        if (selectedItems.length === 0) {
            addToast("Please select at least one employee.", "error");
            return;
        }

        transformPayroll((data) => ({
            month: data.month,
            items: data.items.filter(i => i.isSelected).map(i => ({
                ...i,
                absences_days: i.absences_days || 0,
                undertime_hours: i.undertime_hours || 0,
                overtime_hours: i.overtime_hours || 0
            }))
        }));

        postPayroll(route('hr.generate'), {
            onSuccess: () => {
                setIsPayrollModalOpen(false);
                resetPayroll();
                addToast("Payroll generated successfully", "success");
            }
        });
    };

    const deletePayroll = (id) => {
        if(confirm('Are you sure you want to delete this payroll request?')) {
            router.delete(route('hr.payroll.destroy', id), {
                onSuccess: () => addToast('Payroll request deleted', 'success')
            });
        }
    };

    // Helper to calculate estimated net pay for preview
    const calculateNetPay = (item) => {
        const workingDays = auth.user.payroll_working_days || 22;
        const dailyRate = item.salary / workingDays;
        const hourlyRate = dailyRate / 8;
        const otRate = auth.user.overtime_rate || 50; 
        
        const otPay = (Number(item.overtime_hours) || 0) * otRate;
        const absenceDeduction = (Number(item.absences_days) || 0) * dailyRate;
        const undertimeDeduction = (Number(item.undertime_hours) || 0) * hourlyRate;
        
        let net = item.salary + otPay - absenceDeduction - undertimeDeduction;
        return net > 0 ? net : 0;
    };

    return (
        <div className="min-h-screen bg-[#FDFBF9] flex font-sans text-gray-800">
            <Head title="HR Management" />
            
            {/* SIDEBAR */}
            <SellerSidebar active="hr" user={auth.user} mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col min-w-0 lg:ml-56 transition-all duration-300">
                
                {/* --- HEADER (Standardized) --- */}
                <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-40">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-clay-600">
                            <Menu size={24} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-gray-900">Human Resources</h1>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-900 text-[10px] font-bold uppercase tracking-wider text-gray-300">
                                    <Building2 size={10} className="text-clay-400" /> Enterprise
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 font-medium mt-0.5 hidden sm:block">Manage your team list</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Actions */}
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setIsSettingsOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition transform active:scale-95"
                                title="Payroll Settings"
                            >
                                <SettingsIcon size={16} />
                            </button>
                            <button 
                                onClick={openPayrollModal}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-green-200 hover:bg-green-700 transition transform active:scale-95"
                            >
                                <Banknote size={16} /> Generate Payroll
                            </button>
                            <button 
                                onClick={() => setIsModalOpen(true)} 
                                className="flex items-center gap-2 px-4 py-2 bg-clay-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-clay-200 hover:bg-clay-700 transition transform active:scale-95"
                            >
                                <UserPlus size={16} /> Add Employee
                            </button>
                            <NotificationDropdown />
                        </div>

                        {/* Divider */}
                        <div className="h-8 w-px bg-gray-200"></div>

                        {/* Profile Dropdown (Fixed Layout) */}
                        <div className="relative">
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <span className="inline-flex rounded-md">
                                        <button type="button" className="inline-flex items-center gap-3 px-1 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-transparent hover:text-gray-700 focus:outline-none transition ease-in-out duration-150">
                                            <div className="text-right hidden sm:block">
                                                <p className="text-sm font-bold text-gray-900">{auth.user.shop_name || auth.user.name}</p>
                                                <p className="text-[10px] text-gray-500">Seller Account</p>
                                            </div>
                                            <div className="w-9 h-9 rounded-full bg-clay-100 flex items-center justify-center text-clay-700 font-bold border border-clay-200 uppercase overflow-hidden">
                                                {auth.user.avatar ? (
                                                    <img 
                                                        src={auth.user.avatar.startsWith('http') ? auth.user.avatar : `/storage/${auth.user.avatar}`} 
                                                        alt={auth.user.name} 
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    (auth.user.shop_name || auth.user.name).charAt(0)
                                                )}
                                            </div>
                                            <ChevronDown size={16} className="text-gray-400" />
                                        </button>
                                    </span>
                                </Dropdown.Trigger>

                                <Dropdown.Content>
                                    <Dropdown.Link href={route('profile.edit')} className="flex items-center gap-2">
                                        <User size={16} /> Profile
                                    </Dropdown.Link>
                                    <Dropdown.Link href={route('logout')} method="post" as="button" className="flex items-center gap-2 text-red-600 hover:text-red-700">
                                        <LogOut size={16} /> Log Out
                                    </Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>
                    </div>
                </header>

                <main className="p-6 space-y-6">


                    {/* KPI CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Active Staff</p>
                                <h3 className="text-2xl font-bold text-gray-900 mt-1">{staff.length}</h3>
                            </div>
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                                <Users size={20} />
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Est. Monthly Payroll</p>
                                <h3 className="text-2xl font-bold text-gray-900 mt-1">₱{staff.reduce((acc, curr) => acc + Number(curr.salary), 0).toLocaleString()}</h3>
                            </div>
                            <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                                <Briefcase size={20} />
                            </div>
                        </div>
                    </div>

                    {/* EMPLOYEE LIST TABLE */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                        
                        {/* Table Header / Toolbar */}
                        <div className="p-4 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/30">
                            <h3 className="font-bold text-gray-900 text-base">Employee Directory</h3>
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input 
                                    type="text" 
                                    placeholder="Search name or role..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-clay-500 focus:border-clay-500 transition-shadow"
                                />
                                {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={12} /></button>}
                            </div>
                        </div>

                        {/* Table Body */}
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-5 py-3">Employee Name</th>
                                        <th className="px-5 py-3">Position / Role</th>
                                        <th className="px-5 py-3">Monthly Salary</th>
                                        <th className="px-5 py-3">Status</th>
                                        <th className="px-5 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredStaff.length > 0 ? (
                                        filteredStaff.map((emp) => (
                                            <tr key={emp.id} className="hover:bg-gray-50/50 transition duration-150">
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-clay-100 flex items-center justify-center text-clay-700 font-bold border border-clay-200 text-xs">
                                                            {emp.name.charAt(0)}
                                                        </div>
                                                        <span className="font-bold text-gray-900 text-sm">{emp.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 text-xs text-gray-600 font-medium">{emp.role}</td>
                                                <td className="px-5 py-3 font-bold text-gray-900 text-sm">₱{Number(emp.salary).toLocaleString()}</td>
                                                <td className="px-5 py-3">
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Active
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <div className="flex justify-end gap-1.5">
                                                        <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition" title="Edit Data">
                                                            <Edit size={14} />
                                                        </button>
                                                        <button onClick={() => deleteEmployee(emp.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition" title="Remove Employee">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-20 text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                                                        <Users size={32} className="text-gray-300" />
                                                    </div>
                                                    <h3 className="text-lg font-bold text-gray-900 mb-1">No Staff Found</h3>
                                                    <p className="text-sm text-gray-500 mb-6">Start by adding your first employee to the list.</p>
                                                    <button onClick={() => setIsModalOpen(true)} className="text-clay-600 font-bold hover:underline text-sm">Create New Record</button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* PAYROLL HISTORY TABLE */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col mt-8">
                        <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                            <h3 className="font-bold text-gray-900 text-base">Payroll Requests History</h3>
                        </div>
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-5 py-3">Month</th>
                                        <th className="px-5 py-3 text-center">Employees</th>
                                        <th className="px-5 py-3 text-right">Total Amount</th>
                                        <th className="px-5 py-3 text-center">Status</th>
                                        <th className="px-5 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {payrolls.data && payrolls.data.length > 0 ? (
                                        payrolls.data.map((payroll) => (
                                            <tr key={payroll.id} className="hover:bg-gray-50/50 transition duration-150 relative">
                                                <td className="px-5 py-4 font-bold text-gray-900 text-sm">
                                                    {payroll.month}
                                                    {payroll.status === 'Rejected' && payroll.rejection_reason && (
                                                        <div className="mt-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded inline-block">
                                                            Reason: {payroll.rejection_reason}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4 text-center font-bold text-gray-600">
                                                    {payroll.employee_count}
                                                </td>
                                                <td className="px-5 py-4 text-right font-bold text-gray-900">
                                                    ₱{Number(payroll.total_amount).toLocaleString()}
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold ${
                                                        payroll.status === 'Paid' ? 'bg-green-100 text-green-700' :
                                                        payroll.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                                        'bg-amber-100 text-amber-700'
                                                    }`}>
                                                        {payroll.status}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    {['Pending', 'Rejected'].includes(payroll.status) ? (
                                                        <button 
                                                            onClick={() => deletePayroll(payroll.id)} 
                                                            className="text-red-500 hover:text-red-700 font-bold text-xs bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition"
                                                        >
                                                            Delete Request
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs italic">Locked</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-10 text-center text-gray-500 text-sm">
                                                No payroll requests generated yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Pagination Component */}
                        {payrolls.links && payrolls.links.length > 3 && (
                            <div className="px-6 py-4 flex items-center justify-between border-t border-gray-100 bg-gray-50/30">
                                <div className="text-xs text-gray-500 font-medium">
                                    Showing <span className="font-bold text-gray-900">{payrolls.from || 0}</span> to <span className="font-bold text-gray-900">{payrolls.to || 0}</span> of <span className="font-bold text-gray-900">{payrolls.total}</span> entries
                                </div>
                                <div className="flex gap-1">
                                    {payrolls.links.map((link, i) => (
                                        <button
                                            key={i}
                                            disabled={!link.url || link.active}
                                            onClick={() => router.get(link.url)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                link.active 
                                                    ? 'bg-clay-600 text-white shadow-md shadow-clay-200' 
                                                    : !link.url 
                                                        ? 'bg-gray-50 text-gray-300 cursor-not-allowed' 
                                                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                            }`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* ADD EMPLOYEE MODAL */}
            <Modal show={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="md">
                <form onSubmit={submit} className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Add New Staff</h2>
                        <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Employee Name</label>
                            <input 
                                type="text" 
                                className="w-full border-gray-300 rounded-xl focus:border-clay-500 focus:ring-clay-500 shadow-sm transition" 
                                placeholder="e.g. Juan Dela Cruz"
                                value={data.name} 
                                onChange={e => setData('name', e.target.value)} 
                                required 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Position / Role</label>
                            <select 
                                className="w-full border-gray-300 rounded-xl focus:border-clay-500 focus:ring-clay-500 shadow-sm transition" 
                                value={data.role} 
                                onChange={e => setData('role', e.target.value)}
                            >
                                <option>Potter</option>
                                <option>Assistant</option>
                                <option>Packer</option>
                                <option>Logistics / Driver</option>
                                <option>Artist</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Monthly Salary (₱)</label>
                            <input 
                                type="number" 
                                className="w-full border-gray-300 rounded-xl focus:border-clay-500 focus:ring-clay-500 shadow-sm transition" 
                                placeholder="e.g. 15000"
                                value={data.salary} 
                                onChange={e => setData('salary', e.target.value)} 
                                required 
                            />
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-50 rounded-lg transition">Cancel</button>
                        <button type="submit" disabled={processing} className="px-6 py-2 bg-clay-600 text-white rounded-xl font-bold hover:bg-clay-700 transition shadow-lg shadow-clay-200">
                            Save Record
                        </button>
                    </div>
                </form>
            </Modal>

            {/* PAYROLL MODAL (NEW) */}
            <Modal show={isPayrollModalOpen} onClose={() => setIsPayrollModalOpen(false)} maxWidth="5xl">
                <form onSubmit={submitPayroll} className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Generate Payroll</h2>
                            <p className="text-sm text-gray-500">Period: {payrollData.month} (Standard {auth.user.payroll_working_days || 22} Days/Month) • Fixed OT Rate: ₱{auth.user.overtime_rate || 50}/hr</p>
                        </div>
                        <button type="button" onClick={() => setIsPayrollModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                    </div>

                    <div className="overflow-x-auto border border-gray-200 rounded-xl mb-6">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 font-bold text-gray-500 uppercase">
                                <tr>
                                    <th className="px-4 py-3 w-10 text-center border-r border-gray-100">Pay</th>
                                    <th className="px-4 py-3">Employee</th>
                                    <th className="px-4 py-3">Base Salary</th>
                                    <th className="px-4 py-3 w-28 bg-red-50/50 text-red-700" title="Deductions per day (Standard 8-hr shift). Reduces total days worked by 22.">Absences (Days)</th>
                                    <th className="px-4 py-3 w-28 bg-orange-50/50 text-orange-700" title="Deductions per hour. Reduces gross salary based on hourly rate.">Undertime (Hrs)</th>
                                    <th className="px-4 py-3 w-28 bg-green-50/50 text-green-700" title={`Fixed Rate: ₱${auth.user.overtime_rate || 50}/hour`}>Overtime (Hrs)</th>
                                    <th className="px-4 py-3 text-right">Net Pay (Est)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {payrollData.items.map((item, index) => (
                                    <tr key={item.employee_id} className={`hover:bg-gray-50 transition ${!item.isSelected && 'opacity-50 grayscale'}`}>
                                        <td className="px-4 py-3 text-center border-r border-gray-100">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 text-clay-600 rounded border-gray-300 focus:ring-clay-500 cursor-pointer"
                                                checked={item.isSelected}
                                                onChange={(e) => updatePayrollItem(index, 'isSelected', e.target.checked)}
                                            />
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                                        <td className="px-4 py-3 text-gray-500 drop-shadow-sm font-semibold">₱{item.salary.toLocaleString()}</td>
                                        
                                        <td className="px-4 py-3 bg-red-50/20">
                                            <input 
                                                type="number" 
                                                className="w-full border-red-200 bg-white shadow-inner rounded-lg text-sm p-1.5 focus:border-red-500 focus:ring-red-500 text-red-900 font-medium"
                                                value={item.absences_days ?? ''}
                                                disabled={!item.isSelected}
                                                onChange={(e) => updatePayrollItem(index, 'absences_days', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                                min="0" max="31" step="0.5"
                                            />
                                        </td>
                                        <td className="px-4 py-3 bg-orange-50/20">
                                            <input 
                                                type="number" 
                                                className="w-full border-orange-200 bg-white shadow-inner rounded-lg text-sm p-1.5 focus:border-orange-500 focus:ring-orange-500 text-orange-900 font-medium"
                                                value={item.undertime_hours ?? ''}
                                                disabled={!item.isSelected}
                                                onChange={(e) => updatePayrollItem(index, 'undertime_hours', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                                min="0" step="0.5"
                                            />
                                        </td>
                                        <td className="px-4 py-3 bg-green-50/20">
                                            <input 
                                                type="number" 
                                                className="w-full border-green-200 bg-white shadow-inner rounded-lg text-sm p-1.5 focus:border-green-500 focus:ring-green-500 text-green-900 font-medium"
                                                value={item.overtime_hours ?? ''}
                                                disabled={!item.isSelected}
                                                onChange={(e) => updatePayrollItem(index, 'overtime_hours', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                                min="0" step="0.5"
                                            />
                                        </td>

                                        <td className="px-4 py-3 text-right font-bold text-gray-900">
                                            {item.isSelected ? `₱${calculateNetPay(item).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₱0.00'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl">
                        <span className="text-gray-500 font-medium">Selected For Payment: {payrollData.items.filter(i => i.isSelected).length}</span>
                        <div className="text-right">
                            <span className="text-gray-500 font-medium mr-3">Total Payroll Estimate:</span>
                            <span className="text-2xl font-bold text-gray-900">
                                ₱{payrollData.items.filter(i => i.isSelected).reduce((acc, item) => acc + calculateNetPay(item), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button type="button" onClick={() => setIsPayrollModalOpen(false)} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-50 rounded-lg transition">Cancel</button>
                        <button type="submit" disabled={payrollProcessing || payrollData.items.filter(i => i.isSelected).length === 0} className="disabled:opacity-50 px-6 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition shadow-lg shadow-green-200">
                            Request Pay
                        </button>
                    </div>
                </form>
            </Modal>

            {/* PAYROLL SETTINGS MODAL */}
            <Modal show={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} maxWidth="sm">
                <form onSubmit={submitSettings} className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Payroll Settings</h2>
                        <button type="button" onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Fixed Overtime Rate (₱/hr)</label>
                            <input 
                                type="number" 
                                className="w-full border-gray-300 rounded-xl focus:border-clay-500 focus:ring-clay-500 shadow-sm transition" 
                                value={settingsData.overtime_rate ?? ''} 
                                onChange={e => setSettingsData('overtime_rate', e.target.value)} 
                                required min="0" step="any"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Standard Work Days / Month</label>
                            <input 
                                type="number" 
                                className="w-full border-gray-300 rounded-xl focus:border-clay-500 focus:ring-clay-500 shadow-sm transition" 
                                value={settingsData.payroll_working_days ?? ''} 
                                onChange={e => setSettingsData('payroll_working_days', e.target.value)} 
                                required min="1" max="31"
                            />
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button type="button" onClick={() => setIsSettingsOpen(false)} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-50 rounded-lg transition">Cancel</button>
                        <button type="submit" disabled={settingsProcessing} className="px-6 py-2 bg-clay-600 text-white rounded-xl font-bold hover:bg-clay-700 transition shadow-lg shadow-clay-200">
                            Save Settings
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}