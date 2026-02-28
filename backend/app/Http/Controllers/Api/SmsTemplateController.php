<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SmsTemplateStoreRequest;
use App\Http\Requests\SmsTemplateUpdateRequest;
use App\Http\Resources\SmsTemplateResource;
use App\Models\SmsTemplate;
use Illuminate\Http\JsonResponse;

class SmsTemplateController extends Controller
{
    public function index(): JsonResponse
    {
        $templates = SmsTemplate::query()
            ->orderBy('key')
            ->orderBy('name')
            ->get();

        return SmsTemplateResource::collection($templates)->response();
    }

    public function store(SmsTemplateStoreRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['created_by'] = $request->user()?->id;
        $data['updated_by'] = $request->user()?->id;
        $data['template_type'] = $data['template_type'] ?? $data['key'];
        $data['content'] = $data['content'] ?? $data['body'];

        $template = SmsTemplate::query()->create($data);

        return (new SmsTemplateResource($template))
            ->response()
            ->setStatusCode(201);
    }

    public function show(SmsTemplate $smsTemplate): SmsTemplateResource
    {
        return new SmsTemplateResource($smsTemplate);
    }

    public function update(SmsTemplateUpdateRequest $request, SmsTemplate $smsTemplate): SmsTemplateResource
    {
        $data = $request->validated();
        $data['updated_by'] = $request->user()?->id;
        if (! empty($data['key']) && empty($data['template_type'])) {
            $data['template_type'] = $data['key'];
        }
        if (! empty($data['body']) && empty($data['content'])) {
            $data['content'] = $data['body'];
        }

        $smsTemplate->update($data);

        return new SmsTemplateResource($smsTemplate);
    }

    public function destroy(SmsTemplate $smsTemplate): JsonResponse
    {
        $smsTemplate->delete();

        return response()->json([
            'message' => 'SMS template deleted.',
        ]);
    }
}
