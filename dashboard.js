function todaystring() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + mm + "-" + dd;
}

function renderdashboard() {
  const role = getRole();
  const intro = document.getElementById("dashboardintro");
  const grid = document.getElementById("statgrid");

  const bookings = getBookings();
  const resources = getResources();
  const tasks = getMaintenanceTasks();
  const closures = getClosures();

  let stats = [];

  // Staff get operational numbers; community members get the things they care about when booking.
  if (role === "staff") {
    intro.textContent = "Overview of council facilities, bookings, and maintenance.";

    const pending = bookings.filter(function (b) {
      return b.status === "pending";
    }).length;
    const activetasks = tasks.filter(function (t) {
      return t.status !== "resolved";
    }).length;
    const activeclosures = closures.filter(function (c) {
      return c.endDate >= todaystring();
    }).length;
    const approved = bookings.filter(function (b) {
      return b.status === "approved";
    }).length;

    stats = [
      { number: pending, label: "Pending approvals" },
      { number: activetasks, label: "Open maintenance tasks" },
      { number: activeclosures, label: "Active closures" },
      { number: approved, label: "Approved bookings" }
    ];
  } else {
    intro.textContent = "Find and book council facilities, rooms, and equipment.";

    const mybookings = bookings.filter(function (b) {
      return b.status === "approved" || b.status === "pending";
    }).length;
    const available = resources.filter(function (r) {
      return r.status === "available";
    }).length;

    stats = [
      { number: mybookings, label: "Your active bookings" },
      { number: available, label: "Facilities available" },
      { number: resources.length, label: "Total resources listed" }
    ];
  }

  grid.innerHTML = stats
    .map(function (stat) {
      return (
        '<div class="card statcard"><div class="statnumber">' +
        stat.number +
        '</div><div class="statlabel">' +
        stat.label +
        "</div></div>"
      );
    })
    .join("");
}

document.addEventListener("DOMContentLoaded", function () {
  dataReady.then(renderdashboard);
});