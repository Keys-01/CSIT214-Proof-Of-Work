# Riverbend Council Facility Booking System

<!-- A small prototype, but it still tries to cover the whole booking journey. -->
A frontend-only prototype for managing council facilities, rooms, and equipment: searching and checking availability, requesting and approving bookings, detecting conflicts, cancelling bookings, reporting and assigning maintenance, scheduling temporary closures, and viewing utilisation reports and audit history.

This is a university assignment prototype (CSIT214 IT Project Management) for a fictional council, "Riverbend Council". It is built with plain HTML, CSS, and JavaScript — no framework, no build step, no backend. All data is seeded into the browser's `localStorage` on first load and persists across reloads.

## Running it

Open `index.html` directly in a web browser (double-click the file, or open it from your browser's File menu). No server, build step, or installation is required.

## Roles

There is no real login system. A role switcher in the top navigation bar lets you view the app as either:

- **Community Member** — search facilities, check availability, submit booking requests, view and cancel bookings, report maintenance issues.
- **Council Staff** — everything above, plus: approve/reject booking requests, assign and update maintenance tasks, schedule temporary closures and manage affected bookings, and view utilisation reports and audit history.

Switching roles reloads the page and changes which pages appear in the navigation bar — the Closures and Reports pages only appear once you've switched to Council Staff.

## Pages

- `index.html` — Dashboard with role-specific summary stats.
- `facilities.html` — Search and filter facilities, rooms, and equipment; view an availability calendar and upcoming bookings for each.
- `bookings.html` — Submit a booking request (with conflict detection), view and cancel your bookings, or (staff) approve/reject pending requests.
- `maintenance.html` — Report a maintenance issue, or (staff) assign and track maintenance tasks through to resolution.
- `closures.html` — (Staff) schedule a temporary closure for a resource and manage any bookings affected by it.
- `reports.html` — (Staff) utilisation charts and a searchable audit history of every booking, maintenance, and closure action.

## Data

All data lives in the browser's `localStorage`, seeded with sample facilities, bookings, maintenance tasks, and closures on first load. Clearing your browser's site data for this page will reset it back to the original sample data.

## Scope

As a prototype, this project deliberately does not include: real authentication, a backend/database, payment handling, or real email/SMS notifications. See `docs/design/design.md` for the full design rationale.

