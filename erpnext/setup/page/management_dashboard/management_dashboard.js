frappe.pages["management-dashboard"].on_page_load = function (wrapper) {
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
		single_column: true,
	});

	page.set_primary_action(__("Refresh"), () => wrapper.dashboard.refresh(), "refresh");

	wrapper.dashboard = new erpnext.ManagementDashboard(wrapper);
};

erpnext.ManagementDashboard = class ManagementDashboard {
	constructor(wrapper) {
		this.wrapper = wrapper;
		this.page = wrapper.page;
		this.selected_date = frappe.datetime.get_today();
		this.$container = $(wrapper).find(".layout-main-section");
		this.setup_layout();
		this.setup_date_filter();
		this.refresh();
	}

	setup_layout() {
		this.$container.html(`
			<div class="management-dashboard">
				<div class="dashboard-header">
					<h1 class="dashboard-title">NLINK MANAGEMENT DASHBOARD</h1>
					<div class="dashboard-subtitle">
						<span>Company Overview</span>|<span>Today</span>|<span>Current Month</span>
					</div>
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
				if (!r.message) {
					this.$attendance_wrap.html(`<div class="empty-state">${__("No data available")}</div>`);
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
