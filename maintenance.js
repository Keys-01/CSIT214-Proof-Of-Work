const STAFFMEMBERS = ["Dave Whitfield", "Priya Shah", "Tom Nguyen"];

function resourcename(resourceid) {
  const resource = getResources().filter(function (r) {
    return r.id === resourceid;
  })[0];
  return resource ? resource.name : "Unknown resource";
}

function todaystring() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + mm + "-" + dd;
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

function updateResourceMaintenanceStatus(resourceid) {
  const resource = getResources().filter(function (r) {
    return r.id === resourceid;
  })[0];

  if (!resource) {
    return;
  }

  const activeclosure = getClosures().some(function (c) {
    return (
      c.resourceId === resourceid &&
      c.startDate <= todaystring() &&
      c.endDate >= todaystring()
    );
  });

  if (activeclosure) {
    setresourcestatus(resourceid, "closed");
    return;
  }

  const hasOpenMaintenance = getMaintenanceTasks().some(function (task) {
    return task.resourceId === resourceid && task.status !== "resolved";
  });

  // Once a closure is ruled out, an open task is enough to mark the resource unavailable.
  setresourcestatus(resourceid, hasOpenMaintenance ? "maintenance" : "available");
}

function prioritylabel(priority) {
  if (priority === "high") {
    return "High";
  }
  if (priority === "medium") {
    return "Medium";
  }
  return "Low";
}

function maintenancestatusbadgeclass(status) {
  if (status === "reported") {
    return "badgedanger";
  }
  if (status === "assigned") {
    return "badgewarning";
  }
  if (status === "in_progress") {
    return "badgeinfo";
  }
  return "badgesuccess";
}

function maintenancestatuslabel(status) {
  if (status === "reported") {
    return "Reported";
  }
  if (status === "assigned") {
    return "Assigned";
  }
  if (status === "in_progress") {
    return "In progress";
  }
  return "Resolved";
}

function populatemaintenanceresourceoptions() {
  const select = document.getElementById("resourceselect");
  const resources = getResources();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select a resource…";
  placeholder.disabled = true;
  placeholder.selected = true;
  select.appendChild(placeholder);

  resources.forEach(function (r) {
    const option = document.createElement("option");
    option.value = r.id;
    option.textContent = r.name;
    select.appendChild(option);
  });
}

function showmaintenancemessage(text, iswarning) {
  const box = document.getElementById("confirmmessage");
  const cssclass = iswarning ? "errormessage" : "confirmmessage";
  box.innerHTML = '<div class="' + cssclass + '">' + text + "</div>";
}

function handlemaintenancesubmit(event) {
  event.preventDefault();

  const resourceid = document.getElementById("resourceselect").value;
  const priority = document.getElementById("priorityinput").value;
  const reportedby = document.getElementById("reportedbyinput").value.trim();
  const description = document.getElementById("descriptioninput").value.trim();

  if (!resourceid || !priority || !reportedby || !description) {
    showmaintenancemessage("Please fill in every field before submitting.", true);
    return;
  }

  const task = {
    id: "m" + Date.now(),
    resourceId: resourceid,
    reportedBy: reportedby,
    description: description,
    priority: priority,
    status: "reported",
    assignedTo: null,
    createdAt: new Date().toISOString()
  };

  const tasks = getMaintenanceTasks();
  tasks.push(task);
  // Updating the resource here keeps facility search results in sync with the report.
  saveMaintenanceTasks(tasks);
  updateResourceMaintenanceStatus(resourceid);
  addAuditEntry(reportedby, "maintenance_reported", "Reported an issue with " + resourcename(resourceid));

  showmaintenancemessage("Thanks, your maintenance report has been submitted.", false);

  document.getElementById("maintenanceform").reset();
  populatemaintenanceresourceoptions();
  renderallmaintenanceviews();
}

function rendermyreports() {
  const body = document.getElementById("myreportsbody");
  const tasks = getMaintenanceTasks().slice().sort(function (a, b) {
    return b.createdAt.localeCompare(a.createdAt);
  });

  if (tasks.length === 0) {
    body.innerHTML = '<tr><td colspan="4" class="emptystate">No maintenance reports yet.</td></tr>';
    return;
  }

  body.innerHTML = tasks
    .map(function (t) {
      return (
        "<tr>" +
        "<td>" +
        resourcename(t.resourceId) +
        "</td>" +
        "<td>" +
        t.description +
        "</td>" +
        "<td>" +
        prioritylabel(t.priority) +
        "</td>" +
        '<td><span class="badge ' +
        maintenancestatusbadgeclass(t.status) +
        '">' +
        maintenancestatuslabel(t.status) +
        "</span></td>" +
        "</tr>"
      );
    })
    .join("");
}

function rendertaskqueue() {
  const body = document.getElementById("taskqueuebody");
  const tasks = getMaintenanceTasks().slice().sort(function (a, b) {
    return b.createdAt.localeCompare(a.createdAt);
  });

  if (tasks.length === 0) {
    body.innerHTML = '<tr><td colspan="6" class="emptystate">No maintenance tasks yet.</td></tr>';
    return;
  }

  body.innerHTML = tasks
    .map(function (t) {
      let actionshtml = "";
      if (t.status === "reported") {
        actionshtml =
          '<select data-assignselect="' +
          t.id +
          '">' +
          STAFFMEMBERS.map(function (name) {
            return '<option value="' + name + '">' + name + "</option>";
          }).join("") +
          "</select> " +
          '<button type="button" class="btn btnprimary" data-assign="' +
          t.id +
          '">Assign</button>';
      } else if (t.status === "assigned") {
        actionshtml =
          '<button type="button" class="btn btnsecondary" data-start="' +
          t.id +
          '">Start work</button> ' +
          '<button type="button" class="btn btnprimary" data-resolve="' +
          t.id +
          '">Mark resolved</button>';
      } else if (t.status === "in_progress") {
        actionshtml = '<button type="button" class="btn btnprimary" data-resolve="' + t.id + '">Mark resolved</button>';
      }

      return (
        "<tr>" +
        "<td>" +
        resourcename(t.resourceId) +
        "</td>" +
        "<td>" +
        t.description +
        "</td>" +
        "<td>" +
        prioritylabel(t.priority) +
        "</td>" +
        '<td><span class="badge ' +
        maintenancestatusbadgeclass(t.status) +
        '">' +
        maintenancestatuslabel(t.status) +
        "</span></td>" +
        "<td>" +
        (t.assignedTo ? t.assignedTo : "—") +
        "</td>" +
        "<td>" +
        actionshtml +
        "</td>" +
        "</tr>"
      );
    })
    .join("");

  body.querySelectorAll("[data-assign]").forEach(function (button) {
    button.addEventListener("click", function () {
      const id = button.getAttribute("data-assign");
      const select = body.querySelector('[data-assignselect="' + id + '"]');
      assigntask(id, select.value);
    });
  });
  body.querySelectorAll("[data-start]").forEach(function (button) {
    button.addEventListener("click", function () {
      starttask(button.getAttribute("data-start"));
    });
  });
  body.querySelectorAll("[data-resolve]").forEach(function (button) {
    button.addEventListener("click", function () {
      resolvetask(button.getAttribute("data-resolve"));
    });
  });
}

function assigntask(id, assignedto) {
  const tasks = getMaintenanceTasks();
  const task = tasks.filter(function (t) {
    return t.id === id;
  })[0];
  if (!task) {
    return;
  }
  task.status = "assigned";
  task.assignedTo = assignedto;
  saveMaintenanceTasks(tasks);
  updateResourceMaintenanceStatus(task.resourceId);
  addAuditEntry("Council Staff", "maintenance_assigned", "Assigned task for " + resourcename(task.resourceId) + " to " + assignedto);
  renderallmaintenanceviews();
}

function starttask(id) {
  const tasks = getMaintenanceTasks();
  const task = tasks.filter(function (t) {
    return t.id === id;
  })[0];
  if (!task) {
    return;
  }
  task.status = "in_progress";
  saveMaintenanceTasks(tasks);
  updateResourceMaintenanceStatus(task.resourceId);
  addAuditEntry("Council Staff", "maintenance_started", "Started work on task for " + resourcename(task.resourceId));
  renderallmaintenanceviews();
}

function resolvetask(id) {
  const tasks = getMaintenanceTasks();
  const task = tasks.filter(function (t) {
    return t.id === id;
  })[0];
  if (!task) {
    return;
  }
  task.status = "resolved";
  saveMaintenanceTasks(tasks);
  updateResourceMaintenanceStatus(task.resourceId);
  addAuditEntry("Council Staff", "maintenance_resolved", "Resolved task for " + resourcename(task.resourceId));
  renderallmaintenanceviews();
}

function renderallmaintenanceviews() {
  const role = getRole();
  document.getElementById("myreportssection").hidden = role !== "community";
  document.getElementById("taskqueuesection").hidden = role !== "staff";

  if (role === "community") {
    rendermyreports();
  } else {
    rendertaskqueue();
  }
}

function initmaintenancepage() {
  populatemaintenanceresourceoptions();
  renderallmaintenanceviews();
  document.getElementById("maintenanceform").addEventListener("submit", handlemaintenancesubmit);
}

document.addEventListener("DOMContentLoaded", function () {
  dataReady.then(initmaintenancepage);
});
