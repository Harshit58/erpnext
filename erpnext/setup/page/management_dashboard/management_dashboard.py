# Copyright (c) 2026, NLINK and Contributors
# License: GNU General Public License v3. See license.txt

from datetime import datetime, timedelta

import frappe
from frappe import _
from frappe.utils import flt, get_datetime, getdate, now_datetime, today


def _day_bounds(for_date):
	for_date = getdate(for_date)
	start = datetime.combine(for_date, datetime.min.time())
	end = datetime.combine(for_date, datetime.max.time())
	return start, end


def _format_time(dt):
	if not dt:
		return "—"
	return get_datetime(dt).strftime("%H:%M")


def _format_duration(hours):
	if not hours:
		return "—"
	total_minutes = int(hours * 60)
	h = total_minutes // 60
	m = total_minutes % 60
	return f"{h}h {m:02d}m"


def _hours_between(in_time, out_time, now=None):
	if not in_time:
		return 0

	in_dt = get_datetime(in_time)
	out_dt = get_datetime(out_time) if out_time else (now or now_datetime())
	if out_dt < in_dt:
		return 0

	return flt((out_dt - in_dt).total_seconds() / 3600, 2)


def _has_dashboard_access():
	try:
		settings = frappe.get_single("Management Dashboard Settings")
		allowed_roles = {row.role for row in (settings.allowed_roles or [])}
	except Exception:
		allowed_roles = set()

	if not allowed_roles:
		allowed_roles = {"System Manager", "HR Manager"}

	return bool(set(frappe.get_roles()).intersection(allowed_roles))


@frappe.whitelist()
def get_dashboard_data(for_date=None):
	if not _has_dashboard_access():
		frappe.throw(_("Not permitted"), frappe.PermissionError)

	for_date = getdate(for_date or today())
	day_start, day_end = _day_bounds(for_date)
	now = now_datetime()
	is_today = for_date == getdate(today())

	employees = frappe.get_all(
		"Employee",
		filters={"status": "Active"},
		fields=["name", "employee_name", "first_name"],
		order_by="employee_name asc",
	)

	checkins = frappe.get_all(
		"Employee Checkin",
		filters={"time": ["between", [day_start, day_end]]},
		fields=["employee", "employee_name", "log_type", "time"],
		order_by="time asc",
	)

	checkins_by_employee = {}
	for row in checkins:
		checkins_by_employee.setdefault(row.employee, []).append(row)

	attendance_rows = []
	total_hours = 0
	present_count = 0
	productivity_rows = []

	for emp in employees:
		logs = checkins_by_employee.get(emp.name, [])
		in_logs = [log for log in logs if log.log_type == "IN"]
		out_logs = [log for log in logs if log.log_type == "OUT"]

		first_in = in_logs[0].time if in_logs else None
		last_out = out_logs[-1].time if out_logs else None

		if not first_in:
			status_label = "Absent"
			status_class = "absent"
		else:
			present_count += 1
			if last_out:
				status_label = "Checked Out"
				status_class = "checked-out"
			else:
				status_label = "Working"
				status_class = "working"

		hours = _hours_between(first_in, last_out, now if is_today and not last_out else None)
		if first_in:
			total_hours += hours

		display_name = emp.first_name or emp.employee_name or emp.name
		target_hours = 9
		score = min(100, int((hours / target_hours) * 100)) if hours else 0

		attendance_rows.append(
			{
				"employee": emp.name,
				"name": display_name,
				"status": status_label,
				"status_class": status_class,
				"in_time": _format_time(first_in),
				"out_time": _format_time(last_out),
				"hours": _format_duration(hours) if first_in else "—",
				"hours_value": hours,
			}
		)

		if first_in:
			productivity_rows.append(
				{
					"name": display_name,
					"score": score,
				}
			)

	productivity_rows.sort(key=lambda row: row["score"], reverse=True)

	todos = frappe.get_all("ToDo", fields=["name", "status", "description", "date"])
	open_todos = [todo for todo in todos if todo.status == "Open"]
	closed_todos = [todo for todo in todos if todo.status == "Closed"]
	cancelled_todos = [todo for todo in todos if todo.status == "Cancelled"]

	eod_pending = len(
		[
			todo
			for todo in open_todos
			if todo.description and "eod" in todo.description.lower()
		]
	)

	meetings_today = 0
	if frappe.db.table_exists("Event"):
		meetings_today = frappe.db.count(
			"Event",
			{
				"starts_on": ["between", [day_start, day_end]],
				"status": ["!=", "Cancelled"],
			},
		)

	overdue = 0
	for todo in open_todos:
		if todo.date and getdate(todo.date) < for_date:
			overdue += 1

	month_start = for_date.replace(day=1)
	month_attendance = frappe.db.count(
		"Attendance",
		{
			"attendance_date": ["between", [month_start, for_date]],
			"status": "Present",
			"docstatus": 1,
		},
	)

	return {
		"date": str(for_date),
		"summary": {
			"staff_present": present_count,
			"staff_total": len(employees),
			"hours_today": flt(total_hours, 1),
			"tasks_pending": len(open_todos),
			"eod_pending": eod_pending,
			"meetings_today": meetings_today,
			"month_present_days": month_attendance,
		},
		"attendance": attendance_rows,
		"productivity": productivity_rows,
		"tasks": {
			"total": len(todos),
			"completed": len(closed_todos),
			"in_progress": len(open_todos),
			"overdue": overdue,
			"cancelled": len(cancelled_todos),
		},
	}


def on_session_creation():
	"""Redirect users with allowed roles to the management dashboard on login."""
	user = frappe.session.user
	if not user or user == "Guest":
		return

	try:
		settings = frappe.get_single("Management Dashboard Settings")
		allowed_roles = [row.role for row in (settings.allowed_roles or [])]
	except Exception:
		return

	if not allowed_roles:
		return

	user_roles = set(frappe.get_roles(user))
	if user_roles.intersection(set(allowed_roles)):
		frappe.cache.hset("redirect_after_login", user, "/app/management-dashboard")
