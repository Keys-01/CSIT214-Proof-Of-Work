let selectedresourceid = null;

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
        r.name +
        "</div>" +
        '<div class="resourcemeta">' +
        typelabel(r.type) +
        " &middot; " +
        r.location +
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

function renderdetailpanel() {
  const panel = document.getElementById("detailpanel");

  if (!selectedresourceid) {
    panel.innerHTML = '<div class="emptystate">Select a resource to see its details and availability.</div>';
    return;
  }

  const resource = getResources().filter(function (r) {
    return r.id === selectedresourceid;
  })[0];

  if (!resource) {
    panel.innerHTML = '<div class="emptystate">Select a resource to see its details and availability.</div>';
    return;
  }

  const bookings = getBookings().filter(function (b) {
    return b.resourceId === resource.id && (b.status === "approved" || b.status === "pending");
  });

  const bookinglinkhtml =
    resource.status === "available"
      ? '<p><a class="btn btnprimary" href="bookings.html?resource=' + resource.id + '">Request this booking</a></p>'
      : "";

  panel.innerHTML =
    "<h2>" +
    resource.name +
    "</h2>" +
    '<p class="resourcemeta">' +
    typelabel(resource.type) +
    " &middot; " +
    resource.location +
    " &middot; Capacity " +
    resource.capacity +
    "</p>" +
    '<span class="badge ' +
    statusbadgeclass(resource.status) +
    '">' +
    statuslabel(resource.status) +
    "</span>" +
    bookinglinkhtml +
    "<p>" +
    resource.description +
    "</p>" +
    '<div id="calendarcontainer"></div>' +
    "<h3>Upcoming bookings</h3>" +
    '<ul class="bookinglist" id="bookinglist"></ul>';

  rendercalendar(bookings);
  renderbookinglist(bookings);
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
        b.purpose +
        "</li>"
      );
    })
    .join("");
}

function rendercalendar(bookings) {
  const container = document.getElementById("calendarcontainer");
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const bookeddates = {};
  bookings.forEach(function (b) {
    bookeddates[b.date] = true;
  });

  const firstday = new Date(year, month, 1);
  const daysinmonth = new Date(year, month + 1, 0).getDate();
  const startweekday = firstday.getDay();
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
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const datestring = year + "-" + mm + "-" + dd;
    const isbooked = bookeddates[datestring] ? "booked" : "";
    const istoday = datestring === todaystring() ? "today" : "";
    cellshtml += '<div class="calendarday ' + isbooked + " " + istoday + '">' + day + "</div>";
  }

  container.innerHTML =
    '<div class="calendarheader"><h3>' +
    monthnames[month] +
    " " +
    year +
    "</h3></div>" +
    '<div class="calendargrid">' +
    cellshtml +
    "</div>";
}

function initfacilitiespage() {
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
