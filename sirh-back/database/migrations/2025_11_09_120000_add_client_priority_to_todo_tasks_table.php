<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// This migration was malformed previously. It is now a no-op to avoid duplicate logic.
return new class extends Migration {
	public function up(): void
	{
		// Intentionally left blank. See 2025_11_09_120001_fix_add_client_priority_to_todo_tasks_table
		// and 2025_11_09_130000_update_status_enum_and_priority_in_todo_tasks_table for the real changes.
	}

	public function down(): void
	{
		// No-op
	}
};