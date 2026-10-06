function todaystring() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + mm + "-" + dd;
}

function resourcename(resourceid) {
  const resource = getResources().filter(function (r) {
    return r.id === resourceid;
  })[0];
  return resource ? resource.name : "Unknown resource";
}

function bookingstatusbadgeclass(status) {
  if (status === "approved") {
    return "badgesuccess";
  }
  if (status === "pending") {
    return "badgewarning";
  }
  if (status === "cancelled") {
    return "badgemuted";
  }
  return "badgedanger";
}

function bookingstatuslabel(status) {
  if (status === "approved") {
    return "Approved";
  }
  if (status === "pending") {
    return "Pending";
  }
  if (status === "cancelled") {
    return "Cancelled";
  }
  return "Rejected";
}

function setresourcestatus(resourceid, status) {
  const resources = getResources();
  const resource = resources.filter(function (r) {
    return r.id === resourceid;
  })[0];
  if (!resource) {
    return;
  }
  resource.status = status;
  saveResources(resources);
}

function isclosureactive(closure) {
  if (!closure || !closure.startDate || !closure.endDate) {
    return false;
  }
  const today = new Date();
  const start = new Date(closure.startDate + "T00:00:00");
  const end = new Date(closure.endDate + "T23:59:59");
  return today >= start && today <= end;
}

function refreshresourcestatefromclosures(resourceid) {
  const resource = getResources().filter(function (r) {
    return r.id === resourceid;
  })[0];

  if (!resource) {
    return;
  }

  const hasactiveclosure = getClosures().some(function (closure) {
    return closure.resourceId === resourceid && isclosureactive(closure);
  });

  const hasopenmaintenance = getMaintenanceTasks().some(function (task) {
    return task.resourceId === resourceid && task.status !== "resolved";
  });

  if (hasactiveclosure) {
    setresourcestatus(resourceid, "closed");
    return;
  }

  setresourcestatus(resourceid, hasopenmaintenance ? "maintenance" : "available");
}

function findaffectedbookingids(resourceid, startdate, enddate) {
  return getBookings()
    .filter(function (b) {
      return (
        b.resourceId === resourceid &&
        (b.status === "approved" || b.status === "pending") &&
        b.date >= startdate &&
        b.date <= enddate
      );
    })
    .map(function (b) {
      return b.id;
    });
}

function populateclosureresourceoptions() {
  const select = document.getElementById("resourceselect");
  select.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select a resource…";
  placeholder.disabled = true;
  placeholder.selected = true;
  select.appendChild(placeholder);

  getResources().forEach(function (r) {
    const option = document.createElement("option");
    option.value = r.id;
    option.textContent = r.name;
    select.appendChild(option);
  });
}

function showclosuremessage(text, iswarning) {
  const box = document.getElementById("confirmmessage");
  const cssclass = iswarning ? "errormessage" : "confirmmessage";
  box.innerHTML = '<div class="' + cssclass + '">' + text + "</div>";
}

function handleclosuresubmit(event) {
  event.preventDefault();

  const resourceid = document.getElementById("resourceselect").value;
  const reason = document.getElementById("reasoninput").value.trim();
  const startdate = document.getElementById("startdateinput").value;
  const enddate = document.getElementById("enddateinput").value;

  if (!resourceid || !reason || !startdate || !enddate) {
    showclosuremessage("Please fill in every field before submitting.", true);
    return;
  }

  if (enddate < startdate) {
    showclosuremessage("End date must be on or after the start date.", true);
    return;
  }

  const affectedbookingids = findaffectedbookingids(resourceid, startdate, enddate);

  const closure = {
    id: "c" + Date.now(),
    resourceId: resourceid,
    startDate: startdate,
    endDate: enddate,
    reason: reason,
    affectedBookingIds: affectedbookingids,
    createdAt: new Date().toISOString()
  };

  const closures = getClosures();
  closures.push(closure);
  saveClosures(closures);

  refreshresourcestatefromclosures(resourceid);
  addAuditEntry("Council Staff", "closure_created", "Scheduled closure of " + resourcename(resourceid) + " (" + reason + ")");

  const message =
    affectedbookingids.length > 0
      ? "Closure scheduled. " + affectedbookingids.length + " existing booking(s) fall within this closure and may need to be cancelled below."
      : "Closure scheduled. No existing bookings are affected.";
  showclosuremessage(message, affectedbookingids.length > 0);

  document.getElementById("closureform").reset();
  populateclosureresourceoptions();
  renderallclosureviews();
}

function renderclosures() {
  const body = document.getElementById("closuresbody");
  const closures = getClosures().slice().sort(function (a, b) {
    return b.createdAt.localeCompare(a.createdAt);
  });

  if (closures.length === 0) {
    body.innerHTML = '<tr><td colspan="5" class="emptystate">No closures scheduled.</td></tr>';
    return;
  }

  body.innerHTML = closures
    .map(function (c) {
      return (
        "<tr>" +
        "<td>" +
        resourcename(c.resourceId) +
        "</td>" +
        "<td>" +
        c.startDate +
        " to " +
        c.endDate +
        "</td>" +
        "<td>" +
        c.reason +
        "</td>" +
        "<td>" +
        c.affectedBookingIds.length +
        "</td>" +
        "<td>" +
        '<button type="button" class="btn btnsecondary" data-reopen="' +
        c.resourceId +
        '">Reopen resource</button>' +
        "</td>" +
        "</tr>"
      );
    })
    .join("");

  body.querySelectorAll("[data-reopen]").forEach(function (button) {
    button.addEventListener("click", function () {
      reopenresource(button.getAttribute("data-reopen"));
    });
  });
}

function renderaffectedbookings() {
  const body = document.getElementById("affectedbody");
  const closures = getClosures();
  const bookings = getBookings();

  const affectedids = [];
  closures.forEach(function (c) {
    c.affectedBookingIds.forEach(function (id) {
      if (affectedids.indexOf(id) === -1) {
        affectedids.push(id);
      }
    });
  });

  const affectedbookings = bookings.filter(function (b) {
    return affectedids.indexOf(b.id) !== -1;
  });

  if (affectedbookings.length === 0) {
    body.innerHTML = '<tr><td colspan="6" class="emptystate">No bookings are affected by a closure.</td></tr>';
    return;
  }

  body.innerHTML = affectedbookings
    .map(function (b) {
      const cancelbutton =
        b.status === "pending" || b.status === "approved"
          ? '<button type="button" class="btn btndanger" data-cancel="' + b.id + '">Cancel</button>'
          : "";
      return (
        "<tr>" +
        "<td>" +
        resourcename(b.resourceId) +
        "</td>" +
        "<td>" +
        b.requestedBy +
        "</td>" +
        "<td>" +
        b.date +
        "</td>" +
        "<td>" +
        b.startTime +
        "–" +
        b.endTime +
        "</td>" +
        '<td><span class="badge ' +
        bookingstatusbadgeclass(b.status) +
        '">' +
        bookingstatuslabel(b.status) +
        "</span></td>" +
        "<td>" +
        cancelbutton +
        "</td>" +
        "</tr>"
      );
    })
    .join("");

  body.querySelectorAll("[data-cancel]").forEach(function (button) {
    button.addEventListener("click", function () {
      cancelaffectedbooking(button.getAttribute("data-cancel"));
    });
  });
}

function reopenresource(resourceid) {
  const remainingclosures = getClosures().filter(function (closure) {
    return closure.resourceId !== resourceid;
  });

  saveClosures(remainingclosures);

  const hasactiveclosure = getClosures().some(function (closure) {
    return closure.resourceId === resourceid && isclosureactive(closure);
  });

  const hasopenmaintenance = getMaintenanceTasks().some(function (task) {
    return task.resourceId === resourceid && task.status !== "resolved";
  });

  setresourcestatus(resourceid, hasactiveclosure ? "closed" : hasopenmaintenance ? "maintenance" : "available");
  addAuditEntry("Council Staff", "resource_reopened", "Reopened " + resourcename(resourceid) + " after closure");
  renderallclosureviews();
}

function cancelaffectedbooking(id) {
  const bookings = getBookings();
  const booking = bookings.filter(function (b) {
    return b.id === id;
  })[0];
  if (!booking) {
    return;
  }
  booking.status = "cancelled";
  saveBookings(bookings);
  addAuditEntry("Council Staff", "booking_cancelled", "Cancelled booking of " + resourcename(booking.resourceId) + " due to a closure");
  renderallclosureviews();
}

function renderallclosureviews() {
  renderclosures();
  renderaffectedbookings();
}

function initclosurespage() {
  populateclosureresourceoptions();
  renderallclosureviews();
  document.getElementById("closureform").addEventListener("submit", handleclosuresubmit);
}

document.addEventListener("DOMContentLoaded", function () {
  dataReady.then(initclosurespage);
});
