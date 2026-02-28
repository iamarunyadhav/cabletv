<?php

namespace App\Services\Support;

use App\Models\NumberSequence;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class SequenceService
{
    public function next(string $key, ?string $periodFormat = 'Ym'): string
    {
        return DB::transaction(function () use ($key, $periodFormat): string {
            /** @var NumberSequence $sequence */
            $sequence = NumberSequence::query()
                ->lockForUpdate()
                ->where('key', $key)
                ->first();

            if (! $sequence) {
                throw new ModelNotFoundException("Sequence [{$key}] is not configured.");
            }

            $sequence->current_value = ($sequence->current_value ?? 0) + 1;
            $sequence->save();

            $numericSegment = str_pad(
                (string) $sequence->current_value,
                $sequence->padding ?? 4,
                '0',
                STR_PAD_LEFT,
            );

            $parts = array_filter([
                $sequence->prefix,
                $periodFormat ? now()->format($periodFormat) : null,
                $numericSegment,
            ]);

            return implode('-', $parts);
        });
    }

    public function ensure(string $key): void
    {
        if (! NumberSequence::query()->where('key', $key)->exists()) {
            throw new RuntimeException("Number sequence [{$key}] must be seeded before requesting values.");
        }
    }
}
