-- =============================================================================
-- Database Schema: eventmgmt
-- University Cloud Computing Project - Event Management & Ticketing
-- =============================================================================

CREATE DATABASE IF NOT EXISTS eventmgmt;
USE eventmgmt;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('attendee', 'organizer', 'admin') DEFAULT 'attendee',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Events Table
CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL,
    time VARCHAR(50) NOT NULL,
    location VARCHAR(255) NOT NULL,
    capacity INT NOT NULL,
    available_tickets INT NOT NULL,
    ticket_price DECIMAL(10, 2) DEFAULT 0.00,
    flyer_url VARCHAR(500) NULL,
    organizer_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Tickets Table
CREATE TABLE IF NOT EXISTS tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_code VARCHAR(64) NOT NULL UNIQUE,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    attendee_name VARCHAR(100) NOT NULL,
    attendee_email VARCHAR(150) NOT NULL,
    quantity INT DEFAULT 1,
    status ENUM('PENDING', 'CONFIRMED', 'CANCELLED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Seed Sample Data (Optional)
INSERT IGNORE INTO users (id, name, email, password_hash, role) VALUES
(1, 'Cloud Admin', 'admin@university.edu', '$2a$10$wT8FjU59wK.FqIqUv5P02.Z9C2B7t302f3JdG8H4Yh2z3P8FjU59w', 'admin'),
(2, 'Event Organizer', 'organizer@university.edu', '$2a$10$wT8FjU59wK.FqIqUv5P02.Z9C2B7t302f3JdG8H4Yh2z3P8FjU59w', 'organizer');
