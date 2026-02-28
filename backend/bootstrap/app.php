<?php

use App\Console\Commands\ProcessBillingCyclesCommand;
use App\Console\Commands\ProcessCreditLimitsCommand;
use App\Console\Commands\ProcessDueActionsCommand;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withCommands([
        ProcessBillingCyclesCommand::class,
        ProcessCreditLimitsCommand::class,
        ProcessDueActionsCommand::class,
    ])
    ->withMiddleware(function (Middleware $middleware): void {
        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
