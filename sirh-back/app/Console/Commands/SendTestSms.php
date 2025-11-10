<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\TwilioService;

class SendTestSms extends Command
{
    protected $signature = 'twilio:test-sms {to} {message=Test depuis Twilio}';
    protected $description = 'Envoyer un SMS de test via Twilio';

    public function handle(TwilioService $twilio): int
    {
        $to = $this->argument('to');
        $message = $this->argument('message');
        if ($twilio->sendSms($to, $message)) {
            $this->info('SMS envoyé.');
            return self::SUCCESS;
        }
        $err = method_exists($twilio, 'getLastError') ? $twilio->getLastError() : null;
        $this->error('Echec envoi SMS.' . ($err ? ' Détail: '.$err : ' Voir logs.'));
        return self::FAILURE;
    }
}
