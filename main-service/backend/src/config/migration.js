import { dbPool } from './db.js';
import bcrypt from 'bcrypt';

export async function runMigration() {
  console.log('[Migration] Starting database migration check...');
  const connection = await dbPool.getConnection();
  try {
    // 1. Check & Add 'must_change_password' column to 'users' table
    const [columns] = await connection.query("SHOW COLUMNS FROM `users` LIKE 'must_change_password'");
    if (columns.length === 0) {
      console.log('[Migration] Adding column must_change_password to users...');
      await connection.query("ALTER TABLE `users` ADD COLUMN `must_change_password` TINYINT(1) NOT NULL DEFAULT 1");
      // For existing users, set to 0 (no force change)
      await connection.query("UPDATE `users` SET `must_change_password` = 0");
      console.log('[Migration] Column must_change_password added successfully.');
    }

    // 2. Check & Add 'mill_manager' role to 'roles' table
    const [roles] = await connection.query("SELECT id FROM `roles` WHERE name = 'mill_manager'");
    let millManagerRoleId;
    if (roles.length === 0) {
      console.log('[Migration] Adding mill_manager role...');
      const [res] = await connection.query(
        "INSERT INTO `roles` (name, description) VALUES ('mill_manager', 'Mill Manager with access to user management and permissions')"
      );
      millManagerRoleId = res.insertId;
      console.log('[Migration] Role mill_manager added.');
    } else {
      millManagerRoleId = roles[0].id;
    }

    // 3. Create user_permissions table if not exists
    console.log('[Migration] Checking/creating user_permissions table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_permissions (
        user_id INT UNSIGNED NOT NULL,
        permission_id INT NOT NULL,
        PRIMARY KEY (user_id, permission_id),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. One-time copy from role_permissions to user_permissions if empty
    const [existingUserPerms] = await connection.query("SELECT 1 FROM user_permissions LIMIT 1");
    if (existingUserPerms.length === 0) {
      console.log('[Migration] user_permissions table is empty. Copying mappings from role_permissions...');
      await connection.query(`
        INSERT IGNORE INTO user_permissions (user_id, permission_id)
        SELECT u.id, rp.permission_id
        FROM users u
        JOIN role_permissions rp ON u.role_id = rp.role_id
      `);
      console.log('[Migration] Copied role permissions to all users in user_permissions.');
    }

    // 5. Migrate permissions (exactly once, checked by existence of colons in slug)
    const [hasNewPerms] = await connection.query("SELECT id FROM permissions WHERE slug LIKE '%:%' LIMIT 1");
    if (hasNewPerms.length === 0) {
      console.log('[Migration] No menu-based permissions detected. Migrating permissions table...');

      // Stations list (from registry or hardcoded list)
      const stations = [
        'Security', 'Weighbridge', 'Grading Ramp', 'Loading Ramp',
        'Sterilizer Station', 'Threshing Station', 'EFB Plant', 'Press Station',
        'Kernel Plant', 'Oil Clarification Room', 'Boiler House', 'Engine Room',
        'Raw Water Treatment', 'DAF / OSR', 'CMRS', 'Effluent Treatment'
      ];

      const newPerms = [
        // Dashboard
        { slug: 'Dashboard:Production Dashboard', name: 'Dashboard - Production Dashboard', description: 'Access to Production Dashboard' },
        { slug: 'Dashboard:Daily Operation Dashboard', name: 'Dashboard - Daily Operation Dashboard', description: 'Access to Daily Operation Dashboard' },
        
        // Overview
        { slug: 'Overview:3D Plant View', name: 'Overview - 3D Plant View', description: 'Access to 3D Plant View' },
        { slug: 'Overview:2D Layout Plant', name: 'Overview - 2D Layout Plant', description: 'Access to 2D Layout Plant' },
        
        // Maintenance
        { slug: 'Maintenance:Spare Part Replacement', name: 'Maintenance - Spare Part Replacement', description: 'Access to Spare Part Replacement log' },
        { slug: 'Maintenance:O&G Replacement', name: 'Maintenance - O&G Replacement', description: 'Access to O&G Replacement log' },
        { slug: 'Maintenance:Instrument Calibration', name: 'Maintenance - Instrument Calibration', description: 'Access to Instrument Calibration log' },
        
        // Activity Log
        { slug: 'Activity Log:User Login', name: 'Activity Log - User Login', description: 'Access to User Login Activity Log' },
        { slug: 'Activity Log:Settings Changes', name: 'Activity Log - Settings Changes', description: 'Access to Settings Changes Activity Log' },
        
        // Alarm
        { slug: 'Alarm:Alarm Center', name: 'Alarm - Alarm Center', description: 'Access to Alarm Center' },
        { slug: 'Alarm:Notification Settings', name: 'Alarm - Notification Settings', description: 'Access to Notification Settings' },
        { slug: 'Alarm:System Error', name: 'Alarm - System Error', description: 'Access to System Error alarms' },
        { slug: 'Alarm:Internet Error', name: 'Alarm - Internet Error', description: 'Access to Internet Error alarms' },
        { slug: 'Alarm:Instrument Error', name: 'Alarm - Instrument Error', description: 'Access to Instrument Error alarms' },
        { slug: 'Alarm:Power Error', name: 'Alarm - Power Error', description: 'Access to Power Error alarms' },
        { slug: 'Alarm:Breakdown', name: 'Alarm - Breakdown', description: 'Access to Breakdown alarms' },
        { slug: 'Alarm:Process Disturbance', name: 'Alarm - Process Disturbance', description: 'Access to Process Disturbance alarms' },
        
        // Report
        { slug: 'Report:Running Hours', name: 'Report - Running Hours', description: 'Access to Running Hours report' },
        { slug: 'Report:Daily Report Abnormalities', name: 'Report - Daily Report Abnormalities', description: 'Access to Daily Report Abnormalities' },
        { slug: 'Report:Daily Report Mill Stability', name: 'Report - Daily Report Mill Stability', description: 'Access to Daily Report Mill Stability' },
        
        // Contacts
        { slug: 'Contacts:Developer', name: 'Contacts - Developer', description: 'Access to Developer contacts' },
        { slug: 'Contacts:Site Owner', name: 'Contacts - Site Owner', description: 'Access to Site Owner contacts' },
        
        // System
        { slug: 'System:User Management', name: 'System - User Management', description: 'Access to User and Role management panel' },
        { slug: 'System:System Configuration', name: 'System - System Configuration', description: 'Access to System Configuration settings' }
      ];

      // Add Station Views
      stations.forEach(station => {
        newPerms.push({
          slug: `Station View:${station}`,
          name: `Station View - ${station}`,
          description: `Access to ${station} View`
        });
      });

      // Add Logsheet Views
      stations.forEach(station => {
        newPerms.push({
          slug: `Logsheet:${station}`,
          name: `Logsheet - ${station}`,
          description: `Access to ${station} Logsheet`
        });
      });

      // Start Transaction
      await connection.beginTransaction();
      try {
        // Clear all previous permissions (cascades to role_permissions)
        await connection.query("DELETE FROM `permissions`");

        // Insert new ones
        for (const p of newPerms) {
          await connection.query(
            "INSERT INTO `permissions` (slug, name, description) VALUES (?, ?, ?)",
            [p.slug, p.name, p.description]
          );
        }

        // Fetch all generated permission IDs
        const [permRows] = await connection.query("SELECT id FROM `permissions`");
        const allPermIds = permRows.map(r => r.id);

        // Fetch developer and admin role IDs
        const [[devRole]] = await connection.query("SELECT id FROM `roles` WHERE name = 'developer'");
        const [[adminRole]] = await connection.query("SELECT id FROM `roles` WHERE name = 'admin'");

        // Reset users table to contain exactly 3 users: dev, admin, manager
        console.log('[Migration] Resetting users table to default accounts...');
        await connection.query("DELETE FROM `users`");
        const defaultHash = await bcrypt.hash('password123', 10);
        
        let devUserId, adminUserId, managerUserId;
        if (devRole) {
          const [res] = await connection.query(
            "INSERT INTO `users` (username, password_hash, position_title, company_name, role_id, must_change_password) VALUES (?, ?, ?, ?, ?, ?)",
            ['dev', defaultHash, 'Lead Developer', 'PT Premier Engineering Indonesia', devRole.id, 0]
          );
          devUserId = res.insertId;
        }
        if (adminRole) {
          const [res] = await connection.query(
            "INSERT INTO `users` (username, password_hash, position_title, company_name, role_id, must_change_password) VALUES (?, ?, ?, ?, ?, ?)",
            ['admin', defaultHash, 'System Administrator', 'IPOMAS Internal', adminRole.id, 0]
          );
          adminUserId = res.insertId;
        }
        if (millManagerRoleId) {
          const [res] = await connection.query(
            "INSERT INTO `users` (username, password_hash, position_title, company_name, role_id, must_change_password) VALUES (?, ?, ?, ?, ?, ?)",
            ['manager', defaultHash, 'Mill Manager', 'Smart Oil Mill', millManagerRoleId, 0]
          );
          managerUserId = res.insertId;
        }

        const assignAllUserPerms = async (userId) => {
          if (!userId) return;
          for (const pid of allPermIds) {
            await connection.query(
              "INSERT IGNORE INTO `user_permissions` (user_id, permission_id) VALUES (?, ?)",
              [userId, pid]
            );
          }
        };

        if (devUserId) await assignAllUserPerms(devUserId);
        if (adminUserId) await assignAllUserPerms(adminUserId);
        if (managerUserId) await assignAllUserPerms(managerUserId);

        const assignAllPerms = async (roleId) => {
          if (!roleId) return;
          await connection.query("DELETE FROM `role_permissions` WHERE role_id = ?", [roleId]);
          for (const pid of allPermIds) {
            await connection.query(
              "INSERT INTO `role_permissions` (role_id, permission_id) VALUES (?, ?)",
              [roleId, pid]
            );
          }
        };

        // Developer, Admin, and Mill Manager should get all role permissions by default
        if (devRole) await assignAllPerms(devRole.id);
        if (adminRole) await assignAllPerms(adminRole.id);
        if (millManagerRoleId) await assignAllPerms(millManagerRoleId);

        await connection.commit();
        console.log('[Migration] Permissions migrated and assigned successfully!');
      } catch (txErr) {
        await connection.rollback();
        throw txErr;
      }
    } else {
      console.log('[Migration] Menu-based permissions already present. Skipping permissions migration.');
    }
  } catch (err) {
    console.error('[Migration] Error running database migration:', err.message);
  } finally {
    connection.release();
  }
}
