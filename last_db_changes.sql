-- Changes from 2025_12_08_000010_add_porfeuille_to_users_table.php
ALTER TABLE users ADD COLUMN porfeuille VARCHAR(255) NULL AFTER typeContrat;

-- Changes from 2025_12_11_000000_add_resp_com_role.php
INSERT INTO roles (name, guard_name, created_at, updated_at) 
SELECT 'Resp_Com', 'web', NOW(), NOW() 
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Resp_Com');
