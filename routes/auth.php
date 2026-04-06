<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\ConfirmablePasswordController;
use App\Http\Controllers\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Auth\EmailVerificationPromptController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Auth\StaffSecurityController;
use App\Http\Controllers\Auth\VerifyEmailController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::get('register', [RegisteredUserController::class, 'create'])
        ->name('register');

    Route::post('register', [RegisteredUserController::class, 'store']);

    Route::get('login', [AuthenticatedSessionController::class, 'create'])
        ->name('login');

    Route::post('login', [AuthenticatedSessionController::class, 'store']);

    Route::get('forgot-password', [PasswordResetLinkController::class, 'create'])
        ->name('password.request');

    Route::post('forgot-password', [PasswordResetLinkController::class, 'store'])
        ->name('password.email');

    Route::get('reset-password/{token}', [NewPasswordController::class, 'create'])
        ->name('password.reset');

    Route::post('reset-password', [NewPasswordController::class, 'store'])
        ->name('password.store');
});

Route::get('verify-email/{id}/{hash}', VerifyEmailController::class)
    ->middleware(['signed', 'throttle:6,1'])
    ->name('verification.verify');

Route::middleware(['auth', 'staff.security'])->group(function () {
    Route::get('staff', [StaffSecurityController::class, 'home'])
        ->name('staff.home');

    Route::get('staff/logout', [StaffSecurityController::class, 'confirmLogout'])
        ->name('staff.logout.confirm');

    Route::post('staff/logout', [AuthenticatedSessionController::class, 'destroyStaff'])
        ->name('staff.logout');

    Route::post('staff/logout/direct', [AuthenticatedSessionController::class, 'destroy'])
        ->name('staff.logout.direct');

    Route::get('staff/password', [StaffSecurityController::class, 'editPassword'])
        ->name('staff.password.edit');

    Route::put('staff/password', [StaffSecurityController::class, 'updatePassword'])
        ->name('staff.password.update');

    Route::get('staff/attendance/resume', [StaffSecurityController::class, 'showResumePrompt'])
        ->name('staff.attendance.resume-prompt');

    Route::post('staff/attendance/resume', [StaffSecurityController::class, 'resumeAttendance'])
        ->name('staff.attendance.resume');

    Route::post('staff/attendance/break', [StaffSecurityController::class, 'pauseAttendance'])
        ->name('staff.attendance.break');

    Route::post('staff/attendance/heartbeat', [StaffSecurityController::class, 'heartbeat'])
        ->name('staff.attendance.heartbeat');

    Route::get('verify-email', EmailVerificationPromptController::class)
        ->name('verification.notice');

    Route::post('email/verification-notification', [EmailVerificationNotificationController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('verification.send');

    Route::get('confirm-password', [ConfirmablePasswordController::class, 'show'])
        ->name('password.confirm');

    Route::post('confirm-password', [ConfirmablePasswordController::class, 'store']);

    Route::put('password', [PasswordController::class, 'update'])->name('password.update');

    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])
        ->name('logout');
});
