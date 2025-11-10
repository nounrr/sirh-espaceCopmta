<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Planification automatique : vérifier les échéances de tâches tous les jours à minuit
Schedule::command('tasks:check-deadlines')
    ->dailyAt('00:00')
    ->timezone('Africa/Casablanca')
    ->withoutOverlapping()
    ->onOneServer();
