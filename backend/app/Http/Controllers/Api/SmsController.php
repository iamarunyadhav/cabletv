<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SmsSendRequest;
use App\Http\Resources\SmsLogResource;
use App\Http\Resources\SmsMessageResource;
use App\Models\Connection;
use App\Models\Customer;
use App\Models\SmsLog;
use App\Models\SmsMessage;
use App\Models\SmsTemplate;
use App\Services\Sms\SmsService;
use App\Services\Sms\SmsTemplateRenderer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Throwable;

class SmsController extends Controller
{
    public function __construct(
        private readonly SmsService $smsService,
        private readonly SmsTemplateRenderer $smsTemplateRenderer,
    ) {}

    public function send(SmsSendRequest $request): JsonResponse
    {
        $data = $request->validated();

        if (! empty($data['customers']) || ! empty($data['connections']) || ! empty($data['area_id']) || ! empty($data['billing_group_id'])) {
            return $this->sendBulk($request, $data);
        }

        return $this->sendSingle($request, $data);
    }

    public function logs(Request $request): JsonResponse
    {
        $query = SmsLog::query()->orderByDesc('sent_at');

        if ($since = $request->get('since')) {
            $query->where('sent_at', '>=', $since);
        }

        if ($type = $request->get('type')) {
            $query->where('type', $type);
        }

        return SmsLogResource::collection(
            $query->limit($request->integer('limit', 500))->get()
        )->response();
    }

    public function messages(Request $request): JsonResponse
    {
        $query = SmsMessage::query()->orderByDesc('sent_at');

        if ($customerId = $request->get('customer_id')) {
            $query->where('customer_id', $customerId);
        }

        if ($connectionId = $request->get('connection_id')) {
            $query->where('connection_id', $connectionId);
        }

        return SmsMessageResource::collection(
            $query->limit($request->integer('limit', 50))->get()
        )->response();
    }

    public function test(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string'],
            'message' => ['required', 'string'],
        ]);

        SmsLog::query()->create([
            'phone' => $data['phone'],
            'message' => $data['message'],
            'type' => 'test',
            'status' => 'queued',
            'customer_id' => null,
            'sent_at' => now(),
        ]);

        return response()->json([
            'message' => 'Test SMS queued.',
        ]);
    }

    private function sendSingle(SmsSendRequest $request, array $data): JsonResponse
    {
        $customer = null;
        $connection = null;
        $template = null;

        if (! empty($data['customer_id'])) {
            $customer = Customer::query()
                ->with(['billingGroup.area', 'connections.package'])
                ->findOrFail($data['customer_id']);
        }

        if (! empty($data['connection_id'])) {
            $connection = $customer
                ? $customer->connections->firstWhere('id', $data['connection_id'])
                : null;
        }

        if (! empty($data['template_id'])) {
            $template = SmsTemplate::query()->find($data['template_id']);
        } elseif (! empty($data['template_key'])) {
            $template = SmsTemplate::query()
                ->where('key', $data['template_key'])
                ->orWhere('template_type', $data['template_key'])
                ->first();
        }

        if (! $template && empty($data['message_override']) && empty($data['message'])) {
            return response()->json([
                'message' => 'SMS template not found for the provided key.',
            ], 422);
        }

        $toNumber = $data['to_number'] ?? $customer?->phone;
        if (! $toNumber) {
            return response()->json([
                'message' => 'No phone number available for SMS delivery.',
            ], 422);
        }

        $params = $this->buildTemplateParams($customer, $connection, $data['params'] ?? []);
        $body = $data['message_override'] ?? $data['message'] ?? null;

        if (! $body) {
            $templateBody = $template?->body ?? $template?->content ?? '';
            $body = $this->smsTemplateRenderer->render($templateBody, $params);
        }

        $message = SmsMessage::query()->create([
            'customer_id' => $customer?->id,
            'connection_id' => $connection?->id,
            'template_id' => $template?->id,
            'template_key' => $template?->key ?? $template?->template_type,
            'to_number' => $toNumber,
            'body' => $body,
            'status' => 'queued',
            'sent_at' => now(),
            'created_by' => $request->user()?->id,
        ]);

        $log = SmsLog::query()->create([
            'customer_id' => $customer?->id,
            'connection_id' => $connection?->id,
            'phone' => $toNumber,
            'message' => $body,
            'type' => $template?->key ?? $template?->template_type ?? 'manual',
            'status' => 'queued',
            'sent_at' => now(),
        ]);

        try {
            // null => provider default type (usually "plain")
            $result = $this->smsService->send([$toNumber], $body, null);

            $message->update([
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
            $message->update([
                'status' => 'failed',
                'error_message' => $exception->getMessage(),
            ]);

            $log->update([
                'status' => 'failed',
                'error_message' => $exception->getMessage(),
            ]);
        }

        return (new SmsMessageResource($message->fresh()))
            ->response();
    }

    private function sendBulk(SmsSendRequest $request, array $data): JsonResponse
    {
        $body = $data['message_override'] ?? $data['message'] ?? '';
        if ($body === '') {
            return response()->json([
                'message' => 'Message body is required for bulk SMS dispatch.',
            ], 422);
        }

        $type = $data['type'] ?? 'manual';

        $query = Customer::query();

        if (! empty($data['customers'])) {
            $query->whereIn('id', $data['customers']);
        } elseif (! empty($data['connections'])) {
            $query->whereIn('id', function ($builder) use ($data): void {
                $builder->select('customer_id')
                    ->from('connections')
                    ->whereIn('id', $data['connections']);
            });
        } elseif (! empty($data['area_id'])) {
            $query->whereHas('billingGroup', fn ($builder) => $builder->where('area_id', $data['area_id']));
        } elseif (! empty($data['billing_group_id'])) {
            $query->where('billing_group_id', $data['billing_group_id']);
        }

        $customers = $query->get(['id', 'phone']);

        if ($customers->isEmpty()) {
            return response()->json([
                'message' => 'No customers matched the provided filters.',
            ]);
        }

        $messages = [];
        $logs = DB::transaction(function () use ($customers, $body, $type, $request, &$messages) {
            return $customers->map(function ($customer) use ($body, $type, $request, &$messages) {
                $messages[] = SmsMessage::query()->create([
                    'customer_id' => $customer->id,
                    'to_number' => $customer->phone,
                    'body' => $body,
                    'status' => 'queued',
                    'template_key' => $type,
                    'sent_at' => now(),
                    'created_by' => $request->user()?->id,
                ]);

                return SmsLog::query()->create([
                    'customer_id' => $customer->id,
                    'phone' => $customer->phone,
                    'message' => $body,
                    'type' => $type,
                    'status' => 'queued',
                    'sent_at' => now(),
                ]);
            });
        });

        try {
            $result = $this->smsService->send(
                $customers->pluck('phone')->all(),
                $body,
            );

            foreach ($messages as $message) {
                $message->update([
                    'status' => 'sent',
                    'provider' => $result['provider'] ?? null,
                    'provider_response' => $result['response'] ?? null,
                    'sent_at' => now(),
                ]);
            }

            foreach ($logs as $log) {
                $log->update([
                    'status' => 'sent',
                    'provider_response' => $result['response'] ?? null,
                    'provider_message_id' => $result['response']['data']['uid'] ?? null,
                    'delivery_status' => $result['response']['status'] ?? 'sent',
                ]);
            }

            return response()->json([
                'message' => sprintf('Dispatched %d SMS messages.', $customers->count()),
                'provider' => $result['provider'] ?? null,
            ]);
        } catch (Throwable $exception) {
            foreach ($messages as $message) {
                $message->update([
                    'status' => 'failed',
                    'error_message' => $exception->getMessage(),
                ]);
            }

            foreach ($logs as $log) {
                $log->update([
                    'status' => 'failed',
                    'error_message' => $exception->getMessage(),
                ]);
            }

            return response()->json([
                'message' => 'Failed to send SMS messages.',
                'error' => $exception->getMessage(),
            ], 500);
        }
    }

    /**
     * @param  array<string, mixed>  $params
     * @return array<string, string|float|int>
     */
    private function buildTemplateParams(?Customer $customer, ?Connection $connection, array $params): array
    {
        $payload = [];

        if ($customer) {
            $balance = (float) $customer->connections->sum('current_balance');
            $limit = (float) ($customer->billingGroup?->maximum_debit_balance ?? 0);
            $minPayment = max(0, $balance - $limit);

            $payload = [
                'name' => $customer->name,
                'customer_name' => $customer->name,
                'phone' => $customer->phone ?? '',
                'balance' => number_format($balance, 2, '.', ','),
                'min_payment' => number_format($minPayment, 2, '.', ','),
                'limit' => number_format($limit, 2, '.', ','),
                'due_date' => '',
                'billing_group' => $customer->billingGroup?->name ?? '',
                'area' => $customer->billingGroup?->area?->name ?? '',
            ];
        }

        if ($connection) {
            $payload['connection_no'] = $connection->box_number ?? '';
            $payload['box_number'] = $connection->box_number ?? '';
            $payload['package'] = $connection->package?->name ?? '';
        }

        $resolved = array_merge($payload, Arr::map($params, fn ($value) => is_scalar($value) ? $value : ''));

        if (! isset($resolved['customer_name']) && isset($resolved['name'])) {
            $resolved['customer_name'] = $resolved['name'];
        }

        if (! isset($resolved['name']) && isset($resolved['customer_name'])) {
            $resolved['name'] = $resolved['customer_name'];
        }

        if (! isset($resolved['connection_no']) && isset($resolved['box_number'])) {
            $resolved['connection_no'] = $resolved['box_number'];
        }

        if (! isset($resolved['box_number']) && isset($resolved['connection_no'])) {
            $resolved['box_number'] = $resolved['connection_no'];
        }

        return $resolved;
    }
}
