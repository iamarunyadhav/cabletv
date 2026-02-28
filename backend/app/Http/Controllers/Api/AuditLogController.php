<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;


class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', AuditLog::class);

        $limit = min($request->integer('limit', 200), 500);

        $query = AuditLog::query()->latest('performed_at');

        if ($table = $request->get('table')) {
            $query->where('table_name', $table);
        }

        if ($action = $request->get('action')) {
            $query->where('action', $action);
        }

        if ($recordId = $request->get('record_id')) {
            $query->where('record_id', $recordId);
        }

        if ($email = $request->get('search')) {
            $query->where(function ($q) use ($email): void {
                $q->where('user_email', 'like', "%{$email}%")
                    ->orWhere('user_id', $email)
                    ->orWhere('record_id', $email);
            });
        }

        if ($from = $request->get('from')) {
            $query->whereDate('performed_at', '>=', $from);
        }

        if ($to = $request->get('to')) {
            $query->whereDate('performed_at', '<=', $to);
        }

        return response()->json(
            $query->limit($limit)->get()
        );
    }
}
