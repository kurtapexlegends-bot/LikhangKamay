import React from 'react';
import { Settings, X, Users, Banknote, Warehouse } from 'lucide-react';
import ModuleToggle from './ModuleToggle';

export default function SidebarSettingsPopover({
    showGear,
    showModulePanel,
    setShowModulePanel,
    showGearHint,
    dismissGearHint,
    activeModuleCount,
    isElite,
    modules,
    toggleModule
}) {
    if (!showGear) return null;

    return (
        <div className="hidden lg:block ml-auto relative">
            <button 
                onClick={() => {
                    setShowModulePanel(!showModulePanel);
                    if (showGearHint) dismissGearHint();
                }}
                aria-label={showModulePanel ? 'Hide module settings' : 'Show module settings'}
                className={`relative rounded-lg p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30 ${showModulePanel ? 'bg-clay-600 text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-clay-600'}`}
                title="Enable Capabilities"
            >
                <Settings size={14} />
                {activeModuleCount > 0 && !showModulePanel && (
                    <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] bg-clay-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                        {activeModuleCount}
                    </span>
                )}
            </button>

            {showGearHint && (
                <div className="absolute right-0 top-8 z-[80] w-44 rounded-lg bg-gray-900 p-2 text-[10px] font-medium text-white">
                    Use this gear to enable extra capabilities.
                    <button
                        onClick={dismissGearHint}
                        aria-label="Dismiss module settings hint"
                        className="block mt-1.5 text-[9px] text-gray-300 hover:text-white"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {showModulePanel && (
                <>
                    <div 
                        className="fixed inset-0 z-[60]" 
                        onClick={() => setShowModulePanel(false)}
                    />
                    
                    <div className="absolute left-2 right-2 top-16 z-[70] rounded-2xl border border-gray-100 bg-white p-5 lg:left-full lg:right-auto lg:top-4 lg:ml-4 lg:w-72 text-left">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">Enable Capabilities</h3>
                                <p className="text-[10px] text-gray-400 font-medium">Turn additional capabilities on for your shop.</p>
                            </div>
                            <button 
                                onClick={() => setShowModulePanel(false)}
                                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        
                        <div className="space-y-2">
                            <ModuleToggle 
                                label="People & Payroll" 
                                description={isElite ? "Always enabled in Elite." : "Manage employees, payroll prep, and workspace access."}
                                icon={Users}
                                enabled={modules.hr} 
                                onToggle={() => toggleModule('hr')} 
                                locked={isElite}
                                color="bg-purple-100 text-purple-600"
                            />
                            <ModuleToggle 
                                label="Finance Approvals" 
                                description={isElite ? "Always enabled in Elite." : "Review funds, payroll requests, and finance records."}
                                icon={Banknote}
                                enabled={modules.accounting} 
                                onToggle={() => toggleModule('accounting')} 
                                locked={isElite}
                                color="bg-blue-100 text-blue-600"
                                />
                            <ModuleToggle 
                                label="Inventory" 
                                description={isElite ? "Always enabled in Elite." : "Required for inventory tracking and restock requests."}
                                icon={Warehouse}
                                enabled={modules.procurement} 
                                onToggle={() => toggleModule('procurement')}
                                locked
                                color="bg-amber-100 text-amber-600"
                            />
                        </div>

                        <div className="mt-4 border-t border-gray-50 pt-3">
                            <p className="text-[10px] text-gray-400 text-center flex items-center justify-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Changes save automatically
                            </p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
