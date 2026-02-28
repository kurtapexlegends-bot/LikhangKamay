<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class HRController extends Controller
{
    public function index()
    {
        $employees = Employee::where('user_id', Auth::id())->orderBy('created_at', 'desc')->get();
        $payrolls = \App\Models\Payroll::where('user_id', Auth::id())->orderBy('created_at', 'desc')->paginate(10);
        
        return Inertia::render('Seller/HR', [
            'staff' => $employees,
            'payrolls' => $payrolls
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'role' => 'required|string|max:255',
            'salary' => 'required|numeric|min:0',
        ]);

        Employee::create([
            'user_id' => Auth::id(),
            'name' => $request->name,
            'role' => $request->role,
            'salary' => $request->salary,
            'join_date' => now(),
            'status' => 'Active'
        ]);

        return redirect()->back();
    }

    public function destroy($id)
    {
        Employee::where('user_id', Auth::id())->where('id', $id)->delete();
        return redirect()->back();
    }

    public function updateSettings(Request $request)
    {
        $request->validate([
            'overtime_rate' => 'required|numeric|min:0',
            'payroll_working_days' => 'required|integer|min:1|max:31',
        ]);

        \App\Models\User::where('id', Auth::id())->update([
            'overtime_rate' => $request->overtime_rate,
            'payroll_working_days' => $request->payroll_working_days,
        ]);

        return redirect()->back()->with('success', 'Payroll settings updated successfully.');
    }

    public function generatePayroll(Request $request)
    {
        $validated = $request->validate([
            'month' => 'required|string',
            'items' => 'required|array',
            'items.*.employee_id' => 'required|exists:employees,id',
            'items.*.absences_days' => 'required|numeric|min:0',
            'items.*.undertime_hours' => 'required|numeric|min:0',
            'items.*.overtime_hours' => 'required|numeric|min:0',
        ]);

        try {
            \Illuminate\Support\Facades\DB::transaction(function () use ($validated) {
                $totalAmount = 0;
                $employeeCount = count($validated['items']);
                $user = Auth::user();
                $otRate = $user->overtime_rate ?? 50.00; // Default to 50/hr if not set

                // Create Payroll Header
                $payroll = \App\Models\Payroll::create([
                    'user_id' => $user->id,
                    'month' => $validated['month'],
                    'total_amount' => 0, // Will update later
                    'employee_count' => $employeeCount,
                    'status' => 'Pending'
                ]);

                $workingDays = $user->payroll_working_days ?? 22;

                foreach ($validated['items'] as $item) {
                    $employee = Employee::find($item['employee_id']);
                    
                    // Standard Computation
                    $dailyRate = $employee->salary / $workingDays;
                    $hourlyRate = $dailyRate / 8;
                    
                    // Specifically compute Additions & Deductions
                    $overtimePay = $item['overtime_hours'] * $otRate;
                    $absenceDeduction = $item['absences_days'] * $dailyRate;
                    $undertimeDeduction = $item['undertime_hours'] * $hourlyRate;
                    
                    // Holidays are automatically No Pay, so we just stick to base salary minus deductions.
                    $netPay = $employee->salary + $overtimePay - $absenceDeduction - $undertimeDeduction;
                    
                    // Prevent negative net pay theoretically
                    if ($netPay < 0) $netPay = 0;
                    
                    $daysWorked = max(0, $workingDays - $item['absences_days']);
                    
                    \App\Models\PayrollItem::create([
                        'payroll_id' => $payroll->id,
                        'employee_id' => $employee->id,
                        'base_salary' => $employee->salary,
                        'days_worked' => round($daysWorked),
                        'absent_days' => round($item['absences_days']),
                        'undertime_hours' => $item['undertime_hours'],
                        'overtime_hours' => $item['overtime_hours'],
                        'overtime_rate' => $otRate,
                        'overtime_pay' => $overtimePay,
                        'deductions' => $absenceDeduction + $undertimeDeduction,
                        'bonus' => 0.00,
                        'net_pay' => $netPay
                    ]);

                    $totalAmount += $netPay;
                }

                $payroll->update(['total_amount' => $totalAmount]);
            });

            return redirect()->back()->with('success', 'Payroll generated successfully! Waiting for Accounting approval.');

        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Failed to generate payroll: ' . $e->getMessage());
        }
    }
}