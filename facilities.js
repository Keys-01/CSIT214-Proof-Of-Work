let selectedresourceid = null;
let selecteddate = null;
let calendaroffset = 0;

function populatelocations() {
  const select = document.getElementById("locationinput");
  const resources = getResources();
  const locations = [];
  resources.forEach(function (r) {
    if (locations.indexOf(r.location) === -1) {
      locations.push(r.location);
    }
  });
  locations.sort();
  locations.forEach(function (loc) {
    const option = document.createElement("option");
    option.value = loc;
    option.textContent = loc;
    select.appendChild(option);
  });
}

function statusbadgeclass(status) {
  if (status === "closed") {
    return "badgedanger";
  }
  if (status === "maintenance") {
    return "badgewarning";
  }
  return "badgesuccess";
}

function statuslabel(status) {
  if (status === "closed") {
    return "Closed";
  }
  if (status === "maintenance") {
    return "Under maintenance";
  }
  return "Open";
}

function typelabel(type) {
  if (type === "facility") {
    return "Facility";
  }
  if (type === "room") {
    return "Room";
  }
  return "Equipment";
}

function filteredresources() {
  const search = document.getElementById("searchinput").value.trim().toLowerCase();
  const type = document.getElementById("typeinput").value;
  const location = document.getElementById("locationinput").value;
  const capacity = document.getElementById("capacityinput").value;
  const mincapacity = capacity === "" ? 0 : Number(capacity);

  // Each filter is optional; leaving one blank simply lets everything through.
  return getResources().filter(function (r) {
    const matchessearch = search === "" || r.name.toLowerCase().indexOf(search) !== -1;
    const matchestype = type === "" || r.type === type;
    const matcheslocation = location === "" || r.location === location;
    const matchescapacity = r.capacity >= mincapacity;
    return matchessearch && matchestype && matcheslocation && matchescapacity;
  });
}

function renderresourcelist() {
  const list = document.getElementById("resourcelist");
  const resources = filteredresources();

  if (resources.length === 0) {
    list.innerHTML = '<div class="emptystate">No resources match your search.</div>';
    return;
  }

  list.innerHTML = resources
    .map(function (r) {
      const selectedclass = r.id === selectedresourceid ? "selected" : "";
      return (
        '<button type="button" class="resourceitem ' +
        selectedclass +
        '" data-id="' +
        r.id +
        '">' +
        '<div class="resourcename">' +
        escapehtml(r.name) +
        "</div>" +
        '<div class="resourcemeta">' +
        typelabel(r.type) +
        " &middot; " +
        escapehtml(r.location) +
        " &middot; Capacity " +
        r.capacity +
        "</div>" +
        '<span class="badge ' +
        statusbadgeclass(r.status) +
        '">' +
        statuslabel(r.status) +
        "</span>" +
        "</button>"
      );
    })
      // Build a simple month grid from scratch so it always reflects today's month.
    .join("");

  const buttons = list.querySelectorAll(".resourceitem");
  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      selectedresourceid = button.getAttribute("data-id");
      renderresourcelist();
      renderdetailpanel();
    });
  });
}

function todaystring() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + mm + "-" + dd;
}

function selectedresource() {
  return getResources().filter(function (r) {
    return r.id === selectedresourceid;
  })[0];
}

function renderdetailpanel() {
  const panel = document.getElementById("detailpanel");
  const resource = selectedresourceid ? selectedresource() : null;

  if (!resource) {
    panel.innerHTML = '<div class="emptystate">Select a resource to see its details and availability.</div>';
    return;
  }

  // Each resource starts on the current month with no day chosen.
  selecteddate = null;
  calendaroffset = 0;

  const bookable = resource.status === "available";
  const bookingformhtml = bookable
    ? "<h3>Request a booking</h3>" +
      '<p class="resourcemeta">Click a day on the calendar to choose the date.</p>' +
      '<div id="bookingmessage"></div>' +
      '<form id="bookingform">' +
      '<div class="formrow">' +
      '<div><label>Selected date</label><div id="selecteddatelabel" class="selecteddate">No day selected</div></div>' +
      "</div>" +
      '<div class="formrow">' +
      '<div><label for="starttimeinput">Start time</label><input type="time" id="starttimeinput" required /></div>' +
      '<div><label for="endtimeinput">End time</label><input type="time" id="endtimeinput" required /></div>' +
      "</div>" +
      '<div class="formrow">' +
      '<div><label for="requestedbyinput">Your name</label><input type="text" id="requestedbyinput" required /></div>' +
      '<div><label for="purposeinput">Purpose</label><input type="text" id="purposeinput" required /></div>' +
      "</div>" +
      '<button type="submit" class="btn btnprimary">Submit request</button>' +
      "</form>"
    : '<p class="errormessage">This resource cannot be booked right now because it is ' +
      (resource.status === "closed" ? "closed" : "under maintenance") +
      ".</p>";

  panel.innerHTML =
    "<h2>" +
    escapehtml(resource.name) +
    "</h2>" +
    '<p class="resourcemeta">' +
    typelabel(resource.type) +
    " &middot; " +
    escapehtml(resource.location) +
    " &middot; Capacity " +
    resource.capacity +
    "</p>" +
    '<span class="badge ' +
    statusbadgeclass(resource.status) +
    '">' +
    statuslabel(resource.status) +
    "</span>" +
    "<p>" +
    escapehtml(resource.description) +
    "</p>" +
    '<div id="calendarcontainer"></div>' +
    bookingformhtml +
    "<h3>Upcoming bookings</h3>" +
    '<ul class="bookinglist" id="bookinglist"></ul>';

  refreshcalendarandlist();

  const form = document.getElementById("bookingform");
  if (form) {
    form.addEventListener("submit", handlebookingsubmit);
  }
}

function resourcebookings(resourceid) {
  return getBookings().filter(function (b) {
    return b.resourceId === resourceid && (b.status === "approved" || b.status === "pending");
  });
}

function refreshcalendarandlist() {
  const resource = selectedresource();
  if (!resource) {
    return;
  }
  const bookings = resourcebookings(resource.id);
  rendercalendar(bookings, resource.id);
  renderbookinglist(bookings);
}

function showbookingmessage(text, iswarning) {
  const box = document.getElementById("bookingmessage");
  if (box) {
    box.innerHTML = '<div class="' + (iswarning ? "errormessage" : "confirmmessage") + '">' + text + "</div>";
  }
}

function handlebookingsubmit(event) {
  event.preventDefault();

  const resource = selectedresource();
  const starttime = document.getElementById("starttimeinput").value;
  const endtime = document.getElementById("endtimeinput").value;
  const requestedby = document.getElementById("requestedbyinput").value.trim();
  const purpose = document.getElementById("purposeinput").value.trim();

  if (!resource) {
    return;
  }
  if (!selecteddate) {
    showbookingmessage("Please click a day on the calendar first.", true);
    return;
  }
  if (!starttime || !endtime || !requestedby || !purpose) {
    showbookingmessage("Please fill in every field before submitting.", true);
    return;
  }
  if (endtime <= starttime) {
    showbookingmessage("End time must be after start time.", true);
    return;
  }
  if (selecteddate < todaystring()) {
    showbookingmessage("You cannot book a day in the past.", true);
    return;
  }

  const closure = findclosureondate(resource.id, selecteddate);
  if (closure) {
    showbookingmessage(
      escapehtml(resource.name) + " is closed from " + closure.startDate + " to " + closure.endDate + " (" + escapehtml(closure.reason) + "). Please choose another day.",
      true
    );
    return;
  }
  if (resource.status !== "available") {
    showbookingmessage(escapehtml(resource.name) + " is not currently available for booking.", true);
    return;
  }

  const booking = {
    id: "b" + Date.now(),
    resourceId: resource.id,
    requestedBy: requestedby,
    date: selecteddate,
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
  addAuditEntry(requestedby, "booking_requested", "Requested booking of " + resource.name + " on " + selecteddate);

  const conflict = hasconflict(booking, bookings);
  const bookeddate = selecteddate;
  renderdetailpanel();
  showbookingmessage(
    conflict
      ? "Booking request for " + bookeddate + " submitted as pending. Note: this time overlaps with another booking, so it may need staff review."
      : "Booking request for " + bookeddate + " submitted and is pending approval.",
    conflict
  );
}

function choosecalendarday(datestring) {
  selecteddate = datestring;
  const label = document.getElementById("selecteddatelabel");
  if (label) {
    label.textContent = datestring;
  }
  refreshcalendarandlist();
}

function renderbookinglist(bookings) {
  const list = document.getElementById("bookinglist");

  if (bookings.length === 0) {
    list.innerHTML = '<li class="bookinglistitem">No upcoming bookings for this resource.</li>';
    return;
  }

  const sorted = bookings.slice().sort(function (a, b) {
    return a.date.localeCompare(b.date);
  });

  list.innerHTML = sorted
    .map(function (b) {
      return (
        '<li class="bookinglistitem">' +
        b.date +
        ", " +
        b.startTime +
        "–" +
        b.endTime +
        " &mdash; " +
        escapehtml(b.purpose) +
        "</li>"
      );
    })
    .join("");
}

function rendercalendar(bookings, resourceid) {
  const container = document.getElementById("calendarcontainer");
  const today = new Date();
  const shown = new Date(today.getFullYear(), today.getMonth() + calendaroffset, 1);
  const year = shown.getFullYear();
  const month = shown.getMonth();
  const todaydate = todaystring();
  const bookable = selectedresource().status === "available";

  const bookeddates = {};
  bookings.forEach(function (b) {
    bookeddates[b.date] = true;
  });

  const closures = getClosures().filter(function (c) {
    return c.resourceId === resourceid;
  });
  // Maintenance has no end date, so an unresolved task marks every day from the day it was reported.
  const maintenancestarts = getMaintenanceTasks()
    .filter(function (t) {
      return t.resourceId === resourceid && t.status !== "resolved";
    })
    .map(function (t) {
      return t.createdAt.slice(0, 10);
    });

  const daysinmonth = new Date(year, month + 1, 0).getDate();
  const startweekday = new Date(year, month, 1).getDay();
  const monthnames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const weekdaynames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  let cellshtml = weekdaynames
    .map(function (name) {
      return '<div class="calendarweekday">' + name + "</div>";
    })
    .join("");

  for (let i = 0; i < startweekday; i++) {
    cellshtml += '<div class="calendarday empty"></div>';
  }

  for (let day = 1; day <= daysinmonth; day++) {
    const datestring = year + "-" + String(month + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
    const isclosed = closures.some(function (c) {
      return c.startDate <= datestring && c.endDate >= datestring;
    });
    const ismaintenance = maintenancestarts.some(function (start) {
      return start <= datestring;
    });
    const ispast = datestring < todaydate;
    const selectable = bookable && !ispast && !isclosed && !ismaintenance;

    // Closed wins over maintenance, and both win over the plain booked colour.
    const classes = ["calendarday"];
    if (bookeddates[datestring]) classes.push("booked");
    if (isclosed) classes.push("closed");
    else if (ismaintenance) classes.push("maintenance");
    if (ispast) classes.push("past");
    if (selectable) classes.push("selectable");
    if (datestring === todaydate) classes.push("today");
    if (datestring === selecteddate) classes.push("selected");

    const title = isclosed ? "Closed" : ismaintenance ? "Under maintenance" : ispast ? "Past" : bookeddates[datestring] ? "Booked (you can still request this day)" : "Available";
    cellshtml +=
      '<div class="' + classes.join(" ") + '" title="' + title + '"' + (selectable ? ' data-date="' + datestring + '"' : "") + ">" + day + "</div>";
  }

  container.innerHTML =
    '<div class="calendarheader">' +
    '<button type="button" class="btn btnsecondary" id="calprev"' + (calendaroffset === 0 ? " disabled" : "") + ">&lsaquo; Prev</button>" +
    "<h3>" + monthnames[month] + " " + year + "</h3>" +
    '<button type="button" class="btn btnsecondary" id="calnext">Next &rsaquo;</button>' +
    "</div>" +
    '<div class="calendargrid">' +
    cellshtml +
    "</div>" +
    '<div class="calendarlegend">' +
    '<span><i class="legendswatch closed"></i>Closed</span>' +
    '<span><i class="legendswatch maintenance"></i>Under maintenance</span>' +
    '<span><i class="legendswatch booked"></i>Booked</span>' +
    '<span><i class="legendswatch selected"></i>Selected day</span>' +
    "</div>";

  container.querySelectorAll("[data-date]").forEach(function (cell) {
    cell.addEventListener("click", function () {
      choosecalendarday(cell.getAttribute("data-date"));
    });
  });
  document.getElementById("calprev").addEventListener("click", function () {
    calendaroffset = Math.max(0, calendaroffset - 1);
    refreshcalendarandlist();
  });
  document.getElementById("calnext").addEventListener("click", function () {
    calendaroffset += 1;
    refreshcalendarandlist();
  });
}

function initfacilitiespage() {
  const wanted = new URLSearchParams(window.location.search).get("resource");
  if (wanted) {
    selectedresourceid = wanted;
  }
  populatelocations();
  renderresourcelist();
  renderdetailpanel();

  document.getElementById("searchinput").addEventListener("input", function () {
    renderresourcelist();
  });
  document.getElementById("typeinput").addEventListener("change", function () {
    renderresourcelist();
  });
  document.getElementById("locationinput").addEventListener("change", function () {
    renderresourcelist();
  });
  document.getElementById("capacityinput").addEventListener("input", function () {
    renderresourcelist();
  });
}

document.addEventListener("DOMContentLoaded", function () {
  dataReady.then(initfacilitiespage);
});
