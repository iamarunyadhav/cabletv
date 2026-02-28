<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdditionalChannel;
use App\Models\Area;
use App\Models\BillingGroup;
use App\Models\Package;
use App\Models\PaymentAgent;
use App\Models\SetupItem;
use App\Models\SmsTemplate;
use Illuminate\Http\JsonResponse;

class LookupController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'areas' => Area::query()->orderBy('name')->get(),
            'billing_groups' => BillingGroup::query()->with('area')->orderBy('name')->get(),
            'packages' => Package::query()->where('active', true)->orderBy('name')->get(),
            'additional_channels' => AdditionalChannel::query()->where('is_active', true)->orderBy('name')->get(),
            'setup_items' => SetupItem::query()->where('is_active', true)->orderBy('name')->get(),
            'payment_agents' => PaymentAgent::query()->where('is_active', true)->orderBy('name')->get(),
            'sms_templates' => SmsTemplate::query()
                ->where('is_active', true)
                ->orWhere('active', true)
                ->orderBy('name')
                ->get(),
        ]);
    }
}
