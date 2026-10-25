const mysql = require('mysql2/promise');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
require('dotenv').config();

const region = process.env.AWS_REGION || 'ap-south-1';
const ssm = new SSMClient({ region });

// In-Memory fallback database for local testing when MySQL / RDS is not reachable
const localStore = {
  users: [
    {
      id: 1,
      name: 'Cloud Admin',
      email: 'admin@university.edu',
      password_hash: '$2a$10$wT8FjU59wK.FqIqUv5P02.Z9C2B7t302f3JdG8H4Yh2z3P8FjU59w', // password: admin
      role: 'admin',
      created_at: new Date()
    },
    {
      id: 2,
      name: 'Faculty Organizer',
      email: 'organizer@university.edu',
      password_hash: '$2a$10$wT8FjU59wK.FqIqUv5P02.Z9C2B7t302f3JdG8H4Yh2z3P8FjU59w',
      role: 'organizer',
      created_at: new Date()
    }
  ],
  events: [
    {
      id: 1,
      title: 'AWS Cloud Computing & Serverless Hackathon 2026',
      description: 'Hands-on architectural competition featuring Lambda, SQS, and RDS orchestration.',
      date: '2026-11-15',
      time: '09:00 AM',
      location: 'Main Auditorium / AWS Lab',
      capacity: 50,
      available_tickets: 45,
      ticket_price: '0.00',
      flyer_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
      organizer_id: 2,
      organizer_name: 'Faculty Organizer',
      organizer_email: 'organizer@university.edu',
      created_at: new Date()
    },
    {
      id: 2,
      title: 'Annual TechFest & AI Symposium',
      description: 'Keynotes from cloud engineers and artificial intelligence researchers.',
      date: '2026-12-01',
      time: '10:30 AM',
      location: 'Science & Engineering Complex',
      capacity: 150,
      available_tickets: 120,
      ticket_price: '15.00',
      flyer_url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800',
      organizer_id: 2,
      organizer_name: 'Faculty Organizer',
      organizer_email: 'organizer@university.edu',
      created_at: new Date()
    }
  ],
  tickets: []
};

async function getSSMParam(paramName, isSecure = false) {
  try {
    const cmd = new GetParameterCommand({
      Name: paramName,
      WithDecryption: isSecure
    });
    const res = await ssm.send(cmd);
    return res.Parameter ? res.Parameter.Value : null;
  } catch (err) {
    return null;
  }
}

let pool = null;
let useLocalFallback = false;

async function initDB() {
  if (pool) return pool;
  if (useLocalFallback) return null;

  try {
    const [ssmHost, ssmUser, ssmPass] = await Promise.all([
      getSSMParam('/event-mgmt/db/host', false),
      getSSMParam('/event-mgmt/db/username', false),
      getSSMParam('/event-mgmt/db/password', true)
    ]);

    const dbConfig = {
      host: ssmHost || process.env.DB_HOST || 'localhost',
      user: ssmUser || process.env.DB_USER || 'admin',
      password: ssmPass || process.env.DB_PASSWORD || 'YourSecurePassword123!',
      database: process.env.DB_NAME || 'eventmgmt',
      connectTimeout: 2000,
      waitForConnections: true,
      connectionLimit: 5
    };

    const tempPool = mysql.createPool(dbConfig);
    const conn = await tempPool.getConnection();
    conn.release();
    pool = tempPool;
    console.log(`[DB] Connected successfully to MySQL Host: ${dbConfig.host}`);
    return pool;
  } catch (err) {
    console.warn(`[DB] Notice: MySQL host unreachable (${err.message}).`);
    console.log('[DB] Activating Zero-Setup Local In-Memory Fallback Mode.');
    useLocalFallback = true;
    return null;
  }
}

// Universal query dispatcher
async function query(sql, params = []) {
  if (!useLocalFallback && !pool) {
    await initDB();
  }

  if (pool && !useLocalFallback) {
    return pool.execute(sql, params);
  }

  // Handle queries using local in-memory mock engine
  const trimmed = sql.trim().toUpperCase();

  // 1. SELECT queries
  if (trimmed.startsWith('SELECT')) {
    if (trimmed.includes('FROM USERS')) {
      if (trimmed.includes('WHERE EMAIL = ?')) {
        const found = localStore.users.filter(u => u.email === params[0]);
        return [found, []];
      }
      if (trimmed.includes('WHERE ID = ?')) {
        const found = localStore.users.filter(u => u.id === params[0]);
        return [found, []];
      }
      return [localStore.users, []];
    }

    if (trimmed.includes('FROM EVENTS')) {
      if (trimmed.includes('WHERE E.ID = ?') || trimmed.includes('WHERE ID = ?')) {
        const found = localStore.events.filter(e => e.id === Number(params[0]));
        return [found, []];
      }
      if (trimmed.includes('WHERE ORGANIZER_ID = ?')) {
        const found = localStore.events.filter(e => e.organizer_id === Number(params[0]));
        return [found, []];
      }
      if (params.length > 0 && trimmed.includes('LIKE')) {
        const kw = params[0].replace(/%/g, '').toLowerCase();
        const found = localStore.events.filter(e =>
          e.title.toLowerCase().includes(kw) ||
          e.description.toLowerCase().includes(kw) ||
          e.location.toLowerCase().includes(kw)
        );
        return [found, []];
      }
      return [localStore.events, []];
    }

    if (trimmed.includes('FROM TICKETS')) {
      if (trimmed.includes('WHERE T.USER_ID = ?') || trimmed.includes('WHERE USER_ID = ?')) {
        const userTickets = localStore.tickets.filter(t => t.user_id === Number(params[0])).map(t => {
          const ev = localStore.events.find(e => e.id === t.event_id) || {};
          return {
            ...t,
            event_title: ev.title || 'Campus Event',
            event_date: ev.date || 'TBD',
            event_time: ev.time || 'TBD',
            event_location: ev.location || 'Venue',
            event_flyer: ev.flyer_url
          };
        });
        return [userTickets, []];
      }
      if (trimmed.includes('WHERE T.EVENT_ID = ?') || trimmed.includes('WHERE EVENT_ID = ?')) {
        const found = localStore.tickets.filter(t => t.event_id === Number(params[0]));
        return [found, []];
      }
      return [localStore.tickets, []];
    }

    return [[], []];
  }

  // 2. INSERT queries
  if (trimmed.startsWith('INSERT INTO USERS')) {
    const newUser = {
      id: localStore.users.length + 1,
      name: params[0],
      email: params[1],
      password_hash: params[2],
      role: params[3] || 'attendee',
      created_at: new Date()
    };
    localStore.users.push(newUser);
    return [{ insertId: newUser.id }, []];
  }

  if (trimmed.startsWith('INSERT INTO EVENTS')) {
    const newEvt = {
      id: localStore.events.length + 1,
      title: params[0],
      description: params[1],
      date: params[2],
      time: params[3],
      location: params[4],
      capacity: parseInt(params[5], 10),
      available_tickets: parseInt(params[6], 10),
      ticket_price: params[7],
      flyer_url: params[8],
      organizer_id: params[9],
      created_at: new Date()
    };
    localStore.events.push(newEvt);
    return [{ insertId: newEvt.id }, []];
  }

  if (trimmed.startsWith('INSERT INTO TICKETS')) {
    const newTkt = {
      id: localStore.tickets.length + 1,
      ticket_code: params[0],
      event_id: params[1],
      user_id: params[2],
      attendee_name: params[3],
      attendee_email: params[4],
      quantity: params[5],
      status: 'CONFIRMED', // Instantly confirm in local mode
      created_at: new Date()
    };
    localStore.tickets.push(newTkt);
    return [{ insertId: newTkt.id }, []];
  }

  // 3. UPDATE queries
  if (trimmed.startsWith('UPDATE EVENTS')) {
    const qty = params[0];
    const eventId = params[1];
    const ev = localStore.events.find(e => e.id === Number(eventId));
    if (ev) {
      ev.available_tickets = Math.max(0, ev.available_tickets - qty);
    }
    return [{ affectedRows: 1 }, []];
  }

  if (trimmed.startsWith('UPDATE TICKETS')) {
    const tkt = localStore.tickets.find(t => t.id === Number(params[0]));
    if (tkt) {
      tkt.status = 'CONFIRMED';
    }
    return [{ affectedRows: 1 }, []];
  }

  // 4. DELETE queries
  if (trimmed.startsWith('DELETE FROM EVENTS')) {
    const eventId = Number(params[0]);
    localStore.events = localStore.events.filter(e => e.id !== eventId);
    return [{ affectedRows: 1 }, []];
  }

  return [[], []];
}

module.exports = {
  initDB,
  query
};
