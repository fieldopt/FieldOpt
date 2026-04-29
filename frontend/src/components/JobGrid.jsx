import { useMemo, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

function StatusCellRenderer({ value }) {
	if (!value) return null;
	return <span className={`status-badge status-badge--${value}`}>{value.replace(/_/g, ' ')}</span>;
}

function PriorityCellRenderer({ value }) {
	if (!value) return null;
	return <span className={`priority-cell priority-cell--${value}`}>{value}</span>;
}

function SkillsCellRenderer({ value }) {
	if (!value || value.length === 0) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
	return (
		<span className="skills-cell">
			{value.map((skill) => <span key={skill} className="skill-chip">{skill}</span>)}
		</span>
	);
}

function TimeSlotCellRenderer({ data }) {
	if (!data?.time_slot_start || !data?.time_slot_end) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
	return (
		<span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' }}>
			{data.time_slot_start}–{data.time_slot_end}
		</span>
	);
}

function JobTypeCellRenderer({ value }) {
	if (!value) return null;
	return <span style={{ textTransform: 'capitalize', fontSize: 'var(--font-size-xs)' }}>{value.replace(/_/g, ' ')}</span>;
}

function DurationCellRenderer({ value }) {
	if (!value) return null;
	const hrs = Math.floor(value / 60);
	const mins = value % 60;
	return (
		<span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
			{hrs > 0 ? `${hrs}h${mins > 0 ? ` ${mins}m` : ''}` : `${mins}m`}
		</span>
	);
}

function DateCellRenderer({ value }) {
	if (!value) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
	const d = new Date(value);
	return (
		<span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' }}>
			{(d.getMonth() + 1).toString().padStart(2, '0')}/{d.getDate().toString().padStart(2, '0')}
		</span>
	);
}

const JobGrid = forwardRef(function JobGrid({ jobs, selectedIds = [], onRowClicked, onContextMenu, onDragStart, onRowDoubleClicked, overrunMap, simElapsed }, ref) {
	const gridRef = useRef(null);

	useImperativeHandle(ref, () => ({
		selectAll: () => { gridRef.current?.api?.selectAll(); },
	}), []);

	const columnDefs = useMemo(() => [
		{
			headerName: 'Job ID', width: 85, pinned: 'left', sort: 'asc',
			valueGetter: (p) => p.data?.job_number || String(p.data?.id),
			comparator: (a, b) => {
				const na = parseInt(a, 10), nb = parseInt(b, 10);
				if (!isNaN(na) && !isNaN(nb)) return na - nb;
				return a.localeCompare(b);
			},
			cellStyle: { fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' },
		},
		{ field: 'job_type', headerName: 'Type', width: 100, cellRenderer: JobTypeCellRenderer },
		{ field: 'status', headerName: 'Status', width: 110, cellRenderer: StatusCellRenderer },
		{
			field: 'assigned_tech_name', headerName: 'Tech', width: 110,
			cellStyle: (p) => ({
				fontSize: 'var(--font-size-xs)',
				color: p.value ? 'var(--text-primary)' : 'var(--text-muted)',
			}),
			valueFormatter: (p) => p.value || '—',
		},
		{ field: 'priority', headerName: 'Pri', width: 50, cellRenderer: PriorityCellRenderer },
		{ field: 'customer_name', headerName: 'Customer', minWidth: 140, flex: 1 },
		{
			field: 'route_criteria', headerName: 'RteC', width: 90,
			cellStyle: { fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' },
			valueFormatter: (p) => p.value || '—',
		},
		{
			field: 'service_address', headerName: 'Address', minWidth: 180, flex: 1.5,
			cellStyle: { fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' },
		},
		{
			field: 'service_city', headerName: 'City', width: 100,
			cellStyle: { fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' },
		},
		{
			field: 'service_zip', headerName: 'Zip', width: 70,
			cellStyle: { fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' },
		},
		{ field: 'scheduled_date', headerName: 'Date', width: 65, cellRenderer: DateCellRenderer },
		{
			headerName: 'Time Slot', width: 105, cellRenderer: TimeSlotCellRenderer,
			valueGetter: (p) => p.data?.time_slot_start ? `${p.data.time_slot_start}-${p.data.time_slot_end}` : '',
		},
		{ field: 'estimated_duration', headerName: 'Dur', width: 65, cellRenderer: DurationCellRenderer },
		{
			field: 'required_skills', headerName: 'Skills', minWidth: 150, flex: 1,
			cellRenderer: SkillsCellRenderer,
			valueFormatter: (p) => p.value?.join(', ') ?? '',
		},
	], []);

	const defaultColDef = useMemo(() => ({ sortable: true, resizable: true, suppressMovable: false }), []);

	const rowSelection = useMemo(() => ({
		mode: 'multiRow',
		checkboxes: false,
		headerCheckbox: false,
		enableClickSelection: false,
	}), []);

	// Sync AG Grid selection — O(1) per selected ID via getRowNode hash lookup
	useEffect(() => {
		const gridApi = gridRef.current?.api;
		if (!gridApi) return;
		gridApi.deselectAll();
		selectedIds.forEach((id) => {
			gridApi.getRowNode(String(id))?.setSelected(true, false, 'api');
		});
	}, [selectedIds, jobs]);

	const onCellContextMenu = useCallback((p) => {
		if (p.event && p.data && onContextMenu) onContextMenu(p.event, p.data);
	}, [onContextMenu]);

	const handleRowClicked = useCallback((p) => {
		if (p.data && onRowClicked) {
			const displayedIds = [];
			gridRef.current?.api?.forEachNodeAfterFilterAndSort((node) => {
				if (node.data) displayedIds.push(node.data.id);
			});
			onRowClicked(p.data.id, p.event, displayedIds);
		}
	}, [onRowClicked]);

	// Drag initiation — mousedown with 8px threshold
	const handleMouseDown = useCallback((e) => {
		if (e.button !== 0) return;
		if (e.target.closest('.ag-header')) return;
		if (e.target.closest('.ag-horizontal-right-spacer')) return;
		const rowEl = e.target.closest('.ag-row');
		if (!rowEl) return;

		const startX = e.clientX;
		const startY = e.clientY;
		let fired = false;

		const onMove = (ev) => {
			if (fired) return;
			if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) > 8) {
				fired = true;
				const idx = Number(rowEl.getAttribute('row-index'));
				const node = gridRef.current?.api?.getDisplayedRowAtIndex(idx);
				if (node?.data && onDragStart) {
					document.body.style.userSelect = 'none';
					document.body.style.cursor = 'grabbing';
					onDragStart(node.data);
				}
				document.removeEventListener('mousemove', onMove);
				document.removeEventListener('mouseup', onUp);
			}
		};
		const onUp = () => {
			document.removeEventListener('mousemove', onMove);
			document.removeEventListener('mouseup', onUp);
		};
		document.addEventListener('mousemove', onMove);
		document.addEventListener('mouseup', onUp);
	}, [onDragStart]);

	// Touch drag initiation — long-press 200ms threshold
	const handleTouchStart = useCallback((e) => {
		if (e.target.closest('.ag-header')) return;
		const rowEl = e.target.closest('.ag-row');
		if (!rowEl) return;

		const t0 = e.touches[0];
		const startX = t0.clientX;
		const startY = t0.clientY;
		let timer = null;
		let fired = false;

		const cancel = () => {
			clearTimeout(timer);
			rowEl.removeEventListener('touchmove', onTouchMove);
			rowEl.removeEventListener('touchend', cancel);
		};
		const onTouchMove = (ev) => {
			const t = ev.touches[0];
			if (Math.abs(t.clientX - startX) + Math.abs(t.clientY - startY) > 10) cancel();
		};

		timer = setTimeout(() => {
			if (fired) return;
			fired = true;
			const idx = Number(rowEl.getAttribute('row-index'));
			const node = gridRef.current?.api?.getDisplayedRowAtIndex(idx);
			if (node?.data && onDragStart) {
				if (navigator.vibrate) navigator.vibrate(30);
				onDragStart(node.data);
			}
			cancel();
		}, 200);

		rowEl.addEventListener('touchmove', onTouchMove, { passive: true });
		rowEl.addEventListener('touchend', cancel, { once: true });
	}, [onDragStart]);

	const handleDoubleClick = useCallback((p) => {
		if (p.data && onRowDoubleClicked) onRowDoubleClicked(p.data);
	}, [onRowDoubleClicked]);

	return (
		<div
			className="ag-theme-fieldopt"
			style={{ width: '100%', height: '100%' }}
			onMouseDown={handleMouseDown}
			onTouchStart={handleTouchStart}
		>
			<AgGridReact
				ref={gridRef}
				rowData={jobs}
				columnDefs={columnDefs}
				defaultColDef={defaultColDef}
				getRowId={(p) => String(p.data.id)}
				rowSelection={rowSelection}
				selectionColumnDef={null}
				animateRows={false}
				headerHeight={28}
				rowHeight={26}
				suppressCellFocus={true}
				rowClassRules={{
					'row--overrun-yellow': (p) => overrunMap?.get(p.data?.id) === 'yellow',
					'row--overrun-red': (p) => overrunMap?.get(p.data?.id) === 'red',
					'row--overdue': (p) => {
						if (simElapsed == null) return false;
						const status = p.data?.status;
						if (status === 'completed' || status === 'cancelled') return false;
						const slotEnd = p.data?.time_slot_end;
						if (!slotEnd) return false;
						const [eh, em] = slotEnd.split(':').map(Number);
						const slotEndMin = eh * 60 + em;
						const nowMin = 8 * 60 + simElapsed;
						return nowMin > slotEndMin;
					},
				}}
				onCellContextMenu={onCellContextMenu}
				onRowClicked={handleRowClicked}
				onRowDoubleClicked={handleDoubleClick}
				preventDefaultOnContextMenu={true}
			/>
		</div>
	);
});

export default JobGrid;
