import { useMemo, useRef, useCallback } from 'react';
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
	const assigned = data.assignments?.length ?? 0;
	const completed = data.assignments?.filter?.((a) => a.job?.status === 'completed')?.length ?? 0;
	return (
		<span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' }}>
			{assigned}<span style={{ color: 'var(--text-muted)' }}>:</span>{completed}
		</span>
	);
}

export default function TechGrid({ technicians, onContextMenu, isDragTarget }) {
	const gridRef = useRef(null);

	const columnDefs = useMemo(() => [
		{
			headerName: 'Tech ID',
			width: 85,
			pinned: 'left',
			sort: 'asc',
			valueGetter: (params) => params.data?.employee_id || String(params.data?.id),
			cellStyle: { fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' },
		},
		{ field: 'name', headerName: 'Name', minWidth: 150, flex: 1, pinned: 'left' },
		{ field: 'status', headerName: 'Status', width: 110, cellRenderer: StatusCellRenderer },
		{
			headerName: 'Shift', width: 110, cellRenderer: ShiftCellRenderer,
			valueGetter: (params) => params.data?.shift_start ? `${params.data.shift_start}-${params.data.shift_end}` : '',
		},
		{
			headerName: 'Jobs A:C', width: 85, cellRenderer: JobCountCellRenderer,
			valueGetter: (params) => params.data?.assignments?.length ?? 0,
		},
		{
			field: 'max_jobs_per_day', headerName: 'Max', width: 55,
			cellStyle: { fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' },
		},
		{ field: 'skills', headerName: 'Skills', minWidth: 180, flex: 1, cellRenderer: SkillsCellRenderer },
		{ field: 'phone', headerName: 'Phone', width: 120, cellStyle: { fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' } },
	], []);

	const defaultColDef = useMemo(() => ({ sortable: true, resizable: true, suppressMovable: false }), []);

	const onCellContextMenu = useCallback((params) => {
		if (params.event && params.data && onContextMenu) onContextMenu(params.event, params.data);
	}, [onContextMenu]);

	// Stamp each row with data-tech-id so the drag system can identify the drop target
	const onRowDataUpdated = useCallback(() => {
		requestAnimationFrame(() => {
			const gridApi = gridRef.current?.api;
			if (!gridApi) return;
			const container = gridRef.current?.eGridDiv;
			if (!container) return;
			container.querySelectorAll('.ag-row').forEach((rowEl) => {
				const idx = Number(rowEl.getAttribute('row-index'));
				const node = gridApi.getDisplayedRowAtIndex(idx);
				if (node?.data) rowEl.setAttribute('data-tech-id', String(node.data.id));
			});
		});
	}, []);

	return (
		<div className={`ag-theme-fieldopt${isDragTarget ? ' drop-target-active' : ''}`} style={{ width: '100%', height: '100%' }}>
			<AgGridReact
				ref={gridRef}
				rowData={technicians}
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
				onRowDataUpdated={onRowDataUpdated}
				onFirstDataRendered={onRowDataUpdated}
				onSortChanged={onRowDataUpdated}
				onFilterChanged={onRowDataUpdated}
			/>
		</div>
	);
}
