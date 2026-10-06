import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'store.json');

const defaultState = {
  resources: [
    {
      id: 'r1',
      name: 'Riverside Community Hall',
      type: 'facility',
      location: '12 River St',
      capacity: 150,
      description: 'Large hall suitable for community events, weddings, and functions.',
      status: 'available'
    },
    {
      id: 'r2',
      name: 'Oak Park Pavilion',
      type: 'facility',
      location: 'Oak Park',
      capacity: 80,
      description: 'Open-sided pavilion with BBQ facilities, popular for family gatherings.',
      status: 'available'
    },
    {
      id: 'r3',
      name: 'Meeting Room A',
      type: 'room',
      location: 'Council Administration Building',
      capacity: 12,
      description: 'Small meeting room with whiteboard and video conferencing.',
      status: 'available'
    },
    {
      id: 'r4',
      name: 'Meeting Room B',
      type: 'room',
      location: 'Council Administration Building',
      capacity: 20,
      description: 'Medium meeting room, suitable for workshops.',
      status: 'available'
    },
    {
      id: 'r5',
      name: 'Portable PA System',
      type: 'equipment',
      location: 'Equipment Store',
      capacity: 1,
      description: 'Portable speaker and microphone set for outdoor events.',
      status: 'available'
    },
    {
      id: 'r6',
      name: 'Tennis Court 2',
      type: 'facility',
      location: 'Riverside Sports Complex',
      capacity: 4,
      description: 'Outdoor hard-court tennis court, lights available after dark.',
      status: 'available'
    }
  ],
  bookings: [
    {
      id: 'b1',
      resourceId: 'r1',
      requestedBy: 'Jamie Lee',
      date: '2026-10-05',
      startTime: '10:00',
      endTime: '14:00',
      purpose: 'Community fundraiser',
      status: 'approved',
      createdAt: '2026-09-20T09:15:00'
    },
    {
      id: 'b2',
      resourceId: 'r3',
      requestedBy: 'Priya Nair',
      date: '2026-10-03',
      startTime: '09:00',
      endTime: '10:00',
      purpose: 'Neighbourhood watch meeting',
      status: 'pending',
      createdAt: '2026-09-28T13:40:00'
    },
    {
      id: 'b3',
      resourceId: 'r2',
      requestedBy: 'Sam Ostrowski',
      date: '2026-10-10',
      startTime: '12:00',
      endTime: '16:00',
      purpose: 'Family birthday',
      status: 'pending',
      createdAt: '2026-09-29T11:05:00'
    },
    {
      id: 'b4',
      resourceId: 'r6',
      requestedBy: 'Alex Chen',
      date: '2026-10-02',
      startTime: '17:00',
      endTime: '18:00',
      purpose: 'Casual match',
      status: 'cancelled',
      createdAt: '2026-09-18T08:00:00'
    }
  ],
  maintenanceTasks: [
    {
      id: 'm1',
      resourceId: 'r4',
      reportedBy: 'Council Staff',
      description: 'Air conditioning unit not cooling, room too warm for use.',
      priority: 'high',
      status: 'resolved',
      assignedTo: 'Dave Whitfield',
      createdAt: '2026-09-25T14:00:00'
    },
    {
      id: 'm2',
      resourceId: 'r5',
      reportedBy: 'Jamie Lee',
      description: 'One microphone has a loose connector, crackles intermittently.',
      priority: 'medium',
      status: 'resolved',
      assignedTo: 'Dave Whitfield',
      createdAt: '2026-09-27T10:20:00'
    }
  ],
  closures: [
    {
      id: 'c1',
      resourceId: 'r4',
      startDate: '2026-09-24',
      endDate: '2026-10-01',
      reason: 'Air conditioning repair',
      affectedBookingIds: [],
      createdAt: '2026-09-25T14:05:00'
    }
  ],
  auditLog: [
    {
      id: 'a1',
      timestamp: '2026-09-20T09:15:00',
      actor: 'Council Staff',
      action: 'booking_approved',
      details: 'Approved booking b1 for Riverside Community Hall'
    },
    {
      id: 'a2',
      timestamp: '2026-09-25T14:05:00',
      actor: 'Council Staff',
      action: 'closure_created',
      details: 'Scheduled closure c1 for Meeting Room B (AC repair)'
    },
    {
      id: 'a3',
      timestamp: '2026-09-25T14:00:00',
      actor: 'Council Staff',
      action: 'maintenance_assigned',
      details: 'Assigned task m1 to Dave Whitfield'
    }
  ],
  role: 'community'
};

function ensureDataFile() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify(defaultState, null, 2));
  }
}

export function readData() {
  ensureDataFile();
  const raw = fs.readFileSync(dataFile, 'utf8');
  try {
    return JSON.parse(raw);
  } catch {
    return structuredClone(defaultState);
  }
}

export function writeData(state) {
  ensureDataFile();
  const nextState = {
    ...defaultState,
    ...state,
    resources: Array.isArray(state?.resources) ? state.resources : defaultState.resources,
    bookings: Array.isArray(state?.bookings) ? state.bookings : defaultState.bookings,
    maintenanceTasks: Array.isArray(state?.maintenanceTasks) ? state.maintenanceTasks : defaultState.maintenanceTasks,
    closures: Array.isArray(state?.closures) ? state.closures : defaultState.closures,
    auditLog: Array.isArray(state?.auditLog) ? state.auditLog : defaultState.auditLog,
    role: state?.role || defaultState.role
  };

  fs.writeFileSync(dataFile, JSON.stringify(nextState, null, 2));
  return nextState;
}

export function resetData() {
  writeData(defaultState);
}

export const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const collectionMap = {
  resources: 'resources',
  bookings: 'bookings',
  'maintenance-tasks': 'maintenanceTasks',
  closures: 'closures',
  'audit-log': 'auditLog',
  role: 'role'
};

app.get('/api/health', (req, res) => {
  res.json({ ok: true, status: 'ready' });
});

app.get('/api/state', (req, res) => {
  res.json(readData());
});

app.post('/api/state', (req, res) => {
  const state = req.body || {};
  const written = writeData(state);
  res.status(200).json(written);
});

app.post('/api/bookings', (req, res) => {
  const booking = req.body || {};

  if (!booking.resourceId || !booking.requestedBy || !booking.date || !booking.startTime || !booking.endTime || !booking.purpose) {
    return res.status(400).json({ message: 'Please fill in every booking field.' });
  }

  if (booking.endTime <= booking.startTime) {
    return res.status(400).json({ message: 'End time must be after start time.' });
  }

  const state = readData();
  const nextBooking = {
    id: booking.id || `b${Date.now()}`,
    resourceId: booking.resourceId,
    requestedBy: booking.requestedBy,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    purpose: booking.purpose,
    status: booking.status || 'pending',
    createdAt: booking.createdAt || new Date().toISOString()
  };

  state.bookings.push(nextBooking);
  const written = writeData(state);
  res.status(201).json(written.bookings[written.bookings.length - 1]);
});

app.post('/api/closures', (req, res) => {
  const closure = req.body || {};

  if (!closure.resourceId || !closure.reason || !closure.startDate || !closure.endDate) {
    return res.status(400).json({ message: 'Please fill in every closure field.' });
  }

  if (closure.endDate < closure.startDate) {
    return res.status(400).json({ message: 'End date must be on or after the start date.' });
  }

  const state = readData();
  const nextClosure = {
    id: closure.id || `c${Date.now()}`,
    resourceId: closure.resourceId,
    startDate: closure.startDate,
    endDate: closure.endDate,
    reason: closure.reason,
    affectedBookingIds: Array.isArray(closure.affectedBookingIds) ? closure.affectedBookingIds : [],
    createdAt: closure.createdAt || new Date().toISOString()
  };

  state.closures.push(nextClosure);
  const written = writeData(state);
  res.status(201).json(written.closures[written.closures.length - 1]);
});

app.get('/api/:collection', (req, res) => {
  const key = collectionMap[req.params.collection];
  if (!key) {
    return res.status(404).json({ message: 'Unknown collection' });
  }

  const state = readData();
  const value = state[key];
  res.json(value);
});

app.post('/api/:collection', (req, res) => {
  const key = collectionMap[req.params.collection];
  if (!key) {
    return res.status(404).json({ message: 'Unknown collection' });
  }

  const state = readData();
  const incoming = req.body;
  if (typeof incoming === 'undefined' || incoming === null) {
    return res.status(400).json({ message: 'Body is required' });
  }

  state[key] = incoming;
  const written = writeData(state);
  res.status(201).json(written[key]);
});

app.post('/api/reset', (req, res) => {
  const state = resetData();
  res.status(200).json(state);
});

const staticDir = __dirname;
app.use(express.static(staticDir));

app.get('/', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }

  const filePath = path.join(staticDir, req.path);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return res.sendFile(filePath);
  }

  return res.sendFile(path.join(staticDir, 'index.html'));
});

export function startServer(port = Number(process.env.PORT || 3001)) {
  return app.listen(port, () => {
    console.log(`Riverbend Council backend running at http://localhost:${port}`);
  });
}

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  startServer();
}
