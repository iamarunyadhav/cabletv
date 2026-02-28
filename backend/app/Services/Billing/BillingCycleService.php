<?php

namespace App\Services\Billing;

use App\Models\BillingCycle;
use App\Models\BillingGroup;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

class BillingCycleService
{
    public function ensureCycle(BillingGroup $group, CarbonInterface $referenceDate): BillingCycle
    {
        $dates = $this->calculateCycleDates($group, $referenceDate);

        /** @var BillingCycle $cycle */
        $cycle = BillingCycle::query()->updateOrCreate(
            [
                'billing_group_id' => $group->id,
                'cycle_year' => $dates['cycle_year'],
                'cycle_month' => $dates['cycle_month'],
            ],
            [
                'window_start' => $dates['window_start']->toDateString(),
                'window_end' => $dates['window_end']->toDateString(),
                'reminder_date' => $dates['reminder_date']->toDateString(),
                'grace_end' => $dates['grace_end']->toDateString(),
                'disconnect_date' => $dates['disconnect_date']->toDateString(),
            ],
        );

        return $cycle->refresh();
    }

    /**
     * @return array{
     *     cycle_year: int,
     *     cycle_month: int,
     *     window_start: CarbonImmutable,
     *     window_end: CarbonImmutable,
     *     reminder_date: CarbonImmutable,
     *     grace_end: CarbonImmutable,
     *     disconnect_date: CarbonImmutable
     * }
     */
    public function calculateCycleDates(BillingGroup $group, CarbonInterface $referenceDate): array
    {
        $tzAware = CarbonImmutable::instance($referenceDate)->setTime(0, 0);
        $cycleBase = $tzAware->firstOfMonth();

        if ($tzAware->day < $group->billing_start_day) {
            $cycleBase = $cycleBase->subMonth();
        }

        $windowStart = $this->applyDay($cycleBase, $group->billing_start_day);
        $windowEndBase = $windowStart;

        if ($group->billing_end_day < $group->billing_start_day) {
            $windowEndBase = $windowEndBase->addMonth();
        }

        $windowEnd = $this->applyDay($windowEndBase, $group->billing_end_day);
        $graceEnd = $windowEnd->addDays($group->grace_days);
        $reminderDate = $graceEnd->addDays($group->friendly_reminder_days);
        $disconnectDate = $reminderDate->addDays($group->disconnect_notice_days);

        return [
            'cycle_year' => $windowStart->year,
            'cycle_month' => $windowStart->month,
            'window_start' => $windowStart,
            'window_end' => $windowEnd,
            'reminder_date' => $reminderDate,
            'grace_end' => $graceEnd,
            'disconnect_date' => $disconnectDate,
        ];
    }

    private function applyDay(CarbonImmutable $date, int $day): CarbonImmutable
    {
        $targetDay = min($day, $date->daysInMonth);

        return $date->day($targetDay);
    }
}
