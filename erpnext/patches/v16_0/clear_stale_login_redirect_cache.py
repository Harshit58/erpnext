import frappe


def execute():
	"""Clear stale redirect_after_login cache entries.

	Previously, non-System Manager users with matching allowed_roles were sent to
	/app/management-dashboard on login. Now all non-System Manager users go to /app/projects.
	Clear Redis entries so existing sessions pick up the new redirect on next login.
	"""
	all_users = frappe.get_all("User", filters={"enabled": 1}, pluck="name")

	for user in all_users:
		if user in ("Guest", "Administrator"):
			continue
		frappe.cache.hdel("redirect_after_login", user)
