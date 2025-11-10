
<?php

return [
    'sid' => env('TWILIO_ACCOUNT_SID'),
    'token' => env('TWILIO_AUTH_TOKEN'),
    'from' => env('TWILIO_FROM'), // E.164 sender number
    'whatsapp_from' => env('TWILIO_WHATSAPP_FROM'), // whatsapp:+123456789
    'verify_sid' => env('TWILIO_VERIFY_SID'),
    // Optional: WhatsApp Content Template SID for task assignment notifications (HX...)
    'task_assigned_content_sid' => env('TWILIO_TASK_ASSIGNED_CONTENT_SID'),
    'task_completed_content_sid' => env('TWILIO_TASK_COMPLETED_CONTENT_SID'),
    'task_cancelled_content_sid' => env('TWILIO_TASK_CANCELLED_CONTENT_SID'),
    'task_overdue_content_sid' => env('TWILIO_TASK_OVERDUE_CONTENT_SID'),
    'task_reminder_content_sid' => env('TWILIO_TASK_REMINDER_CONTENT_SID'),
    // Default country code used to normalize local numbers (e.g., '+212')
    'default_country_code' => env('TWILIO_DEFAULT_COUNTRY_CODE', '+212'),
    // If true, run task assignment notifications synchronously after commit (useful in dev)
    'sync_on_task_events' => env('TWILIO_SYNC_ON_TASK_EVENTS', false),
];
