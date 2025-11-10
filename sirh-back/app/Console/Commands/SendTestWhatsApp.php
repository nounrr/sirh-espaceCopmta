<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\TwilioService;

class SendTestWhatsApp extends Command
{
    protected $signature = 'twilio:test-wa {to} {message=Test WhatsApp}';
    protected $description = 'Envoyer un message WhatsApp texte via Twilio';

    public function handle(TwilioService $twilio): int
    {
        $to = $this->argument('to');
        $message = $this->argument('message');
        if ($twilio->sendWhatsApp($to, $message)) {
            $this->info('WhatsApp envoyé.');
            return self::SUCCESS;
        }
        $err = method_exists($twilio, 'getLastError') ? $twilio->getLastError() : null;
        $this->error('Echec envoi WhatsApp.' . ($err ? ' Détail: '.$err : ' Voir logs.'));
        return self::FAILURE;
    }
}
