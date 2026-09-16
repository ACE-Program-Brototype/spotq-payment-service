-- Rename Self-Service Pro plan to Self Pro
UPDATE "subscription_plans"
SET "name" = 'Self Pro', "code" = 'SELF_PRO'
WHERE "code" = 'SELF_SERVICE_PRO';
