<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SmsLogResource;
use App\Http\Resources\SuspensionHistoryResource;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CustomerActivityController extends Controller
{
    public function index(Request $request, Customer $customer): JsonResource
    {
        $this->authorize('view', $customer);

        $smsQuery = $customer->smsLogs()->latest()->limit(200);
        if ($type = $request->get('type')) {
            $smsQuery->where('type', $type);
        }
        if ($from = $request->get('from')) {
            $smsQuery->whereDate('sent_at', '>=', $from);
        }
        if ($to = $request->get('to')) {
            $smsQuery->whereDate('sent_at', '<=', $to);
        }

        $eventsQuery = $customer->suspensionHistory()
            ->with('connection')
            ->latest()
            ->limit(200);

        $sms = $smsQuery->get();
        $events = $eventsQuery->get();

        return JsonResource::make([
            'sms_logs' => SmsLogResource::collection($sms),
            'events' => SuspensionHistoryResource::collection($events),
        ]);
    }
}
