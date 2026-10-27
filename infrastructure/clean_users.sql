-- 1. Support CHECKED_IN status on tickets enum
ALTER TABLE tickets MODIFY COLUMN status ENUM('PENDING','CONFIRMED','CANCELLED','CHECKED_IN') DEFAULT 'PENDING';

-- 2. Clear all tickets and reset capacity for all events
DELETE FROM tickets;
ALTER TABLE tickets AUTO_INCREMENT = 1;

-- 3. Reassign all campus events to Cloud Admin (id = 1) so events are preserved
UPDATE events SET organizer_id = 1;
UPDATE events SET available_tickets = capacity;

-- 4. Delete all users except Admin (id = 1)
DELETE FROM users WHERE id != 1;

-- 5. Ensure Admin has password 'admin'
UPDATE users SET password_hash = '$2a$10$.8cpcFG/asGTj9YeMua7mOWEQ94fJPl8EtWj3l/0u7g2yHXfe79pe' WHERE id = 1;

-- 6. Verify result
SELECT id, name, email, role FROM users;
SELECT id, title, available_tickets, capacity, organizer_id FROM events;
SELECT COUNT(*) as remaining_tickets FROM tickets;
