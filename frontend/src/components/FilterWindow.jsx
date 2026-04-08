import { useState, useMemo, useCallback } from 'react';
import FloatingWindow from './FloatingWindow';

/**
 * FilterWindow — WFX-style sub-filter for the R&D.
 * Filters both grids by time slot, job type, route criteria, and technician.
 *
 * Props:
 *   jobs         — full unfiltered jobs array (to derive available options)
 *   technicians  — full unfiltered techs array
 *   activeFilter — current filter state { timeSlots, jobTypes, routeCriteria, techIds }
 *   onApply      — callback with new filter object
 *   onClose      — close handler
 */
export default function FilterWindow({ jobs, technicians, activeFilter, onApply, onClose }) {
	// Derive available options from loaded data
	const options = useMemo(() => {
		const timeSlots = new Set();
		const jobTypes = new Set();
		const routeCriteria = new Set();

		jobs.forEach((j) => {
			if (j.time_slot_start && j.time_slot_end) {
				timeSlots.add(`${j.time_slot_start}–${j.time_slot_end}`);
			}
			if (j.job_type) jobTypes.add(j.job_type);
			if (j.route_criteria) routeCriteria.add(j.route_criteria);
		});

		return {
			timeSlots: [...timeSlots].sort(),
			jobTypes: [...jobTypes].sort(),
			routeCriteria: [...routeCriteria].sort(),
			techs: technicians.map((t) => ({ id: t.id, name: t.name, employeeId: t.employee_id })),
		};
	}, [jobs, technicians]);

	// Local selection state — initialize from activeFilter or select all
	const [selTimeSlots, setSelTimeSlots] = useState(
		activeFilter?.timeSlots ?? [...options.timeSlots]
	);
	const [selJobTypes, setSelJobTypes] = useState(
		activeFilter?.jobTypes ?? [...options.jobTypes]
	);
	const [selRouteCriteria, setSelRouteCriteria] = useState(
		activeFilter?.routeCriteria ?? [...options.routeCriteria]
	);
	const [selTechIds, setSelTechIds] = useState(
		activeFilter?.techIds ?? options.techs.map((t) => t.id)
	);

	/* ── Toggle helpers ───────────────────────────────────── */
	const toggle = useCallback((set, setter, item) => {
		setter((prev) => prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]);
	}, []);

	const selectAll = useCallback((allItems, setter) => setter([...allItems]), []);
	const selectNone = useCallback((setter) => setter([]), []);

	/* ── Apply / Reset ────────────────────────────────────── */
	const handleApply = useCallback(() => {
		onApply({
			timeSlots: selTimeSlots,
			jobTypes: selJobTypes,
			routeCriteria: selRouteCriteria,
			techIds: selTechIds,
		});
	}, [selTimeSlots, selJobTypes, selRouteCriteria, selTechIds, onApply]);

	const handleReset = useCallback(() => {
		setSelTimeSlots([...options.timeSlots]);
		setSelJobTypes([...options.jobTypes]);
		setSelRouteCriteria([...options.routeCriteria]);
		setSelTechIds(options.techs.map((t) => t.id));
		onApply(null); // null = no filter active
	}, [options, onApply]);

	return (
		<FloatingWindow
			title="Display Filter"
			onClose={onClose}
			defaultPos={{ x: 160, y: 100 }}
			defaultSize={{ w: 560, h: 420 }}
			minSize={{ w: 440, h: 300 }}
			className="fw-filter"
		>
			<div className="filter-grid">
				{/* Time Slots */}
				<FilterList
					label="Time Slot"
					items={options.timeSlots}
					selected={selTimeSlots}
					onToggle={(item) => toggle(selTimeSlots, setSelTimeSlots, item)}
					onSelectAll={() => selectAll(options.timeSlots, setSelTimeSlots)}
					onSelectNone={() => selectNone(setSelTimeSlots)}
				/>

				{/* Job Types */}
				<FilterList
					label="Job Type"
					items={options.jobTypes}
					selected={selJobTypes}
					onToggle={(item) => toggle(selJobTypes, setSelJobTypes, item)}
					onSelectAll={() => selectAll(options.jobTypes, setSelJobTypes)}
					onSelectNone={() => selectNone(setSelJobTypes)}
					formatItem={(s) => s.replace(/_/g, ' ')}
				/>

				{/* Route Criteria */}
				<FilterList
					label="Route Criteria"
					items={options.routeCriteria}
					selected={selRouteCriteria}
					onToggle={(item) => toggle(selRouteCriteria, setSelRouteCriteria, item)}
					onSelectAll={() => selectAll(options.routeCriteria, setSelRouteCriteria)}
					onSelectNone={() => selectNone(setSelRouteCriteria)}
				/>

				{/* Technicians */}
				<FilterList
					label="Technicians"
					items={options.techs.map((t) => t.id)}
					selected={selTechIds}
					onToggle={(item) => toggle(selTechIds, setSelTechIds, item)}
					onSelectAll={() => selectAll(options.techs.map((t) => t.id), setSelTechIds)}
					onSelectNone={() => selectNone(setSelTechIds)}
					formatItem={(id) => {
						const t = options.techs.find((x) => x.id === id);
						return t ? `${t.employeeId || t.id} — ${t.name}` : String(id);
					}}
				/>
			</div>

			{/* Action buttons */}
			<div className="filter-actions">
				<button className="btn btn--sm" onClick={handleReset}>Reset</button>
				<div style={{ flex: 1 }} />
				<button className="btn btn--sm" onClick={onClose}>Cancel</button>
				<button className="btn btn--sm btn--primary" onClick={handleApply}>OK</button>
			</div>
		</FloatingWindow>
	);
}


/* ── Reusable multi-select list column ────────────────── */
function FilterList({ label, items, selected, onToggle, onSelectAll, onSelectNone, formatItem }) {
	const fmt = formatItem || ((x) => String(x));

	return (
		<div className="filter-col">
			<div className="filter-col-header">
				<span className="filter-col-label">{label}</span>
				<span className="filter-col-count">{selected.length}/{items.length}</span>
			</div>
			<div className="filter-col-list">
				{items.map((item) => (
					<button
						key={String(item)}
						className={`filter-item${selected.includes(item) ? ' filter-item--selected' : ''}`}
						onClick={() => onToggle(item)}
					>
						<span className={`filter-check${selected.includes(item) ? ' filter-check--on' : ''}`}>
							{selected.includes(item) ? '✓' : ''}
						</span>
						<span className="filter-item-label">{fmt(item)}</span>
					</button>
				))}
			</div>
			<div className="filter-col-actions">
				<button className="filter-link" onClick={onSelectAll}>All</button>
				<button className="filter-link" onClick={onSelectNone}>None</button>
			</div>
		</div>
	);
}
