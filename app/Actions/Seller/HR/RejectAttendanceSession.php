<?php

declare(strict_types=1);

namespace App\Actions\Seller\HR;

use App\Models\StaffAttendanceSession;
use App\Models\User;
use App\Services\StaffAttendanceService;
use App\Support\HRWorkflowHelper;

class RejectAttendanceSession
{
    public function __construct(
        private readonly StaffAttendanceService $attendanceService
    ) {}

    /**
     * Reject a staff attendance session with an optional rationale.
     */
    public function execute(StaffAttendanceSession $session, User $actor, ?string $reason): StaffAttendanceSession
    {
        abort_unless(HRWorkflowHelper::canEditHrRecords($actor), 403, 'Only HR managers can reject attendance sessions.');

        $this->attendanceService->rejectSession($session, $actor, $reason);

        return $session->fresh(['approver:id,name']);
    }
}
