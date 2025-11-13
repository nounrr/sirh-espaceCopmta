<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DepartementController;
use App\Http\Controllers\AbsenceRequestController;
use App\Http\Controllers\StatistiquesController;
use App\Http\Controllers\PointageController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AbsenceRequestExcelController;
use App\Http\Controllers\PointageImportController;
use App\Http\Controllers\DepartementExcelController;
use App\Http\Controllers\PointageExcelController;
use App\Http\Controllers\UserExcelController;
use App\Http\Controllers\StatistiquesExcelController;
use App\Http\Controllers\SocieteController;
use App\Http\Controllers\PointageDetailController;
use App\Http\Controllers\MonthlyPresenceExportController;
use App\Http\Controllers\SalaryExportController;
use App\Http\Controllers\TypeDocController;
use App\Http\Controllers\PublicationController;
use App\Http\Controllers\VoteController;
use App\Http\Controllers\CongeController;
use App\Http\Controllers\TodoListController;
use App\Http\Controllers\TodoTaskController;
use App\Http\Controllers\TaskCommentController;
use App\Http\Controllers\TodoTaskCancellationRequestController;
use App\Http\Controllers\UserTypeDocController;
use App\Http\Controllers\JourFerieController;
use App\Http\Controllers\CongeExportController;
use App\Http\Controllers\AuditController;
use App\Http\Controllers\SalaireController;
use App\Http\Controllers\ChargePersonnelController;
use App\Http\Controllers\TimeTrackingController;
use App\Http\Middleware\RoleMiddleware;

Route::resource('jours-feries', JourFerieController::class);
Route::get('/jours-feries/year/{year}', [JourFerieController::class, 'getByYear']);
Route::post('/jours-feries/date-range', [JourFerieController::class, 'getByDateRange']);

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/employes', [UserController::class, 'store']);

Route::post('/import-pointages', [PointageImportController::class, 'import'])->name('import.pointages');

Route::middleware('auth:sanctum')->group(function () {
    // Projects CRUD
    Route::get('/projects', [App\Http\Controllers\ProjectController::class, 'index']);
    Route::post('/projects', [App\Http\Controllers\ProjectController::class, 'store']);
    Route::get('/projects/{id}', [App\Http\Controllers\ProjectController::class, 'show']);
    Route::put('/projects/{id}', [App\Http\Controllers\ProjectController::class, 'update']);
    Route::delete('/projects/{id}', [App\Http\Controllers\ProjectController::class, 'destroy']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Charge Personnel CRUD
    Route::apiResource('charge-personnels', ChargePersonnelController::class);
    
    // Routes d'audit
    Route::prefix('audits')->group(function () {
        Route::get('/', [AuditController::class, 'index']);
        Route::get('/{id}', [AuditController::class, 'show']);
        Route::post('/entity-history', [AuditController::class, 'entityHistory']);
        Route::get('/dashboard/stats', [AuditController::class, 'dashboard']);
    });
    
Route::get('/statistiques/presence', [StatistiquesController::class, 'statistiquesPresence']);
Route::get('/departements', [DepartementController::class, 'index']);
Route::post('/departements', [DepartementController::class, 'store']);
Route::put('/departements', [DepartementController::class, 'update']);
Route::delete('/departements', [DepartementController::class, 'destroy']);
Route::get('/pointages-details', [PointageDetailController::class, 'index']);

Route::get('/societes', [SocieteController::class, 'index']);
Route::post('/societes', [SocieteController::class, 'store']);
Route::put('/societes', [SocieteController::class, 'update']);
Route::delete('/societes', [SocieteController::class, 'destroy']);
Route::post('/users/onesignal-player-id', [UserController::class, 'updatePlayerId']);
Route::get('/export-pointages', [MonthlyPresenceExportController::class, 'exportPointages']);
Route::get('/export-salaires', [SalaryExportController::class, 'exportSalaries']);


Route::get('/employes', [UserController::class, 'index']);
Route::get('/clients', [UserController::class, 'clients']);
Route::get('/clients/{id}', [UserController::class, 'show']);
Route::put('/clients/update/{id}', [UserController::class, 'update']);
Route::put('/employes/update/{id}', [UserController::class, 'update']);
// Route::put('/users/affecter/{id}', [UserController::class, 'updateSocieteDepartement']);
Route::post('/users/affecter-societe-departement', [UserController::class, 'affecterSocieteDepartement']);

Route::delete('/employes', [UserController::class, 'destroy']);
Route::get('/employes/temp', [UserController::class, 'EmployeTemp']);
Route::post('/clients', [UserController::class, 'storeClient']);
Route::delete('/clients', [UserController::class, 'destroy']);

Route::get('/absences', [AbsenceRequestController::class, 'index']);
Route::post('/absences', [AbsenceRequestController::class, 'store']);
Route::match(['post', 'put'], '/absences/update/{id}', [AbsenceRequestController::class, 'update']);
Route::put('/absences/{id}/status', [AbsenceRequestController::class, 'updateStatus']);
Route::delete('/absences', [AbsenceRequestController::class, 'destroy']);

       Route::get('/salaires', [SalaireController::class, 'index']);
        Route::post('/salaires', [SalaireController::class, 'store']);
        Route::get('/salaires/{id}', [SalaireController::class, 'show']);
        Route::put('/salaires/{id}', [SalaireController::class, 'update']);
        Route::delete('/salaires/{id}', [SalaireController::class, 'destroy']);
        Route::get('/users/{userId}/salaire-actuel', [SalaireController::class, 'getSalaireActuel']);
        Route::get('/users/{userId}/salaires-historique', [SalaireController::class, 'getHistorique']);
        Route::get('/salaires-statistiques', [SalaireController::class, 'getStatistiques']);

Route::get('/pointages', [PointageController::class, 'index']);
Route::post('/pointages', [PointageController::class, 'store']);
Route::put('/pointages', [PointageController::class, 'update']);
Route::delete('/pointages', [PointageController::class, 'destroy']);
Route::put('/pointages/{id}/valider', [PointageController::class, 'valider']);
Route::put('/pointages/{id}/invalider', [PointageController::class, 'invalider']);

// Route::get('/export-pointages', [PointageExcelController::class, 'exportPointages']);

//Docs
Route::resource('type-docs', TypeDocController::class);
Route::get('/user-docs', [UserTypeDocController::class, 'getUserDocs']);
Route::post('/user-docs/{userId}', [UserTypeDocController::class, 'uploadDocument']);
Route::post('/user-docs/{userId}/multiple', [UserTypeDocController::class, 'uploadMultipleDocuments']);
Route::delete('/user-docs/{userId}/{typeDocId}', [UserTypeDocController::class, 'deleteDocument']);

    //to do lisst
    Route::get('/todo-lists', [TodoListController::class, 'index']);
    Route::post('/todo-lists', [TodoListController::class, 'store']);
    Route::get('/todo-lists/{id}', [TodoListController::class, 'show']);
    Route::put('/todo-lists/{id}', [TodoListController::class, 'update']);
    Route::delete('/todo-lists/{id}', [TodoListController::class, 'destroy']);

    // Tasks (par liste)
    Route::post('/todo-lists/{id}/tasks', [TodoTaskController::class, 'store']);
    Route::put('/tasks/{id}', [TodoTaskController::class, 'update']);
    Route::delete('/todo-tasks/{id}', [TodoTaskController::class, 'destroy']);
    // Route for frontend compatibility
    Route::put('/todo-tasks/{id}', [TodoTaskController::class, 'update']);
    Route::post('/tasks/{id}/proofs', [TodoTaskController::class, 'storeProofs']);

    // Task cancellation requests
    Route::post('/todo-tasks/{id}/cancellation-requests', [TodoTaskCancellationRequestController::class, 'store']);
    Route::get('/todo-task-cancellation-requests', [TodoTaskCancellationRequestController::class, 'index']);
    Route::patch('/todo-task-cancellation-requests/{id}', [TodoTaskCancellationRequestController::class, 'update']);
    Route::delete('/todo-task-cancellation-requests/{id}', [TodoTaskCancellationRequestController::class, 'destroy']);

    // Bulk task reminders
    Route::post('/todo-tasks/bulk-reminders', [TodoTaskController::class, 'sendBulkReminders']);

    // Task Comments Routes
    Route::get('/tasks/{taskId}/comments', [TaskCommentController::class, 'index']);
    Route::post('/tasks/{taskId}/comments', [TaskCommentController::class, 'store']);
    Route::put('/comments/{commentId}', [TaskCommentController::class, 'update']);
    Route::delete('/comments/{commentId}', [TaskCommentController::class, 'destroy']);

    // Time tracking for tasks
    Route::post('/tasks/{task}/start', [TimeTrackingController::class, 'start']);
    Route::post('/tasks/{task}/stop', [TimeTrackingController::class, 'stop']);
    Route::post('/tasks/{task}/pause', [TimeTrackingController::class, 'pause']);
    Route::post('/tasks/{task}/finish', [TimeTrackingController::class, 'finish']);
    Route::get('/tasks/{task}/active-entry', [TimeTrackingController::class, 'activeEntry']);
    Route::get('/tasks/{task}/time-summary', [TimeTrackingController::class, 'timeSummary']);
    Route::get('/my/active-entry', [TimeTrackingController::class, 'myActiveEntry']);
    Route::get('/my/active-entries', [TimeTrackingController::class, 'myActiveEntries']);

    //pub et vote
    Route::get('/publications', [PublicationController::class, 'index']);
    Route::get('/publications/{id}', [PublicationController::class, 'show']);
Route::post('/publications', [PublicationController::class, 'store']);
Route::put('/publications/{id}/statut', [PublicationController::class, 'update']);
Route::delete('/publications/{id}', [PublicationController::class, 'destroy']);
Route::post('/publications/bulk-delete', [PublicationController::class, 'destroyMany']);


// Voter à un sondage
Route::post('/votes', [VoteController::class, 'store']);
// Récupérer les votes (tous pour RH, sinon ceux de l'utilisateur connecté)
Route::get('/votes', [VoteController::class, 'index']);

// Routes pour les jours fériés

});
// imports

Route::post('/departements/import', [DepartementExcelController::class, 'importDepartements'])->name('departements.import');
Route::post('/import-employes', [UserExcelController::class, 'import'])->name('import.employes');

// exports

Route::get('/export-employes', [UserExcelController::class, 'exportUsers']);
Route::get('/export-absence-requests', [AbsenceRequestExcelController::class, 'exportAbsences']);
Route::get('/export-departements', [DepartementExcelController::class, 'exportDepartements']);
Route::get('/export-conges', [CongeExportController::class, 'exportCongés']);

Route::middleware(['auth:sanctum', 'role:RH'])->group(function () {
    Route::post('/assign-role', [AuthController::class, 'assignRole']);
    Route::get('/user_permission', function (Request $request) {
        $user = $request->user();
        return response()->json([
            'user' => $user->name,
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions(),
        ]);
    });
});



Route::get('/conge/pdf/{id}', [AbsenceRequestController::class, 'generateCongePdf'])
    ->name('absence-requests.export-conge');
Route::get('/attestation-travail/pdf/{id}', [AbsenceRequestController::class, 'exportAttestationTravail']);

   

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');



