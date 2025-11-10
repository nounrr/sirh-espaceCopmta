<?php
use Illuminate\Contracts\Console\Kernel;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

$from = now()->subWeek()->toDateString();
$to = now()->toDateString();

// Collect metrics calling controller methods directly
$controller = new \App\Http\Controllers\DashboardAnalyticsController();

// Fake request helper
function req(array $q){ return new \Illuminate\Http\Request($q); }

$status = $controller->statusOverview(req([]));
$time = $controller->timeBreakdown(req(['from'=>$from,'to'=>$to]));
$profit = $controller->profitability(req(['from'=>$from,'to'=>$to,'markup'=>1.3]));
$team = $controller->teamPerformance(req(['from'=>$from,'to'=>$to]));
$overdue = $controller->overdueTasks(req([]));
$info = $controller->infoRequestSummary(req([]));

$out = [
  'status' => $status->getData(true),
  'time' => $time->getData(true),
  'profitability' => $profit->getData(true),
  'team' => $team->getData(true),
  'overdue' => $overdue->getData(true),
  'infoRequests' => $info->getData(true),
];

echo json_encode($out, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE)."\n";