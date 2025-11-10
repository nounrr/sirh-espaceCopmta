<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use App\Http\Middleware\RoleMiddleware;



return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        apiPrefix: 'api'
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Configure authentication redirect
        // For API routes, return null to send 401 JSON instead of redirecting
        $middleware->redirectGuestsTo(function ($request) {
            // Always return null for API routes to get JSON 401 response
            if ($request->expectsJson() || $request->is('api/*')) {
                return null;
            }
            // For web routes, return null as well since we don't have a login route
            return null;
        });
        
        $middleware->alias([
            'role' => RoleMiddleware::class,
            // 'permission' => PermissionMiddleware::class,
            // 'role_or_permission' => RoleOrPermissionMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();