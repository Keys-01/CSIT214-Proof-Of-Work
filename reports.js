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
        escapehtml(entry.timestamp) +
        "</td>" +
        "<td>" +
        escapehtml(entry.actor) +
        "</td>" +
        "<td>" +
        escapehtml(entry.action) +
        "</td>" +
        "<td>" +
        escapehtml(entry.details) +
        "</td>" +
        "</tr>"
      );
    })
    .join("");
}

function initreportspage() {
  if (blockifnotstaff()) {
    return;
  }
  renderaudittable();

  document.getElementById("auditsearch").addEventListener("input", function () {
    renderaudittable();
  });
}

document.addEventListener("DOMContentLoaded", function () {
  dataReady.then(initreportspage);
});
