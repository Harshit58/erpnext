import frappe


def execute():
	"""Fix user-customized Home workspaces that still have Management Dashboard as Page type.

	bench migrate reloads the public workspace fixture but leaves per-user copies untouched,
	so users who customized Home before the Page→URL fix still get the permission error.
	"""
	shortcuts = frappe.get_all(
		"Workspace Shortcut",
		filters={
			"parent": ["like", "%-for-%"],
			"label": "Management Dashboard",
			"type": "Page",
		},
		fields=["name"],
	)

	for sc in shortcuts:
		frappe.db.set_value(
			"Workspace Shortcut",
			sc.name,
			{"type": "URL", "link_to": "/app/management-dashboard"},
			update_modified=False,
		)

	frappe.db.commit()
