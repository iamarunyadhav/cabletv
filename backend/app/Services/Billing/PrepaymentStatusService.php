<?php

namespace App\Services\Billing;

use App\Models\Connection;
use Carbon\CarbonImmutable;

class PrepaymentStatusService
{
    public function __construct(
        private readonly ConnectionPricingService $pricingService,
        private readonly BillingCycleService $billingCycleService,
    ) {}

    /**
     * @return array{
     *     credit_balance: float,
     *     prepaid_months: int,
     *     prepaid_through_date: ?string,
     *     prepaid_through_label: ?string,
     *     next_billing_date: ?string,
     *     monthly_charge: float
     * }
     */
    public function compute(Connection $connection): array
    {
        $connection->loadMissing(['customer.billingGroup']);

        $monthlyCharge = $this->pricingService->computeMonthlyCharge($connection);
        $creditBalance = max(-((float) $connection->current_balance), 0);

        $prepaidMonths = 0;
        $paidThroughDate = null;
        $paidThroughLabel = null;
        $nextBillingDate = null;

        if ($creditBalance > 0 && $monthlyCharge > 0) {
            $prepaidMonths = (int) floor($creditBalance / $monthlyCharge);
        }

        if ($prepaidMonths > 0 && $connection->customer?->billingGroup) {
            $cycle = $this->billingCycleService->calculateCycleDates(
                $connection->customer->billingGroup,
                CarbonImmutable::now(),
            );
            $prepaidStartRef = $cycle['window_start']->addMonth();
            $prepaidEndRef = $prepaidStartRef->addMonths($prepaidMonths - 1);
            $prepaidEndCycle = $this->billingCycleService->calculateCycleDates(
                $connection->customer->billingGroup,
                $prepaidEndRef,
            );
            $nextCycleRef = $prepaidStartRef->addMonths($prepaidMonths);
            $nextCycle = $this->billingCycleService->calculateCycleDates(
                $connection->customer->billingGroup,
                $nextCycleRef,
            );

            $paidThroughEnd = $prepaidEndCycle['window_end'];
            $paidThroughDate = $paidThroughEnd->toDateString();
            $paidThroughLabel = sprintf('%s billing cycle %s', $paidThroughEnd->format('M'), $paidThroughEnd->format('Y'));
            $nextBillingDate = $nextCycle['window_start']->toDateString();
        }

        return [
            'credit_balance' => $creditBalance,
            'prepaid_months' => $prepaidMonths,
            'prepaid_through_date' => $paidThroughDate,
            'prepaid_through_label' => $paidThroughLabel,
            'next_billing_date' => $nextBillingDate,
            'monthly_charge' => $monthlyCharge,
        ];
    }
}
