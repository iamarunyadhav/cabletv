<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function (): void {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('billing:process-cycles')
    ->timezone('Asia/Colombo')
    ->dailyAt('09:00')
    ->withoutOverlapping()
    ->onOneServer();

Schedule::command('billing:process-due-actions')
    ->timezone('Asia/Colombo')
    ->dailyAt('09:30')
    ->withoutOverlapping()
    ->onOneServer();
