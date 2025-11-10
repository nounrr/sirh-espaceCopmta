<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\TwilioService;

class SendTestWhatsAppTemplate extends Command
{
    protected $signature = 'twilio:test-wa-template {to} {contentSid} {variables?}';
    protected $description = 'Envoyer un message WhatsApp template via Twilio (ContentSid + ContentVariables). Variables JSON (ex: {"1":"12/1"}) ou key=val,key=val';

    public function handle(TwilioService $twilio): int
    {
        $to = $this->argument('to');
        $contentSid = $this->argument('contentSid');
        $varsInput = $this->argument('variables');

        $variables = [];
        if ($varsInput) {
            // If it looks like JSON, pass raw string to service to avoid re-encoding issues
            $trim = ltrim($varsInput);
            if (str_starts_with($trim, '{')) {
                $variables = $varsInput; // raw JSON string
            } else {
                // fallback parse key=val,key=val
                foreach (explode(',', $varsInput) as $pair) {
                    if (str_contains($pair, '=')) {
                        [$k, $v] = explode('=', $pair, 2);
                        $variables[trim($k)] = trim($v);
                    }
                }
            }
        }

        if ($twilio->sendWhatsAppTemplate($to, $contentSid, $variables)) {
            $this->info('WhatsApp template envoyé.');
            return self::SUCCESS;
        }
        $err = method_exists($twilio, 'getLastError') ? $twilio->getLastError() : null;
        $this->error('Echec envoi WhatsApp template.' . ($err ? ' Détail: '.$err : ' Voir logs.'));
        return self::FAILURE;
    }
}
