import { useMemo, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

function StatusCellRenderer({ value }) {
	if (!value) return null;
	return <span className={`status-badge status-badge--${value}`}>{value.replace(/_/g, ' ')}</span>;
}

function SkillsCellRenderer({ value }) {
	if (!value || value.length === 0) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
	return (
		<span className="skills-cell">
			{value.map((skill) => <span key={skill} className="skill-chip">{skill}</span>)}
		</span>
	);
}

function ShiftCellRenderer({ data }) {
	if (!data?.shift_start || !data?.shift_end) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
	return (
		<span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' }}>
			{data.shift_start}–{data.shift_end}
		</span>
	);
}

function JobCountCellRenderer({ data }) {
	if (!data) return null;
	const assigned = data.assigned_jobs ?? 0;
	const completed = data.completed_jobs ?? 0;
	return (
		<span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' }}>
			{assigned}<span style={{ color: 'var(--text-muted)' }}>:</span>{completed}
		</span>
	);
}

const TechGrid = forwardRef(function TechGrid({ technicians, selectedIds = [], onRowClicked, onContextMenu, isDragTarget }, ref) {
	const gridRef = useRef(null);
	const containerRef = useRef(null);

	// Expose a point-to-tech-id lookup so Dashboard can resolve drop targets without
	// stamping data-tech-id on every scroll frame.
	useImperativeHandle(ref, () => ({
		getTechIdAtPoint: (x, y) => {
			const el = document.elementFromPoint(x, y);
			const row = el?.closest('.ag-row');
			if (!row) return null;
			const idx = Number(row.getAttribute('row-index'));
			const node = gridRef.current?.api?.getDisplayedRowAtIndex(idx);
			return node?.data?.id ?? null;
		},
		selectAll: () => {
			gridRef.current?.api?.selectAll();
		},
	}), []);

	const columnDefs = useMemo(() => [
		{
			headerName: 'Tech ID', width: 85, pinned: 'left', sort: 'asc',
			valueGetter: (p) => p.data?.employee_id || String(p.data?.id),
			comparator: (a, b) => {
				// Numeric prefix sort: "MD001" → split letters/digits; pure numbers → numeric
				const na = parseInt(a, 10), nb = parseInt(b, 10);
				if (!isNaN(na) && !isNaN(nb)) return na - nb;
				return a.localeCompare(b);
			},
			cellStyle: { fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' },
		},
		{ field: 'name', headerName: 'Name', minWidth: 150, flex: 1, pinned: 'left' },
		{ field: 'status', headerName: 'Status', width: 110, cellRenderer: StatusCellRenderer },
		{
			headerName: 'Shift', width: 110, cellRenderer: ShiftCellRenderer,
			valueGetter: (p) => p.data?.shift_start ? `${p.data.shift_start}-${p.data.shift_end}` : '',
		},
		{
			headerName: 'Jobs A:C', width: 85, cellRenderer: JobCountCellRenderer,
			valueGetter: (p) => (p.data?.assigned_jobs ?? 0) + (p.data?.completed_jobs ?? 0),
		},
		{
			field: 'assigned_routes', headerName: 'Routes', width: 120,
			cellStyle: { fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' },
			valueFormatter: (p) => p.value?.join(', ') ?? '—',
		},
		{
			field: 'max_jobs_per_day', headerName: 'Max', width: 55,
			cellStyle: { fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' },
		},
		{
			field: 'skills', headerName: 'Skills', minWidth: 180, flex: 1,
			cellRenderer: SkillsCellRenderer,
			valueFormatter: (p) => p.value?.join(', ') ?? '',
		},
		{
			field: 'phone', headerName: 'Phone', width: 120,
			cellStyle: { fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' },
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
	}, [selectedIds, technicians]);

	const onCellContextMenu = useCallback((p) => {
		if (p.event && p.data && onContextMenu) onContextMenu(p.event, p.data);
	}, [onContextMenu]);

	const handleRowClicked = useCallback((p) => {
		if (p.data && onRowClicked) {
			// Get the current displayed order from AG Grid (respects sorting)
			const displayedIds = [];
			gridRef.current?.api?.forEachNodeAfterFilterAndSort((node) => {
				if (node.data) displayedIds.push(node.data.id);
			});
			onRowClicked(p.data.id, p.event, displayedIds);
		}
	}, [onRowClicked]);

	return (
		<div
			ref={containerRef}
			className={`ag-theme-fieldopt${isDragTarget ? ' drop-target-active' : ''}`}
			style={{ width: '100%', height: '100%' }}
		>
			<AgGridReact
				ref={gridRef}
				rowData={technicians}
				columnDefs={columnDefs}
				defaultColDef={defaultColDef}
				getRowId={(p) => String(p.data.id)}
				rowSelection={rowSelection}
				selectionColumnDef={null}
				animateRows={false}
				headerHeight={28}
				rowHeight={26}
				suppressCellFocus={true}
				onCellContextMenu={onCellContextMenu}
				onRowClicked={handleRowClicked}
				preventDefaultOnContextMenu={true}
			/>
		</div>
	);
});

export default TechGrid;
