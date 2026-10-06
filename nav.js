function pagename() {
  const path = window.location.pathname;
  const file = path.substring(path.lastIndexOf("/") + 1);
  return file || "index.html";
}

function renderNav() {
  const role = getRole();
  const current = pagename();

  // Keep the menu honest about what the current role can actually do.
  const links = [
    { href: "index.html", label: "Dashboard", roles: ["community", "staff"] },
    { href: "facilities.html", label: "Find a Facility", roles: ["community", "staff"] },
    { href: "bookings.html", label: role === "staff" ? "Approvals" : "My Bookings", roles: ["community", "staff"] },
    { href: "maintenance.html", label: role === "staff" ? "Maintenance" : "Report an Issue", roles: ["community", "staff"] },
    { href: "closures.html", label: "Closures", roles: ["staff"] },
    { href: "reports.html", label: "Reports", roles: ["staff"] }
  ];

  const linkshtml = links
    .filter(function (link) {
      return link.roles.indexOf(role) !== -1;
    })
    .map(function (link) {
      const activeclass = link.href === current ? "active" : "";
      return '<li><a class="' + activeclass + '" href="' + link.href + '">' + link.label + "</a></li>";
    })
    .join("");

  const html =
    '<div class="navinner">' +
    '<a class="navbrand" href="index.html">Riverbend Council &middot; Facilities</a>' +
    '<ul class="navlinks">' +
    linkshtml +
    "</ul>" +
    '<div class="roleswitch">' +
    "<span>Viewing as</span>" +
    '<div class="rolebuttons">' +
    '<button type="button" class="rolebutton ' +
    (role === "community" ? "active" : "") +
    '" data-role="community">Community Member</button>' +
    '<button type="button" class="rolebutton ' +
    (role === "staff" ? "active" : "") +
    '" data-role="staff">Council Staff</button>' +
    "</div>" +
    "</div>" +
    "</div>";

  const nav = document.getElementById("sitenav");
  nav.className = "sitenav";
  nav.innerHTML = html;

  const buttons = nav.querySelectorAll(".rolebutton");
  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      setRole(button.getAttribute("data-role"));
      window.location.reload();
    });
  });
}

document.addEventListener("DOMContentLoaded", function () {
  dataReady.then(renderNav);
});
