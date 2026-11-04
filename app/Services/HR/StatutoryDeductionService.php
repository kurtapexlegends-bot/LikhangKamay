<?php

namespace App\Services\HR;

class StatutoryDeductionService
{
    /**
     * SSS Contribution (RA 11199)
     * Total: 14.0%
     * MSC Capped at ₱30,000, floor at ₱4,000
     * Employee Share (EE): 4.5% (max ₱1,350.00)
     * Employer Share (ER): 9.5% (max ₱2,850.00)
     *
     * @param float $monthlySalary
     * @return array{ee: float, er: float, total: float, msc: float}
     */
    public function calculateSss(float $monthlySalary): array
    {
        if ($monthlySalary <= 0) {
            return ['ee' => 0.0, 'er' => 0.0, 'total' => 0.0, 'msc' => 0.0];
        }

        $msc = min(30000.0, max(4000.0, $monthlySalary));
        $ee = min(1350.0, round($msc * 0.045, 2));
        $er = min(2850.0, round($msc * 0.095, 2));

        return [
            'ee' => $ee,
            'er' => $er,
            'total' => round($ee + $er, 2),
            'msc' => round($msc, 2),
        ];
    }

    /**
     * PhilHealth Premium (RA 11223 - Universal Health Care Act)
     * Total: 5.0% split equally (2.5% EE, 2.5% ER)
     * Floor: ₱10,000 (Min premium ₱500; EE = ₱250, ER = ₱250)
     * Ceiling: ₱100,000 (Max premium ₱5,000; EE = ₱2,500, ER = ₱2,500)
     *
     * @param float $monthlySalary
     * @return array{ee: float, er: float, total: float}
     */
    public function calculatePhilHealth(float $monthlySalary): array
    {
        if ($monthlySalary <= 0) {
            return ['ee' => 0.0, 'er' => 0.0, 'total' => 0.0];
        }

        $clampedSalary = min(100000.0, max(10000.0, $monthlySalary));
        $ee = round($clampedSalary * 0.025, 2);
        $er = round($clampedSalary * 0.025, 2);

        return [
            'ee' => $ee,
            'er' => $er,
            'total' => round($ee + $er, 2),
        ];
    }

    /**
     * Pag-IBIG (HDMF Circular No. 460)
     * 2.0% EE capped at ₱200.00/mo
     * 2.0% ER capped at ₱200.00/mo
     *
     * @param float $monthlySalary
     * @return array{ee: float, er: float, total: float}
     */
    public function calculatePagIbig(float $monthlySalary): array
    {
        if ($monthlySalary <= 0) {
            return ['ee' => 0.0, 'er' => 0.0, 'total' => 0.0];
        }

        $ee = min(200.0, round($monthlySalary * 0.02, 2));
        $er = min(200.0, round($monthlySalary * 0.02, 2));

        return [
            'ee' => $ee,
            'er' => $er,
            'total' => round($ee + $er, 2),
        ];
    }

    /**
     * BIR TRAIN Law (RA 10963) Revised Monthly Withholding Tax
     *
     * @param float $taxableIncome
     * @return float
     */
    public function calculateWithholdingTax(float $taxableIncome): float
    {
        if ($taxableIncome <= 20833.33) {
            return 0.0;
        }

        if ($taxableIncome <= 33333.33) {
            return round(($taxableIncome - 20833.33) * 0.15, 2);
        }

        if ($taxableIncome <= 66666.67) {
            return round(1875.00 + (($taxableIncome - 33333.33) * 0.20), 2);
        }

        if ($taxableIncome <= 166666.67) {
            return round(8541.67 + (($taxableIncome - 66666.67) * 0.25), 2);
        }

        if ($taxableIncome <= 666666.67) {
            return round(33541.67 + (($taxableIncome - 166666.67) * 0.30), 2);
        }

        return round(183541.67 + (($taxableIncome - 666666.67) * 0.35), 2);
    }

    /**
     * Compute all statutory contributions & withholding tax.
     *
     * @param float $baseSalary Base monthly compensation (used for statutory brackets)
     * @param float $grossTaxablePay Net earnings after absences/undertime + overtime
     * @return array
     */
    public function calculateAll(float $baseSalary, float $grossTaxablePay): array
    {
        $sss = $this->calculateSss($baseSalary);
        $philHealth = $this->calculatePhilHealth($baseSalary);
        $pagIbig = $this->calculatePagIbig($baseSalary);

        $totalStatutoryEe = round($sss['ee'] + $philHealth['ee'] + $pagIbig['ee'], 2);
        $totalStatutoryEr = round($sss['er'] + $philHealth['er'] + $pagIbig['er'], 2);

        $taxableIncome = max(0.0, round($grossTaxablePay - $totalStatutoryEe, 2));
        $withholdingTax = $this->calculateWithholdingTax($taxableIncome);

        $totalEmployeeDeductions = round($totalStatutoryEe + $withholdingTax, 2);

        return [
            'gross_pay' => round($grossTaxablePay, 2),
            'taxable_income' => $taxableIncome,
            'sss_ee' => $sss['ee'],
            'sss_er' => $sss['er'],
            'philhealth_ee' => $philHealth['ee'],
            'philhealth_er' => $philHealth['er'],
            'pagibig_ee' => $pagIbig['ee'],
            'pagibig_er' => $pagIbig['er'],
            'total_statutory_ee' => $totalStatutoryEe,
            'total_statutory_er' => $totalStatutoryEr,
            'withholding_tax' => $withholdingTax,
            'total_employee_deductions' => $totalEmployeeDeductions,
            'total_employer_contributions' => $totalStatutoryEr,
        ];
    }
}
