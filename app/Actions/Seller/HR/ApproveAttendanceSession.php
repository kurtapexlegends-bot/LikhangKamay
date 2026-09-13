<?php

declare(strict_types=1);

namespace App\Actions\Seller\HR;

use App\Models\StaffAttendanceSession;
use App\Models\User;
use App\Services\StaffAttendanceService;
use App\Support\HRWorkflowHelper;

class ApproveAttendanceSession
{
    public function __construct(
        private readonly StaffAttendanceService $attendanceService
    ) {}

    /**
     * Approve a staff attendance session.
     */
    public function execute(StaffAttendanceSession $session, User $actor): StaffAttendanceSession
    {
        abort_unless(HRWorkflowHelper::canEditHrRecords($actor), 403, 'Only HR managers can approve attendance sessions.');

        $this->attendanceService->approveSession($session, $actor);

        return $session->fresh(['approver:id,name']);
    }
}
