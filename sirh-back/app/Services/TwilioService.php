<?php

namespace App\Services;

use Twilio\Rest\Client;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;
use Throwable;

class TwilioService
{
    protected array $config;
    private ?string $lastError = null;
    private const WA_BLOCK_CACHE_KEY = 'twilio:wa:blocked_until';

    public function __construct(private Client $client, array $config = [])
    {
        // Accept passed config or fallback to global config helper
        $this->config = $config ?: (config('twilio') ?? []);
    }

    public function sendSms(string $to, string $message): bool
    {
        try {
            $from = $this->config['from'] ?? null;
            if (!$from) {
                throw new \RuntimeException('Twilio from number not configured');
            }
            $this->client->messages->create($to, [
                'from' => $from,
                'body' => $message,
            ]);
            return true;
        } catch (Throwable $e) {
            $this->lastError = $e->getMessage();
            Log::error('Twilio SMS error: '.$e->getMessage(), ['exception' => $e]);
            return false;
        }
    }

    public function sendWhatsApp(string $to, string $message): bool
    {
        try {
            if ($this->isWaBlocked()) {
                Log::warning('Twilio WhatsApp skipped: daily limit active');
                return false;
            }
            $from = $this->config['whatsapp_from'] ?? null;
            if (!$from) {
                throw new \RuntimeException('Twilio WhatsApp from number not configured');
            }
            if (!str_starts_with($to, 'whatsapp:')) {
                $to = 'whatsapp:'.$to;
            }
            $this->client->messages->create($to, [
                'from' => $from,
                'body' => $message,
            ]);
            return true;
        } catch (Throwable $e) {
            $this->lastError = $e->getMessage();
            if ($this->isDailyLimitError($e)) {
                $until = $this->blockWaUntilMidnight();
                Log::warning('Twilio WhatsApp daily limit reached; blocking until '.$until->toDateTimeString());
            }
            Log::error('Twilio WhatsApp error: '.$e->getMessage(), ['exception' => $e]);
            return false;
        }
    }

    /**
     * Send a WhatsApp template message using Twilio Content API (ContentSid + ContentVariables)
     * @param string $to E.164 recipient (with or without whatsapp: prefix)
     * @param string $contentSid Twilio Content Template SID (HX...)
     * @param array $variables Placeholder map, e.g. ['1' => '12/1', '2' => '3pm']
     */
    public function sendWhatsAppTemplate(string $to, string $contentSid, array|string $variables = []): bool
    {
        try {
            if ($this->isWaBlocked()) {
                Log::warning('Twilio WhatsApp skipped (template): daily limit active');
                return false;
            }
            $from = $this->config['whatsapp_from'] ?? null;
            if (!$from) {
                throw new \RuntimeException('Twilio WhatsApp from number not configured');
            }
            if (!str_starts_with($to, 'whatsapp:')) {
                $to = 'whatsapp:'.$to;
            }
            // Twilio expects JSON string for contentVariables
            if (is_string($variables)) {
                $contentVariables = $variables;
                // quick validation looks like JSON object
                if (!str_starts_with(trim($contentVariables), '{')) {
                    throw new \RuntimeException('contentVariables must be a JSON object string');
                }
            } else {
                $contentVariables = json_encode($variables, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                if ($contentVariables === false) {
                    throw new \RuntimeException('Invalid content variables');
                }
            }

            $this->client->messages->create($to, [
                'from' => $from,
                'contentSid' => $contentSid,
                'contentVariables' => $contentVariables,
            ]);
            return true;
        } catch (Throwable $e) {
            $this->lastError = $e->getMessage();
            if ($this->isDailyLimitError($e)) {
                $until = $this->blockWaUntilMidnight();
                Log::warning('Twilio WhatsApp daily limit reached (template); blocking until '.$until->toDateTimeString());
            }
            Log::error('Twilio WhatsApp template error: '.$e->getMessage(), ['exception' => $e]);
            return false;
        }
    }

    public function startVerification(string $to, string $channel = 'sms'): bool
    {
        try {
            $verifySid = $this->config['verify_sid'] ?? null;
            if (!$verifySid) {
                throw new \RuntimeException('Twilio Verify SID not configured');
            }
            $this->client->verify->v2->services($verifySid)
                ->verifications
                ->create($to, $channel);
            return true;
        } catch (Throwable $e) {
            $this->lastError = $e->getMessage();
            Log::error('Twilio start verification error: '.$e->getMessage(), ['exception' => $e]);
            return false;
        }
    }

    public function checkVerification(string $to, string $code): bool
    {
        try {
            $verifySid = $this->config['verify_sid'] ?? null;
            if (!$verifySid) {
                throw new \RuntimeException('Twilio Verify SID not configured');
            }
            $check = $this->client->verify->v2->services($verifySid)
                ->verificationChecks
                ->create(['to' => $to, 'code' => $code]);
            return ($check->status ?? '') === 'approved';
        } catch (Throwable $e) {
            $this->lastError = $e->getMessage();
            Log::error('Twilio check verification error: '.$e->getMessage(), ['exception' => $e]);
            return false;
        }
    }

    public function getLastError(): ?string
    {
        return $this->lastError;
    }

    /**
     * Determine if WhatsApp sending is currently blocked due to hitting the daily limit.
     */
    private function isWaBlocked(): bool
    {
        $untilTs = Cache::get(self::WA_BLOCK_CACHE_KEY);
        if (!$untilTs) {
            return false;
        }
        return Carbon::now()->timestamp < (int)$untilTs;
    }

    /**
     * Mark WhatsApp sending as blocked until the next midnight (local app timezone).
     * Returns the Carbon instance representing the unblock moment.
     */
    private function blockWaUntilMidnight(): Carbon
    {
        $now = Carbon::now();
        $until = $now->copy()->addDay()->startOfDay();
        Cache::put(self::WA_BLOCK_CACHE_KEY, $until->timestamp, $until);
        return $until;
    }

    /**
     * Heuristic to detect Twilio daily limit / rate limit errors to avoid spamming the API.
     */
    private function isDailyLimitError(Throwable $e): bool
    {
        // Twilio RestException typically contains HTTP 429 and code 63038 for daily messages limit
        $msg = strtolower($e->getMessage() ?? '');
        if (str_contains($msg, 'daily messages limit') || str_contains($msg, 'http 429')) {
            return true;
        }
        // Some SDK versions expose properties; avoid hard dependency
        if ($e instanceof \Twilio\Exceptions\RestException) {
            try {
                if (method_exists($e, 'getStatusCode') && (int) $e->getStatusCode() === 429) {
                    return true;
                }
            } catch (\Throwable) {}
        }
        return false;
    }
}
