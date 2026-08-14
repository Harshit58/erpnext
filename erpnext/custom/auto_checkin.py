import frappe


DEFAULT_ROLES = ["Employee", "System Manager", "HR User"]


def auto_checkin_on_login():
	"""
	Auto-creates an Employee Checkin (IN) on login, once per day per employee.

	Activated per-site by adding to site_config.json:
	    { "auto_checkin_on_login": 1 }

	Optionally configure which roles trigger the check-in (defaults to Employee + System Manager):
	    { "auto_checkin_roles": ["Employee", "System Manager"] }

	Sites without "auto_checkin_on_login" are not affected.
	"""
	if not frappe.conf.get("auto_checkin_on_login"):
		return

	if not frappe.db.table_exists("Employee Checkin"):
		return

	user = frappe.session.user
	if user == "Guest":
		return

	allowed_roles = frappe.conf.get("auto_checkin_roles") or DEFAULT_ROLES
	user_roles = frappe.get_roles(user)
	if not any(role in user_roles for role in allowed_roles):
		return

	employee = frappe.db.get_value(
		"Employee",
		{"user_id": user, "status": "Active"},
		"name",
	)
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
