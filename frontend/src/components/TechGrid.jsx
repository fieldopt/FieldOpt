import { useMemo, useRef, useCallback, useEffect } from 'react';
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

export default function TechGrid({ technicians, selectedIds = [], onRowClicked, onContextMenu, isDragTarget }) {
	const gridRef = useRef(null);
	const containerRef = useRef(null);

	const columnDefs = useMemo(() => [
		{
			headerName: 'Tech ID', width: 85, pinned: 'left', sort: 'asc',
			valueGetter: (p) => p.data?.employee_id || String(p.data?.id),
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

	// Sync AG Grid's internal selection with our selectedIds prop
	useEffect(() => {
		const gridApi = gridRef.current?.api;
		if (!gridApi) return;
		gridApi.deselectAll();
		if (selectedIds.length > 0) {
			gridApi.forEachNode((node) => {
				if (node.data && selectedIds.includes(node.data.id)) {
					node.setSelected(true, false, 'api');
				}
			});
		}
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

	// Stamp data-tech-id on rows for drag-drop target detection
	const stampTechIds = useCallback(() => {
		requestAnimationFrame(() => {
			const gridApi = gridRef.current?.api;
			const el = containerRef.current;
			if (!gridApi || !el) return;
			el.querySelectorAll('.ag-row').forEach((rowEl) => {
				const idx = Number(rowEl.getAttribute('row-index'));
				const node = gridApi.getDisplayedRowAtIndex(idx);
				if (node?.data) rowEl.setAttribute('data-tech-id', String(node.data.id));
			});
		});
	}, []);

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
				onRowDataUpdated={stampTechIds}
				onFirstDataRendered={stampTechIds}
				onSortChanged={stampTechIds}
				onFilterChanged={stampTechIds}
				onBodyScroll={stampTechIds}
			/>
		</div>
	);
}
