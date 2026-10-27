-- Alter tables to add seats and category
ALTER TABLE tickets ADD COLUMN seats VARCHAR(255) NULL AFTER quantity;
ALTER TABLE events ADD COLUMN category VARCHAR(50) DEFAULT 'Tech & Cloud' AFTER ticket_price;

-- Update existing events
UPDATE events SET category = 'Tech & Cloud' WHERE id = 1;
UPDATE events SET category = 'Robotics & AI' WHERE id = 2;

-- Insert additional vibrant demo events
INSERT INTO events (id, title, description, date, time, location, capacity, available_tickets, ticket_price, category, flyer_url, organizer_id) VALUES
(3, 'Neon Horizon: Campus Music Fest & Battle of Bands', 'An electric evening of live indie bands, neon laser shows, and high-energy musical showdowns across university clubs.', '2026-11-25', '06:30 PM', 'Open Air Amphitheatre', 120, 110, 15.00, 'Music & Concerts', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800', 2),
(4, 'Midnight Esports Arena: Valorant & FC26 Championship', 'Compete in 5v5 tactical shooter brackets and console championships for university bragging rights and cash prizes.', '2026-11-30', '05:00 PM', 'Student Activity Arena', 64, 58, 10.00, 'Gaming', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800', 2),
(5, 'Robotics & Autonomous Drones Live Expo 2026', 'Witness cutting-edge AI drones, robotic arm obstacle courses, and automated rover exhibitions by university engineering labs.', '2026-12-05', '11:00 AM', 'Advanced Robotics Wing', 80, 72, 0.00, 'Robotics & AI', 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800', 2),
(6, 'Bollywood & Fusion Cultural Dance Gala', 'A vibrant celebration of classic and contemporary dance routines, theatrical storytelling, and cultural food stalls.', '2026-12-12', '07:00 PM', 'Grand Central Auditorium', 200, 185, 5.00, 'Cultural', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800', 2)
ON DUPLICATE KEY UPDATE 
title=VALUES(title), 
description=VALUES(description), 
date=VALUES(date), 
time=VALUES(time), 
location=VALUES(location), 
capacity=VALUES(capacity), 
available_tickets=VALUES(available_tickets), 
ticket_price=VALUES(ticket_price), 
category=VALUES(category), 
flyer_url=VALUES(flyer_url);
