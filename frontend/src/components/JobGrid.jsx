import { useMemo, useRef, useCallback } from 'react';
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

export default function JobGrid({ jobs, technicians, onContextMenu, onDragStart }) {
	const gridRef = useRef(null);
	const dragStartPos = useRef(null);

	const columnDefs = useMemo(() => [
		{
			headerName: 'Job ID', width: 85, pinned: 'left', sort: 'asc',
			valueGetter: (params) => params.data?.job_number || String(params.data?.id),
			cellStyle: { fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' },
		},
		{ field: 'job_type', headerName: 'Type', width: 100, cellRenderer: JobTypeCellRenderer },
		{ field: 'status', headerName: 'Status', width: 110, cellRenderer: StatusCellRenderer },
		{ field: 'priority', headerName: 'Pri', width: 50, cellRenderer: PriorityCellRenderer },
		{ field: 'customer_name', headerName: 'Customer', minWidth: 140, flex: 1 },
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
			valueGetter: (params) => params.data?.time_slot_start ? `${params.data.time_slot_start}-${params.data.time_slot_end}` : '',
		},
		{ field: 'estimated_duration', headerName: 'Dur', width: 65, cellRenderer: DurationCellRenderer },
		{ field: 'required_skills', headerName: 'Skills', minWidth: 150, flex: 1, cellRenderer: SkillsCellRenderer },
	], []);

	const defaultColDef = useMemo(() => ({ sortable: true, resizable: true, suppressMovable: false }), []);

	const onCellContextMenu = useCallback((params) => {
		if (params.event && params.data && onContextMenu) onContextMenu(params.event, params.data);
	}, [onContextMenu]);

	// --- Custom drag: mousedown starts tracking, only fires drag if mouse moves 5+ px ---
	const handleMouseDown = useCallback((e) => {
		// Only left mouse button, skip if clicking on scrollbar or header
		if (e.button !== 0) return;
		const rowEl = e.target.closest('.ag-row');
		if (!rowEl) return;

		dragStartPos.current = { x: e.clientX, y: e.clientY, rowEl };

		const handleMouseMoveCheck = (ev) => {
			if (!dragStartPos.current) return;
			const dx = ev.clientX - dragStartPos.current.x;
			const dy = ev.clientY - dragStartPos.current.y;
			// Only start drag if moved 5+ pixels (prevents accidental drags on click)
			if (Math.abs(dx) + Math.abs(dy) > 5) {
				const rowIndex = Number(dragStartPos.current.rowEl.getAttribute('row-index'));
				const gridApi = gridRef.current?.api;
				if (gridApi) {
					const node = gridApi.getDisplayedRowAtIndex(rowIndex);
					if (node?.data && onDragStart) {
						onDragStart(node.data);
					}
				}
				cleanup();
			}
		};

		const handleMouseUpCancel = () => {
			cleanup();
		};

		const cleanup = () => {
			dragStartPos.current = null;
			document.removeEventListener('mousemove', handleMouseMoveCheck);
			document.removeEventListener('mouseup', handleMouseUpCancel);
		};

		document.addEventListener('mousemove', handleMouseMoveCheck);
		document.addEventListener('mouseup', handleMouseUpCancel);
	}, [onDragStart]);

	return (
		<div
			className="ag-theme-fieldopt"
			style={{ width: '100%', height: '100%' }}
			onMouseDown={handleMouseDown}
		>
			<AgGridReact
				ref={gridRef}
				rowData={jobs}
				columnDefs={columnDefs}
				defaultColDef={defaultColDef}
				getRowId={(params) => String(params.data.id)}
				rowSelection="single"
				animateRows={false}
				headerHeight={28}
				rowHeight={26}
				suppressCellFocus={true}
				onCellContextMenu={onCellContextMenu}
				preventDefaultOnContextMenu={true}
			/>
		</div>
	);
}
