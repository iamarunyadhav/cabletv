<?php

namespace App\Services\Billing;

use App\Enums\ConnectionStatus;
use App\Enums\InvoiceStatus;
use App\Jobs\ProcessDisconnectStatusJob;
use App\Models\BillingCycle;
use App\Models\BillingGroup;
use App\Models\BillingNotification;
use App\Models\Connection;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\SmsLog;
use App\Models\SmsMessage;
use App\Services\Sms\SmsAutomationSettingsService;
use App\Services\Sms\SmsService;
use App\Services\Sms\SmsTemplateRenderer;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Throwable;

class BillingAutomationService
{
    public function __construct(
        private readonly InvoiceService $invoiceService,
        private readonly SmsService $smsService,
        private readonly SmsTemplateRenderer $smsTemplateRenderer,
        private readonly SmsAutomationSettingsService $smsAutomationSettingsService,
    ) {}

    public function isWorkflowEnabled(string $workflowKey): bool
    {
        return $this->smsAutomationSettingsService->isEnabled($workflowKey, true);
    }

    public function generateInvoices(BillingCycle $cycle): void
    {
        $group = $cycle->billingGroup;
        $periodStart = CarbonImmutable::parse($cycle->window_start);
        $periodEnd = CarbonImmutable::parse($cycle->window_end);

        Connection::query()
            ->with('customer.billingGroup')
            ->whereHas('customer', function ($query) use ($group): void {
                $query->where('billing_group_id', $group->id);
            })
            ->whereIn('connections.status', [ConnectionStatus::Active->value])
            ->orderBy('connections.id')
            ->chunkById(100, function (Collection $connections) use ($periodStart, $periodEnd, $cycle): void {
                foreach ($connections as $connection) {
                    $alreadyExists = Invoice::query()
                        ->where('connection_id', $connection->id)
                        ->where('billing_cycle_id', $cycle->id)
                        ->exists();

                    if ($alreadyExists) {
                        continue;
                    }

                    $this->invoiceService->generateForConnection(
                        $connection->fresh([
                            'customer.billingGroup',
                            'package',
                            'connectionAdditionalChannels.additionalChannel',
                            'connectionSetupItems.setupItem',
                        ]),
                        $periodStart,
                        $periodEnd,
                        $cycle,
                    );
                }
            });
    }

    public function sendRenewalNotices(BillingCycle $cycle): void
    {
        if (! $this->isWorkflowEnabled('monthly_renewal')) {
            return;
        }

        $disconnectDate = $cycle->disconnect_date?->toDateString();

        $this->eachCustomerOutstanding($cycle->billingGroup, function (Customer $customer, float $outstanding) use (
            $cycle,
            $disconnectDate
        ): void {
            if ($outstanding <= 0) {
                return;
            }

            $this->sendNotification(
                $cycle,
                $customer,
                'monthly_renewal',
                [
                    'outstanding' => $outstanding,
                    'disconnect_date' => $disconnectDate,
                ],
            );
        });
    }

    public function sendFriendlyReminders(BillingCycle $cycle): void
    {
        if (! $this->isWorkflowEnabled('friendly_reminder')) {
            return;
        }

        $limit = (float) $cycle->billingGroup->maximum_debit_balance;
        if ($limit <= 0) {
            return;
        }

        $this->eachCustomerOutstanding($cycle->billingGroup, function (Customer $customer, float $outstanding) use (
            $cycle,
            $limit
        ): void {
            if ($outstanding <= $limit) {
                return;
            }

            $this->sendNotification(
                $cycle,
                $customer,
                'friendly_reminder',
                [
                    'outstanding' => $outstanding,
                    'limit' => $limit,
                    'minimum_payment' => max(0, $outstanding - $limit),
                ],
            );
        });
    }

    public function markGraceAndOverdue(BillingCycle $cycle): void
    {
        Invoice::query()
            ->where('billing_cycle_id', $cycle->id)
            ->whereIn('status', [
                InvoiceStatus::Unpaid->value,
                InvoiceStatus::PartiallyPaid->value,
            ])
            ->update(['status' => InvoiceStatus::Overdue->value]);

        $limit = (float) $cycle->billingGroup->maximum_debit_balance;
        if ($limit <= 0) {
            return;
        }

        $sendOverdueSms = $this->isWorkflowEnabled('overdue_notice');

        $this->eachCustomerOutstanding($cycle->billingGroup, function (Customer $customer, float $outstanding) use (
            $cycle,
            $limit,
            $sendOverdueSms
        ): void {
            if ($outstanding <= $limit) {
                return;
            }

            if (! $sendOverdueSms) {
                return;
            }

            $this->sendNotification(
                $cycle,
                $customer,
                'overdue',
                [
                    'outstanding' => $outstanding,
                    'limit' => $limit,
                ],
            );
        });
    }

    public function processDisconnects(BillingCycle $cycle): void
    {
        $limit = (float) $cycle->billingGroup->maximum_debit_balance;
        if ($limit <= 0) {
            return;
        }

        $sendDisconnectSms = $this->isWorkflowEnabled('disconnect_notice');

        Customer::query()
            ->where('billing_group_id', $cycle->billing_group_id)
            ->with([
                'connections' => fn ($query) => $query->select([
                    'id',
                    'customer_id',
                    'status',
                    'current_balance',
                ]),
            ])
            ->withSum('connections as outstanding_balance', 'current_balance')
            ->orderBy('customers.id')
            ->chunkById(100, function (Collection $customers) use ($cycle, $limit, $sendDisconnectSms): void {
                foreach ($customers as $customer) {
                    $outstanding = (float) ($customer->outstanding_balance ?? 0);
                    if ($outstanding <= $limit) {
                        continue;
                    }

                    ProcessDisconnectStatusJob::dispatch($customer->id)
                        ->delay(now()->addHours(2));

                    if ($sendDisconnectSms) {
                        $this->sendNotification(
                            $cycle,
                            $customer,
                            'disconnect_notice',
                            [
                                'outstanding' => $outstanding,
                                'limit' => $limit,
                            ],
                        );
                    }
                }
            });
    }

    private function eachCustomerOutstanding(BillingGroup $group, callable $callback): void
    {
        Customer::query()
            ->where('billing_group_id', $group->id)
            ->withSum('connections as outstanding_balance', 'current_balance')
            ->orderBy('customers.id')
            ->chunkById(200, function (Collection $customers) use ($callback): void {
                foreach ($customers as $customer) {
                    $outstanding = (float) ($customer->outstanding_balance ?? 0);
                    $callback($customer, $outstanding);
                }
            });
    }

    public function sendNotification(
        ?BillingCycle $cycle,
        Customer $customer,
        string $workflowKey,
        array $payload = []
    ): void {
        if (empty($customer->phone)) {
            return;
        }

        $config = $this->smsAutomationSettingsService->get($workflowKey);

        if (($config['enabled'] ?? true) !== true) {
            return;
        }

        $template = $this->smsAutomationSettingsService->resolveTemplate($workflowKey);

        if (! $template || ! ($template->is_active ?? $template->active ?? true)) {
            return;
        }

        $minimumPayment = max(0, (float) ($payload['outstanding'] ?? 0) - (float) ($payload['limit'] ?? 0));
        $basePayload = [
            'customer_name' => $customer->name,
            'balance' => $this->formatAmount((float) ($payload['outstanding'] ?? 0)),
            'min_payment' => $this->formatAmount($minimumPayment),
            'limit' => $this->formatAmount((float) ($payload['limit'] ?? 0)),
            'cycle_month' => $cycle?->cycle_month ?? '',
            'cycle_year' => $cycle?->cycle_year ?? '',
            'disconnect_date' => $payload['disconnect_date'] ?? $cycle?->disconnect_date?->toDateString() ?? '',
            'connection_no' => $payload['connection_no'] ?? '',
            'package' => $payload['package'] ?? '',
            'reason' => $payload['reason'] ?? '',
        ];

        $message = $this->smsTemplateRenderer->render(
            $template->body ?? $template->content ?? '',
            array_merge($basePayload, $payload),
        );

        if ($message === '') {
            return;
        }

        // For scheduled workflows (with a BillingCycle), avoid duplicate notices per cycle.
        // For ad-hoc/manual actions (cycle is null), always send so manual suspends/disconnects trigger an SMS each time.
        if ($cycle) {
            $exists = BillingNotification::query()
                ->where('customer_id', $customer->id)
                ->where('notification_type', $workflowKey)
                ->where('billing_cycle_id', $cycle->id)
                ->exists();

            if ($exists) {
                return;
            }
        }

        $notification = null;
        $log = null;
        $smsMessage = null;
        $templateKey = $template->key ?? $template->template_type ?? $workflowKey;

        DB::beginTransaction();
        try {
            $notification = BillingNotification::query()->create([
                'billing_cycle_id' => $cycle?->id,
                'customer_id' => $customer->id,
                'notification_type' => $workflowKey,
                'amount' => $payload['outstanding'] ?? 0,
                'payload' => $payload,
            ]);

            $smsMessage = SmsMessage::query()->create([
                'customer_id' => $customer->id,
                'template_id' => $template->id,
                'template_key' => $templateKey,
                'to_number' => $customer->phone,
                'body' => $message,
                'status' => 'queued',
                'sent_at' => now(),
            ]);

            $log = SmsLog::query()->create([
                'customer_id' => $customer->id,
                'phone' => $customer->phone,
                'message' => $message,
                'type' => $workflowKey,
                'status' => 'queued',
                'sent_at' => now(),
            ]);
            DB::commit();
        } catch (Throwable $exception) {
            DB::rollBack();

            throw $exception;
        }

        try {
            // null => provider default type (usually "plain")
            $result = $this->smsService->send([$customer->phone], $message, null);

            $notification->update([
                'sent_at' => now(),
                'payload' => array_merge($payload, [
                    'provider' => $result['provider'] ?? null,
                ]),
            ]);

            $smsMessage?->update([
                'status' => 'sent',
                'provider' => $result['provider'] ?? null,
                'provider_response' => $result['response'] ?? null,
                'sent_at' => now(),
            ]);

            $log->update([
                'status' => 'sent',
                'provider_response' => $result['response'] ?? null,
                'provider_message_id' => $result['response']['data']['uid'] ?? null,
                'delivery_status' => $result['response']['status'] ?? 'sent',
            ]);
        } catch (Throwable $exception) {
            optional($notification)->delete();
            $smsMessage?->update([
                'status' => 'failed',
                'error_message' => $exception->getMessage(),
            ]);
            $log?->update([
                'status' => 'failed',
                'error_message' => $exception->getMessage(),
            ]);
        }
    }

    private function formatAmount(float $value): string
    {
        return number_format($value, 2, '.', ',');
    }
}
