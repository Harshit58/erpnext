frappe.pages["management-dashboard"].on_page_load = function (wrapper) {
	frappe.call({
		method: "erpnext.setup.page.management_dashboard.management_dashboard.check_permission",
		callback: (r) => {
			if (!r.message) {
				window.location.href = "/app/home";
				return;
			}

			if (!$("#management-dashboard-css").length) {
				$("<link>", {
					id: "management-dashboard-css",
					rel: "stylesheet",
					type: "text/css",
					href: "/assets/erpnext/setup/page/management_dashboard/management_dashboard.css",
				}).appendTo("head");
			}

			const page = frappe.ui.make_app_page({
				parent: wrapper,
				title: __("Management Dashboard"),
			});

			page.set_primary_action(__("Refresh"), () => wrapper.dashboard.refresh(), "refresh");

			wrapper.dashboard = new erpnext.ManagementDashboard(wrapper);
		},
	});
};

erpnext.ManagementDashboard = class ManagementDashboard {
	constructor(wrapper) {
		this.wrapper = wrapper;
		this.page = wrapper.page;
		this.selected_date = frappe.datetime.get_today();
		this.$container = $(wrapper).find(".layout-main-section");
		this.setup_sidebar();
		this.setup_layout();
		this.setup_date_filter();
		this.refresh();
	}

	setup_sidebar() {
		let $side_section = $(this.wrapper).find(".layout-side-section");

		let list_sidebar = $(`
			<div class="list-sidebar overlay-sidebar hidden-xs hidden-sm">
				<div class="desk-sidebar list-unstyled sidebar-menu"></div>
			</div>
		`).appendTo($side_section);

		let $sidebar = list_sidebar.find(".desk-sidebar");

		frappe.xcall("frappe.desk.desktop.get_workspace_sidebar_items").then((data) => {
			if (!data || !data.pages) return;

			let current_route = frappe.get_route_str();

			let public_pages = data.pages
				.filter((p) => p.public && (!p.parent_page || p.parent_page === ""))
				.uniqBy((d) => d.title);

			let private_pages = data.pages
				.filter((p) => !p.public && (!p.parent_page || p.parent_page === ""))
				.uniqBy((d) => d.title);

			let render_section = (pages, label) => {
				if (!pages.length) return;

				let $section = $(
					`<div class="standard-sidebar-section nested-container"></div>`
				);
				let $title = $(`<button class="btn-reset standard-sidebar-label">
					<span>${frappe.utils.icon("es-line-down", "xs")}</span>
					<span class="section-title">${label}</span>
				</button>`).appendTo($section);

				$title.on("click", (e) => {
					const $e = $(e.currentTarget);
					const href = $e.find("span use").attr("href");
					const isCollapsed = href === "#es-line-down";
					$e.find("span use").attr(
						"href",
						isCollapsed ? "#es-line-right-chevron" : "#es-line-down"
					);
					$e.parent().find(".sidebar-item-container").toggleClass("hidden");
					$e.attr("aria-expanded", String(!isCollapsed));
				});

				pages.forEach((page) => {
					let route = page.public
						? frappe.router.slug(page.title)
						: "private/" + frappe.router.slug(page.title);
					let is_selected = current_route === route;

					$(`<div class="sidebar-item-container"
						item-parent=""
						item-name="${page.title}"
						item-public="${page.public || 0}"
						item-is-hidden="${page.is_hidden || 0}"
					>
						<div class="desk-sidebar-item standard-sidebar-item ${is_selected ? "selected" : ""}">
							<a href="/app/${route}" class="item-anchor" title="${__(page.title)}">
								<span class="sidebar-item-icon" item-icon="${page.icon || "folder-normal"}">
									${
										page.public
											? frappe.utils.icon(page.icon || "folder-normal", "md")
											: `<span class="indicator ${page.indicator_color || "gray"}"></span>`
									}
								</span>
								<span class="sidebar-item-label">${__(page.title)}</span>
							</a>
							<div class="sidebar-item-control"></div>
						</div>
						<div class="sidebar-child-item nested-container"></div>
					</div>`).appendTo($section);
				});

				$section.appendTo($sidebar);
			};

			render_section(public_pages, __("Modules"));
			render_section(private_pages, __("Private"));
		});
	}

	setup_layout() {
		this.$container.html(`
			<div class="management-dashboard">
				<div class="dashboard-header">
					<h1 class="dashboard-title">TRIDEV HEALTHCARE — MANAGEMENT DASHBOARD</h1>
					<div class="dashboard-subtitle">
						<span>Company Overview</span>|<span>Today</span>|<span>Current Month</span>
					</div>
					<div class="dashboard-welcome">Welcome back, ${frappe.boot.user.full_name || frappe.session.user}</div>
				</div>
				<div class="kpi-row"></div>
				<div class="section-card attendance-section">
					<h2 class="section-title">Team Attendance &amp; Status</h2>
					<div class="attendance-table-wrap"></div>
				</div>
				<div class="bottom-grid">
					<div class="section-card productivity-section">
						<h2 class="section-title">Team Productivity</h2>
						<div class="productivity-table-wrap"></div>
					</div>
					<div class="section-card tasks-section">
						<h2 class="section-title">Task Performance</h2>
						<div class="tasks-table-wrap"></div>
					</div>
				</div>
			</div>
		`);

		this.$kpi_row = this.$container.find(".kpi-row");
		this.$attendance_wrap = this.$container.find(".attendance-table-wrap");
		this.$productivity_wrap = this.$container.find(".productivity-table-wrap");
		this.$tasks_wrap = this.$container.find(".tasks-table-wrap");
	}

	setup_date_filter() {
		this.page.add_field({
			fieldtype: "Date",
			fieldname: "dashboard_date",
			label: __("Date"),
			default: this.selected_date,
			change: () => {
				this.selected_date = this.page.fields_dict.dashboard_date.get_value();
				this.refresh();
			},
		});
	}

	refresh() {
		this.$attendance_wrap.html(`<div class="loading-state">${__("Loading dashboard...")}</div>`);

		frappe.call({
			method: "erpnext.setup.page.management_dashboard.management_dashboard.get_dashboard_data",
			args: {
				for_date: this.selected_date,
			},
			callback: (r) => {
				if (!r.message || r.message.__no_permission) {
					window.location.href = "/app/home";
					return;
				}
				this.render(r.message);
			},
		});
	}

	render(data) {
		this.render_kpis(data.summary);
		this.render_attendance(data.attendance);
		this.render_productivity(data.productivity);
		this.render_tasks(data.tasks);
	}

	render_kpis(summary) {
		const cards = [
			{ label: __("Staff Present"), value: `${summary.staff_present}/${summary.staff_total}` },
			{ label: __("Hours Today"), value: `${summary.hours_today} hrs` },
			{ label: __("Tasks Pending"), value: summary.tasks_pending },
			{ label: __("EOD Pending"), value: summary.eod_pending },
			{ label: __("Meetings Today"), value: summary.meetings_today },
		];

		this.$kpi_row.html(
			cards
				.map(
					(card) => `
				<div class="kpi-card">
					<div class="kpi-label">${card.label}</div>
					<div class="kpi-value">${card.value}</div>
				</div>
			`
				)
				.join("")
		);
	}

	render_attendance(rows) {
		if (!rows.length) {
			this.$attendance_wrap.html(`<div class="empty-state">${__("No employees found")}</div>`);
			return;
		}

		const body = rows
			.map(
				(row) => `
			<tr>
				<td>${frappe.utils.escape_html(row.name)}</td>
				<td>
					<span class="status-pill">
						<span class="status-dot ${row.status_class}"></span>
						${frappe.utils.escape_html(row.status)}
					</span>
				</td>
				<td>${row.in_time}</td>
				<td>${row.out_time}</td>
				<td>${row.hours}</td>
			</tr>
		`
			)
			.join("");

		this.$attendance_wrap.html(`
			<table class="dashboard-table">
				<thead>
					<tr>
						<th>${__("Employee")}</th>
						<th>${__("Status")}</th>
						<th>${__("In")}</th>
						<th>${__("Out")}</th>
						<th>${__("Hours")}</th>
					</tr>
				</thead>
				<tbody>${body}</tbody>
			</table>
		`);
	}

	render_productivity(rows) {
		if (!rows.length) {
			this.$productivity_wrap.html(`<div class="empty-state">${__("No productivity data for this date")}</div>`);
			return;
		}

		const body = rows
			.map(
				(row) => `
			<tr>
				<td>${frappe.utils.escape_html(row.name)}</td>
				<td>
					<div class="score-bar-wrap">
						<div class="score-bar"><span style="width: ${row.score}%"></span></div>
						<strong>${row.score}%</strong>
					</div>
				</td>
			</tr>
		`
			)
			.join("");

		this.$productivity_wrap.html(`
			<table class="dashboard-table">
				<thead>
					<tr>
						<th>${__("Employee")}</th>
						<th>${__("Score")}</th>
					</tr>
				</thead>
				<tbody>${body}</tbody>
			</table>
		`);
	}

	render_tasks(tasks) {
		const items = [
			{ label: __("Total Tasks"), value: tasks.total },
			{ label: __("Completed"), value: tasks.completed },
			{ label: __("In Progress"), value: tasks.in_progress },
			{ label: __("Overdue"), value: tasks.overdue },
		];

		this.$tasks_wrap.html(`
			<ul class="metric-list">
				${items
					.map(
						(item) => `
					<li>
						<span>${item.label}</span>
						<strong>${item.value}</strong>
					</li>
				`
					)
					.join("")}
			</ul>
		`);
	}
};
