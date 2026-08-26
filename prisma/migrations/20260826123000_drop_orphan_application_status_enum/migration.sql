-- Drops the `ApplicationStatus` enum type, which has been orphaned since
-- 20260403194138_add_new_application_table replaced `job_application.status`
-- with a TEXT column. No column references the type (verified against
-- pg_attribute before writing this migration), so this is a definition-only
-- change and touches no rows.
DROP TYPE "ApplicationStatus";
