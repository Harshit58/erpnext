import frappe


def execute():
	"""Remove the Management Dashboard shortcut from Home workspaces.

	The shortcut moved to the role-restricted "Mgmt Dashboard" workspace so it is
	only visible to System Manager. Existing Home workspaces (public fixture and
	per-user "Home-for-*" copies) still carry the old, unrestricted shortcut and
	need it removed explicitly since bench migrate does not touch per-user copies.
	"""
	shortcuts = frappe.get_all(
		"Workspace Shortcut",
		filters={
			"parent": ["like", "Home%"],
			"parenttype": "Workspace",
			"label": "Management Dashboard",
		},
		fields=["name"],
	)

	for sc in shortcuts:
		frappe.delete_doc("Workspace Shortcut", sc.name, ignore_permissions=True, force=True)

	frappe.db.commit()
