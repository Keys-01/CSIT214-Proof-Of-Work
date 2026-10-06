function resourcename(resourceid) {
  const resource = getResources().filter(function (r) {
    return r.id === resourceid;
  })[0];
  return resource ? resource.name : "Unknown resource";
}

function countby(items, keyfn) {
  const counts = {};
  items.forEach(function (item) {
    const key = keyfn(item);
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

function renderbarchart(containerid, counts) {
  const container = document.getElementById(containerid);
  const entries = Object.keys(counts).map(function (key) {
    return { label: key, value: counts[key] };
  });

  if (entries.length === 0) {
    container.innerHTML = '<div class="emptystate">No data yet.</div>';
    return;
  }

  const maxvalue = Math.max.apply(
    null,
    entries.map(function (e) {
      return e.value;
    })
  );

  // Scale every bar against the busiest resource so the chart stays easy to compare.
  container.innerHTML = entries
    .map(function (e) {
      const percent = maxvalue === 0 ? 0 : Math.round((e.value / maxvalue) * 100);
      return (
        '<div class="barrow">' +
        '<div class="barlabel">' +
        e.label +
        "</div>" +
        '<div class="bartrack"><div class="barfill" style="width: ' +
        percent +
        '%"></div></div>' +
        '<div class="barvalue">' +
        e.value +
        "</div>" +
        "</div>"
      );
    })
    .join("");
}

function renderbookingschart() {
  const bookings = getBookings().filter(function (b) {
    return b.status === "approved" || b.status === "pending";
  });
  const counts = countby(bookings, function (b) {
    return resourcename(b.resourceId);
  });
  renderbarchart("bookingschart", counts);
}

function rendermaintenancechart() {
  const tasks = getMaintenanceTasks();
  const counts = countby(tasks, function (t) {
    return resourcename(t.resourceId);
  });
  renderbarchart("maintenancechart", counts);
}

function renderaudittable() {
  const body = document.getElementById("auditbody");
  const search = document.getElementById("auditsearch").value.trim().toLowerCase();

  const entries = getAuditLog().filter(function (entry) {
    if (search === "") {
      return true;
    }
    const haystack = (entry.actor + " " + entry.action + " " + entry.details).toLowerCase();
    return haystack.indexOf(search) !== -1;
  });

  // Search the combined row text so users can find an actor, action, or detail in one box.
  if (entries.length === 0) {
    body.innerHTML = '<tr><td colspan="4" class="emptystate">No audit entries match your search.</td></tr>';
    return;
  }

  body.innerHTML = entries
    .map(function (entry) {
      return (
        "<tr>" +
        "<td>" +
        entry.timestamp +
        "</td>" +
        "<td>" +
        entry.actor +
        "</td>" +
        "<td>" +
        entry.action +
        "</td>" +
        "<td>" +
        entry.details +
        "</td>" +
        "</tr>"
      );
    })
    .join("");
}

function initreportspage() {
  renderbookingschart();
  rendermaintenancechart();
  renderaudittable();

  document.getElementById("auditsearch").addEventListener("input", function () {
    renderaudittable();
  });
}

document.addEventListener("DOMContentLoaded", function () {
  dataReady.then(initreportspage);
});
