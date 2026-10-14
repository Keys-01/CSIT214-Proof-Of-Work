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
        escapehtml(resourcename(b.resourceId)) +
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
        escapehtml(b.purpose) +
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
        escapehtml(resourcename(b.resourceId)) +
        conflictnote +
        "</td>" +
        "<td>" +
        escapehtml(b.requestedBy) +
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
        escapehtml(b.purpose) +
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
        escapehtml(resourcename(b.resourceId)) +
        "</td>" +
        "<td>" +
        escapehtml(b.requestedBy) +
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
  renderallviews();
}

document.addEventListener("DOMContentLoaded", function () {
  dataReady.then(initbookingspage);
});