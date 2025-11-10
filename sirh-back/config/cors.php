<?php

return [
    'paths' => ['api/*', 'public/api/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => ['http://localhost:5173', 'http://127.0.0.1:5173','http://localhost:5174', 'http://127.0.0.1:5174','http://dct.smartrh.ma','http://dct.smartrh.ma/public','*'],
    'allowed_headers' => ['*'],
    'supports_credentials' => true,
];
