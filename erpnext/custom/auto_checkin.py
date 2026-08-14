import frappe


DEFAULT_ROLES = ["Employee", "System Manager", "HR User"]


def _get_employee_for_current_user():
	"""Returns active Employee name linked to the current session user, or None."""
	user = frappe.session.user
	if user in ("Guest", ""):
		return None, None

	allowed_roles = frappe.conf.get("auto_checkin_roles") or DEFAULT_ROLES
	user_roles = frappe.get_roles(user)
	if not any(role in user_roles for role in allowed_roles):
		return user, None

	if not frappe.db.table_exists("Employee Checkin"):
		return user, None

	employee = frappe.db.get_value(
		"Employee",
		{"user_id": user, "status": "Active"},
		"name",
	)
	return user, employee


def auto_checkin_on_login():
	"""
	Auto-creates an Employee Checkin (IN) on login, once per day per employee.

	Activated per-site by adding to site_config.json:
	    { "auto_checkin_on_login": 1 }

	Optionally configure which roles trigger the check-in (defaults to Employee + System Manager + HR User):
	    { "auto_checkin_roles": ["Employee", "System Manager", "HR User"] }

	Sites without "auto_checkin_on_login" are not affected.
	"""
	if not frappe.conf.get("auto_checkin_on_login"):
		return

	_user, employee = _get_employee_for_current_user()
	if not employee:
		return

	today = frappe.utils.today()
	already_checked_in = frappe.db.exists(
		"Employee Checkin",
		{
			"employee": employee,
			"log_type": "IN",
			"time": ["between", [today + " 00:00:00", today + " 23:59:59"]],
		},
	)
	if already_checked_in:
		return

	checkin = frappe.new_doc("Employee Checkin")
	checkin.employee = employee
	checkin.log_type = "IN"
	checkin.time = frappe.utils.now_datetime()
	checkin.device_id = "System Login"
	checkin.insert(ignore_permissions=True)
	frappe.db.commit()


def auto_checkout_on_logout():
	"""
	Auto-creates an Employee Checkin (OUT) on logout, once per day per employee.

	Activated per-site by adding to site_config.json:
	    { "auto_checkout_on_logout": 1 }

	Uses the same "auto_checkin_roles" config as auto check-in.
	Only creates an OUT record if an IN record already exists for today.
	Sites without "auto_checkout_on_logout" are not affected.
	"""
	if not frappe.conf.get("auto_checkout_on_logout"):
		return

	_user, employee = _get_employee_for_current_user()
	if not employee:
		return

	today = frappe.utils.today()

	# Only check out if there was a check-in today
	checked_in_today = frappe.db.exists(
		"Employee Checkin",
		{
			"employee": employee,
			"log_type": "IN",
			"time": ["between", [today + " 00:00:00", today + " 23:59:59"]],
		},
	)
	if not checked_in_today:
		return

	already_checked_out = frappe.db.exists(
		"Employee Checkin",
		{
			"employee": employee,
			"log_type": "OUT",
			"time": ["between", [today + " 00:00:00", today + " 23:59:59"]],
		},
	)
	if already_checked_out:
		return

	checkout = frappe.new_doc("Employee Checkin")
	checkout.employee = employee
	checkout.log_type = "OUT"
	checkout.time = frappe.utils.now_datetime()
	checkout.device_id = "System Logout"
	checkout.insert(ignore_permissions=True)
	frappe.db.commit()
