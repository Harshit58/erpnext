import json

import frappe


def execute():
	"""Fix user-customized Home workspaces that still have Management Dashboard as Page type.

	bench migrate reloads the public workspace fixture but leaves per-user copies untouched,
	so users who customized Home before the Page→URL fix still get the permission error.
	"""
	user_workspaces = frappe.get_all(
		"Workspace",
		filters={"name": ["like", "Home-for-%"], "for_user": ["!=", ""]},
		fields=["name", "shortcuts"],
	)

	for ws in user_workspaces:
		if not ws.shortcuts:
			continue

		try:
			shortcuts = json.loads(ws.shortcuts)
		except (json.JSONDecodeError, TypeError):
			continue

		changed = False
		for sc in shortcuts:
			if sc.get("label") == "Management Dashboard" and sc.get("type") == "Page":
				sc["type"] = "URL"
				sc["link_to"] = "/app/management-dashboard"
				changed = True

		if changed:
			frappe.db.set_value("Workspace", ws.name, "shortcuts", json.dumps(shortcuts))

	frappe.db.commit()
