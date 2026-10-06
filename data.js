const STORAGEKEYS = {
  resources: "councilresources",
  bookings: "councilbookings",
  maintenanceTasks: "councilmaintenancetasks",
  closures: "councilclosures",
  auditLog: "councilauditlog",
  role: "councilrole"
};

function readjson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

async function syncStateToBackend() {
  if (!window.fetch) {
    return;
  }

  try {
    const state = {
      resources: getResources(),
      bookings: getBookings(),
      maintenanceTasks: getMaintenanceTasks(),
      closures: getClosures(),
      auditLog: getAuditLog(),
      role: getRole()
    };

    await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    });
  } catch (e) {
    // Ignore backend sync failures while the app is still offline or booting.
  }
}

async function syncStateFromBackend() {
  if (!window.fetch) {
    return;
  }

  try {
    const response = await fetch('/api/state');
    if (!response.ok) {
      return;
    }

    const state = await response.json();
    if (!state) {
      return;
    }

    Object.entries(state).forEach(function ([key, value]) {
      if (key === 'role') {
        localStorage.setItem(STORAGEKEYS.role, String(value || 'community'));
        return;
      }

      const storageKey = STORAGEKEYS[key];
      if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(value || []));
      }
    });
  } catch (e) {
    // Fall back to localStorage-only behaviour if the backend is not available.
  }
}

function writejson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  if (key !== STORAGEKEYS.role) {
    syncStateToBackend();
  }
}

function defaultResources() {
  return [
    {
      id: "r1",
      name: "Riverside Community Hall",
      type: "facility",
      location: "12 River St",
      capacity: 150,
      description: "Large hall suitable for community events, weddings, and functions.",
      status: "available"
    },
    {
      id: "r2",
      name: "Oak Park Pavilion",
      type: "facility",
      location: "Oak Park",
      capacity: 80,
      description: "Open-sided pavilion with BBQ facilities, popular for family gatherings.",
      status: "available"
    },
    {
      id: "r3",
      name: "Meeting Room A",
      type: "room",
      location: "Council Administration Building",
      capacity: 12,
      description: "Small meeting room with whiteboard and video conferencing.",
      status: "available"
    },
    {
      id: "r4",
      name: "Meeting Room B",
      type: "room",
      location: "Council Administration Building",
      capacity: 20,
      description: "Medium meeting room, suitable for workshops.",
      status: "maintenance"
    },
    {
      id: "r5",
      name: "Portable PA System",
      type: "equipment",
      location: "Equipment Store",
      capacity: 1,
      description: "Portable speaker and microphone set for outdoor events.",
      status: "available"
    },
    {
      id: "r6",
      name: "Tennis Court 2",
      type: "facility",
      location: "Riverside Sports Complex",
      capacity: 4,
      description: "Outdoor hard-court tennis court, lights available after dark.",
      status: "available"
    }
  ];
}

function getResources() {
  return readjson(STORAGEKEYS.resources, []);
}

function saveResources(list) {
  writejson(STORAGEKEYS.resources, list);
}

function defaultBookings() {
  return [
    {
      id: "b1",
      resourceId: "r1",
      requestedBy: "Jamie Lee",
      date: "2026-10-05",
      startTime: "10:00",
      endTime: "14:00",
      purpose: "Community fundraiser",
      status: "approved",
      createdAt: "2026-09-20T09:15:00"
    },
    {
      id: "b2",
      resourceId: "r3",
      requestedBy: "Priya Nair",
      date: "2026-10-03",
      startTime: "09:00",
      endTime: "10:00",
      purpose: "Neighbourhood watch meeting",
      status: "pending",
      createdAt: "2026-09-28T13:40:00"
    },
    {
      id: "b3",
      resourceId: "r2",
      requestedBy: "Sam Ostrowski",
      date: "2026-10-10",
      startTime: "12:00",
      endTime: "16:00",
      purpose: "Family birthday",
      status: "pending",
      createdAt: "2026-09-29T11:05:00"
    },
    {
      id: "b4",
      resourceId: "r6",
      requestedBy: "Alex Chen",
      date: "2026-10-02",
      startTime: "17:00",
      endTime: "18:00",
      purpose: "Casual match",
      status: "cancelled",
      createdAt: "2026-09-18T08:00:00"
    }
  ];
}

function defaultMaintenanceTasks() {
  return [
    {
      id: "m1",
      resourceId: "r4",
      reportedBy: "Council Staff",
      description: "Air conditioning unit not cooling, room too warm for use.",
      priority: "high",
      status: "assigned",
      assignedTo: "Dave Whitfield",
      createdAt: "2026-09-25T14:00:00"
    },
    {
      id: "m2",
      resourceId: "r5",
      reportedBy: "Jamie Lee",
      description: "One microphone has a loose connector, crackles intermittently.",
      priority: "medium",
      status: "reported",
      assignedTo: null,
      createdAt: "2026-09-27T10:20:00"
    }
  ];
}

function defaultClosures() {
  return [
    {
      id: "c1",
      resourceId: "r4",
      startDate: "2026-09-24",
      endDate: "2026-10-08",
      reason: "Air conditioning repair",
      affectedBookingIds: [],
      createdAt: "2026-09-25T14:05:00"
    }
  ];
}

function defaultAuditLog() {
  return [
    {
      id: "a1",
      timestamp: "2026-09-20T09:15:00",
      actor: "Council Staff",
      action: "booking_approved",
      details: "Approved booking b1 for Riverside Community Hall"
    },
    {
      id: "a2",
      timestamp: "2026-09-25T14:05:00",
      actor: "Council Staff",
      action: "closure_created",
      details: "Scheduled closure c1 for Meeting Room B (AC repair)"
    },
    {
      id: "a3",
      timestamp: "2026-09-25T14:00:00",
      actor: "Council Staff",
      action: "maintenance_assigned",
      details: "Assigned task m1 to Dave Whitfield"
    }
  ];
}

function getBookings() {
  return readjson(STORAGEKEYS.bookings, []);
}

function saveBookings(list) {
  writejson(STORAGEKEYS.bookings, list);
}

function getMaintenanceTasks() {
  return readjson(STORAGEKEYS.maintenanceTasks, []);
}

function saveMaintenanceTasks(list) {
  writejson(STORAGEKEYS.maintenanceTasks, list);
}

function getClosures() {
  return readjson(STORAGEKEYS.closures, []);
}

function saveClosures(list) {
  writejson(STORAGEKEYS.closures, list);
}

function getAuditLog() {
  return readjson(STORAGEKEYS.auditLog, []);
}

function addAuditEntry(actor, action, details) {
  const log = getAuditLog();
  log.unshift({
    id: "a" + Date.now(),
    timestamp: new Date().toISOString(),
    actor: actor,
    action: action,
    details: details
  });
  writejson(STORAGEKEYS.auditLog, log);
}

function getRole() {
  return localStorage.getItem(STORAGEKEYS.role) || "community";
}

function setRole(role) {
  localStorage.setItem(STORAGEKEYS.role, role);
  syncStateToBackend();
}

function isactiveclosure(closure, today) {
  return Boolean(
    closure &&
    closure.startDate &&
    closure.endDate &&
    closure.startDate <= today &&
    closure.endDate >= today
  );
}

function refreshallresourcestatuses() {
  const resources = getResources();
  const closures = getClosures();
  const maintenanceTasks = getMaintenanceTasks();
  const today = new Date().toISOString().slice(0, 10);

  resources.forEach(function (resource) {
    const isclosed = closures.some(function (closure) {
      return closure.resourceId === resource.id && isactiveclosure(closure, today);
    });
    const isundermaintenance = maintenanceTasks.some(function (task) {
      return task.resourceId === resource.id && task.status !== "resolved";
    });

    resource.status = isclosed ? "closed" : isundermaintenance ? "maintenance" : "available";
  });

  localStorage.setItem(STORAGEKEYS.resources, JSON.stringify(resources));
}

const dataReady = initdata();

async function initdata() {
  try {
    await syncStateFromBackend();
  } catch (e) {
    // Ignore sync failures; the app can still seed localStorage directly.
  }

  if (!localStorage.getItem(STORAGEKEYS.resources)) {
    writejson(STORAGEKEYS.resources, defaultResources());
  }
  if (!localStorage.getItem(STORAGEKEYS.bookings)) {
    writejson(STORAGEKEYS.bookings, defaultBookings());
  }
  if (!localStorage.getItem(STORAGEKEYS.maintenanceTasks)) {
    writejson(STORAGEKEYS.maintenanceTasks, defaultMaintenanceTasks());
  }
  if (!localStorage.getItem(STORAGEKEYS.closures)) {
    writejson(STORAGEKEYS.closures, defaultClosures());
  }
  if (!localStorage.getItem(STORAGEKEYS.auditLog)) {
    writejson(STORAGEKEYS.auditLog, defaultAuditLog());
  }
  if (!localStorage.getItem(STORAGEKEYS.role)) {
    localStorage.setItem(STORAGEKEYS.role, "community");
  }

  refreshallresourcestatuses();
  syncStateToBackend();
}
