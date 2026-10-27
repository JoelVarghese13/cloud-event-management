UPDATE users SET password_hash = '$2a$10$.8cpcFG/asGTj9YeMua7mOWEQ94fJPl8EtWj3l/0u7g2yHXfe79pe' WHERE email = 'joelvarghese013@gmail.com' OR id IN (1, 2, 5);
SELECT id, name, email, role FROM users;
