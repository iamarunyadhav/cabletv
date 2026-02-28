<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessLegacyImportJob;
use App\Models\ImportJob;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class LegacyImportController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        if (! extension_loaded('zip')) {
            return response()->json([
                'message' => 'Excel import requires the PHP zip extension. Please enable ext-zip on the server.',
            ], 422);
        }

        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:10240'], // 10MB CSV
        ]);

        $file = $request->file('file');
        $storedPath = $file->storeAs(
            'imports',
            Str::uuid()->toString() . '_' . $file->getClientOriginalName(),
            'local',
        );

        $importJob = ImportJob::query()->create([
            'type' => 'legacy_customers_connections',
            'status' => 'pending',
            'file_path' => $storedPath,
            'meta' => [
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType(),
                'size' => $file->getSize(),
            ],
            'stats' => [
                'processed_rows' => 0,
                'customers_created' => 0,
                'customers_updated' => 0,
                'connections_created' => 0,
                'connections_updated' => 0,
                'errors' => [],
            ],
        ]);

        Bus::dispatchAfterResponse(new ProcessLegacyImportJob($importJob));

        return response()->json([
            'job_id' => $importJob->id,
            'status' => $importJob->status,
            'meta' => $importJob->meta,
            'stats' => $importJob->stats,
        ], 202);
    }

    public function show(ImportJob $importJob): JsonResponse
    {
        return response()->json([
            'job_id' => $importJob->id,
            'status' => $importJob->status,
            'meta' => $importJob->meta,
            'stats' => $importJob->stats,
            'error' => $importJob->error,
        ]);
    }
}
