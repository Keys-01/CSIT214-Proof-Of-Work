function resourcename(resourceid) {
  const resource = getResources().filter(function (r) {
    return r.id === resourceid;
  })[0];
  return resource ? resource.name : "Unknown resource";
}

function overlaps(a, b) {
  // Times are stored as HH:MM, so string comparison works in chronological order.
  return a.resourceId === b.resourceId && a.date === b.date && a.startTime < b.endTime && b.startTime < a.endTime;
}

function hasconflict(booking, allbookings) {
  return allbookings.some(function (other) {
    if (other.id === booking.id) {
      return false;
    }
    if (other.status !== "approved" && other.status !== "pending") {
      return false;
    }
    return overlaps(booking, other);
  });
}

function getqueryresourceid() {
  const params = new URLSearchParams(window.location.search);
  return params.get("resource");
}

function populateresourceoptions() {
  const select = document.getElementById("resourceselect");
  const resources = getResources().filter(function (r) {
    return r.status === "available";
  });
  const preselect = getqueryresourceid();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select a resource…";
  placeholder.disabled = true;
  placeholder.selected = !preselect;
  select.appendChild(placeholder);

  resources.forEach(function (r) {
    const option = document.createElement("option");
    option.value = r.id;
    option.textContent = r.name;
    if (r.id === preselect) {
      option.selected = true;
    }
    select.appendChild(option);
  });
}

function showconfirmmessage(text, iswarning) {
  const box = document.getElementById("confirmmessage");
  const cssclass = iswarning ? "errormessage" : "confirmmessage";
  box.innerHTML = '<div class="' + cssclass + '">' + text + "</div>";
}

function handlebookingsubmit(event) {
  event.preventDefault();

  const resourceid = document.getElementById("resourceselect").value;
  const date = document.getElementById("dateinput").value;
  const starttime = document.getElementById("starttimeinput").value;
  const endtime = document.getElementById("endtimeinput").value;
  const requestedby = document.getElementById("requestedbyinput").value.trim();
  const purpose = document.getElementById("purposeinput").value.trim();

  if (!resourceid || !date || !starttime || !endtime || !requestedby || !purpose) {
    showconfirmmessage("Please fill in every field before submitting.", true);
    return;
  }

  if (endtime <= starttime) {
    showconfirmmessage("End time must be after start time.", true);
    return;
  }

  const booking = {
    id: "b" + Date.now(),
    resourceId: resourceid,
    requestedBy: requestedby,
    date: date,
    startTime: starttime,
    endTime: endtime,
    purpose: purpose,
    status: "pending",
    createdAt: new Date().toISOString()
  };

  const bookings = getBookings();
  bookings.push(booking);
  // Save first so the conflict check also sees the request that was just made.
  saveBookings(bookings);
  addAuditEntry(requestedby, "booking_requested", "Requested booking of " + resourcename(resourceid) + " on " + date);

  const conflict = hasconflict(booking, bookings);
  if (conflict) {
    showconfirmmessage(
      "Booking request submitted as pending. Note: this time overlaps with another booking for the same resource, so it may need staff review.",
      true
    );
  } else {
    showconfirmmessage("Booking request submitted and is pending approval.", false);
  }

  document.getElementById("bookingform").reset();
  populateresourceoptions();
  renderallviews();
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

function rendermybookings() {
  const body = document.getElementById("mybookingsbody");
  const bookings = getBookings().slice().sort(function (a, b) {
    return b.createdAt.localeCompare(a.createdAt);
  });

  if (bookings.length === 0) {
    body.innerHTML = '<tr><td colspan="6" class="emptystate">No bookings yet.</td></tr>';
    return;
  }

  body.innerHTML = bookings
    .map(function (b) {
      const cancelbutton =
        b.status === "pending" || b.status === "approved"
          ? '<button type="button" class="btn btnsecondary" data-cancel="' + b.id + '">Cancel</button>'
          : "";
      return (
        "<tr>" +
        "<td>" +
        resourcename(b.resourceId) +
        "</td>" +
        "<td>" +
        b.date +
        "</td>" +
        "<td>" +
        b.startTime +
        "–" +
        b.endTime +
        "</td>" +
        "<td>" +
        b.purpose +
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
      cancelbooking(button.getAttribute("data-cancel"));
    });
  });
}

function renderapprovals() {
  const body = document.getElementById("approvalsbody");
  const allbookings = getBookings();
  const pending = allbookings.filter(function (b) {
    return b.status === "pending";
  });

  if (pending.length === 0) {
    body.innerHTML = '<tr><td colspan="6" class="emptystate">No bookings awaiting approval.</td></tr>';
    return;
  }

  body.innerHTML = pending
    .map(function (b) {
      const conflictnote = hasconflict(b, allbookings)
        ? '<div class="conflictwarning">Conflicts with another booking</div>'
        : "";
      return (
        "<tr>" +
        "<td>" +
        resourcename(b.resourceId) +
        conflictnote +
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
        "<td>" +
        b.purpose +
        "</td>" +
        "<td>" +
        '<button type="button" class="btn btnprimary" data-approve="' +
        b.id +
        '">Approve</button> ' +
        '<button type="button" class="btn btndanger" data-reject="' +
        b.id +
        '">Reject</button>' +
        "</td>" +
        "</tr>"
      );
    })
    .join("");

  body.querySelectorAll("[data-approve]").forEach(function (button) {
    button.addEventListener("click", function () {
      approvebooking(button.getAttribute("data-approve"));
    });
  });
  body.querySelectorAll("[data-reject]").forEach(function (button) {
    button.addEventListener("click", function () {
      rejectbooking(button.getAttribute("data-reject"));
    });
  });
}

function renderallbookings() {
  const body = document.getElementById("allbookingsbody");
  const bookings = getBookings().slice().sort(function (a, b) {
    return b.createdAt.localeCompare(a.createdAt);
  });

  if (bookings.length === 0) {
    body.innerHTML = '<tr><td colspan="5" class="emptystate">No bookings yet.</td></tr>';
    return;
  }

  body.innerHTML = bookings
    .map(function (b) {
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
        "</tr>"
      );
    })
    .join("");
}

function approvebooking(id) {
  const bookings = getBookings();
  const booking = bookings.filter(function (b) {
    return b.id === id;
  })[0];
  if (!booking) {
    return;
  }
  booking.status = "approved";
  saveBookings(bookings);
  addAuditEntry("Council Staff", "booking_approved", "Approved booking of " + resourcename(booking.resourceId) + " for " + booking.requestedBy);
  renderallviews();
}

function rejectbooking(id) {
  const bookings = getBookings();
  const booking = bookings.filter(function (b) {
    return b.id === id;
  })[0];
  if (!booking) {
    return;
  }
  booking.status = "rejected";
  saveBookings(bookings);
  addAuditEntry("Council Staff", "booking_rejected", "Rejected booking of " + resourcename(booking.resourceId) + " for " + booking.requestedBy);
  renderallviews();
}

function cancelbooking(id) {
  const bookings = getBookings();
  const booking = bookings.filter(function (b) {
    return b.id === id;
  })[0];
  if (!booking) {
    return;
  }
  booking.status = "cancelled";
  saveBookings(bookings);
  addAuditEntry(booking.requestedBy, "booking_cancelled", "Cancelled booking of " + resourcename(booking.resourceId));
  renderallviews();
}

function renderallviews() {
  const role = getRole();
  document.getElementById("mybookingssection").hidden = role !== "community";
  document.getElementById("approvalssection").hidden = role !== "staff";

  if (role === "community") {
    rendermybookings();
  } else {
    renderapprovals();
    renderallbookings();
  }
}

function initbookingspage() {
  populateresourceoptions();
  renderallviews();
  document.getElementById("bookingform").addEventListener("submit", handlebookingsubmit);
}

document.addEventListener("DOMContentLoaded", function () {
  dataReady.then(initbookingspage);
});