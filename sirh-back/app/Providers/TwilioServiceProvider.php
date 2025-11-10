<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Twilio\Rest\Client as TwilioClient;
use App\Services\TwilioService;

class TwilioServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(TwilioClient::class, function () {
            $sid = config('twilio.sid');
            $token = config('twilio.token');
            return new TwilioClient($sid, $token);
        });

        $this->app->singleton(TwilioService::class, function ($app) {
            return new TwilioService($app->make(TwilioClient::class), config('twilio'));
        });
    }

    public function boot(): void
    {
        //
    }
}
