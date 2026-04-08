import { useState, useCallback, useRef, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import FloatingWindow from './FloatingWindow';
import { api } from '../api/client';

ModuleRegistry.registerModules([AllCommunityModule]);

/**
 * JobSearchWindow — WFX-style Job Search.
 * Opens with search criteria form. User fills criteria, hits Search.
 * Results display in a grid. Can modify criteria and re-search.
 * Double-click a result to open job detail.
 * Right-click for context actions (assign, status change).
 * Drag from results onto a tech in the main R&D.
 *
 * Props:
 *   viewDate        — current R&D view date (for drag date validation)
 *   onClose         — close handler
 *   onJobDetail     — callback(job) to open detail view
 *   onDragStart     — callback(job) to initiate drag into main R&D
 *   onContextMenu   — callback(event, job) to show context menu
 */

function fmtDate(d) {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function JobSearchWindow({ viewDate, onClose, onJobDetail, onDragStart, onContextMenu }) {
	/* ── Search criteria state ────────────────────────────── */
	const [dateFrom, setDateFrom] = useState(fmtDate(viewDate));
	const [dateTo, setDateTo] = useState(fmtDate(viewDate));
	const [jobId, setJobId] = useState('');
	const [techId, setTechId] = useState('');
	const [customerName, setCustomerName] = useState('');
	const [status, setStatus] = useState('');
	const [jobType, setJobType] = useState('');
	const [routeCriteria, setRouteCriteria] = useState('');

	/* ── Results state ────────────────────────────────────── */
	const [results, setResults] = useState(null); // null = not yet searched
	const [searching, setSearching] = useState(false);
	const [resultCount, setResultCount] = useState(0);
	const gridRef = useRef(null);

	/* ── Search ───────────────────────────────────────────── */
	const handleSearch = useCallback(async () => {
		setSearching(true);
		try {
			const params = {};
			if (dateFrom) params.date_from = dateFrom;
			if (dateTo) params.date_to = dateTo;
			if (jobId.trim()) params.job_id = Number(jobId);
			if (techId.trim()) params.tech_id = Number(techId);
			if (customerName.trim()) params.customer_name = customerName.trim();
			if (status) params.status = status;
			if (jobType) params.job_type = jobType;
			if (routeCriteria.trim()) params.route_criteria = routeCriteria.trim();

			const res = await api.searchJobs(params);
			setResults(res.data);
			setResultCount(res.data.length);
		} catch (e) {
			console.error('Job search failed:', e);
			setResults([]);
			setResultCount(0);
		} finally {
			setSearching(false);
		}
	}, [dateFrom, dateTo, jobId, techId, customerName, status, jobType, routeCriteria]);

	/* ── Clear ────────────────────────────────────────────── */
	const handleClear = useCallback(() => {
		setDateFrom(fmtDate(viewDate));
		setDateTo(fmtDate(viewDate));
		setJobId('');
		setTechId('');
		setCustomerName('');
		setStatus('');
		setJobType('');
		setRouteCriteria('');
		setResults(null);
		setResultCount(0);
	}, [viewDate]);

	/* ── Double-click for detail ──────────────────────────── */
	const handleRowDoubleClicked = useCallback((p) => {
		if (p.data && onJobDetail) onJobDetail(p.data);
	}, [onJobDetail]);

	/* ── Drag initiation from search results ─────────────── */
	const handleMouseDown = useCallback((e) => {
		if (e.button !== 0) return;
		if (e.target.closest('.ag-header')) return;
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

	/* ── Column definitions (matches main job grid) ──────── */
	const columnDefs = useMemo(() => [
		{
			headerName: 'Job ID', width: 70,
			valueGetter: (p) => p.data?.job_number || String(p.data?.id),
			cellStyle: { fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' },
		},
		{
			field: 'job_type', headerName: 'Type', width: 90,
			valueFormatter: (p) => p.value?.replace(/_/g, ' ') || '',
			cellStyle: { textTransform: 'capitalize', fontSize: 'var(--font-size-xs)' },
		},
		{
			field: 'status', headerName: 'Status', width: 90,
			cellStyle: (p) => ({
				fontSize: 'var(--font-size-xs)',
				fontWeight: 500,
				color: p.value === 'pending' ? 'var(--color-warning)'
					: p.value === 'completed' ? 'var(--color-success)'
					: p.value === 'cancelled' ? 'var(--color-danger)'
					: p.value === 'in_progress' ? 'var(--color-purple)'
					: 'var(--text-primary)',
			}),
			valueFormatter: (p) => p.value?.replace(/_/g, ' ') || '',
		},
		{
			field: 'assigned_tech_name', headerName: 'Tech', width: 100,
			valueFormatter: (p) => p.value || '—',
			cellStyle: { fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' },
		},
		{
			field: 'priority', headerName: 'Pri', width: 45,
			cellStyle: (p) => ({
				fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)',
				color: p.value === 1 ? 'var(--color-danger)' : p.value === 2 ? 'var(--color-warning)' : 'var(--text-muted)',
			}),
		},
		{ field: 'customer_name', headerName: 'Customer', minWidth: 120, flex: 1 },
		{
			field: 'route_criteria', headerName: 'RteC', width: 85,
			cellStyle: { fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' },
			valueFormatter: (p) => p.value || '—',
		},
		{
			field: 'service_address', headerName: 'Address', minWidth: 140, flex: 1,
			cellStyle: { fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' },
		},
		{
			field: 'service_city', headerName: 'City', width: 85,
			cellStyle: { fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' },
		},
		{
			field: 'service_zip', headerName: 'Zip', width: 60,
			cellStyle: { fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' },
		},
		{
			headerName: 'Time Slot', width: 95,
			valueGetter: (p) => p.data?.time_slot_start ? `${p.data.time_slot_start}–${p.data.time_slot_end}` : '',
			cellStyle: { fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' },
		},
		{
			field: 'estimated_duration', headerName: 'Dur', width: 55,
			cellStyle: { fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' },
			valueFormatter: (p) => {
				if (!p.value) return '';
				const hrs = Math.floor(p.value / 60);
				const mins = p.value % 60;
				return hrs > 0 ? `${hrs}h${mins > 0 ? ` ${mins}m` : ''}` : `${mins}m`;
			},
		},
		{
			field: 'required_skills', headerName: 'Skills', minWidth: 120, flex: 1,
			valueFormatter: (p) => p.value?.join(', ') ?? '',
			cellStyle: { fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' },
		},
	], []);

	const defaultColDef = useMemo(() => ({ sortable: true, resizable: true }), []);

	/* ── Right-click on search results ────────────────────── */
	const onCellContextMenu = useCallback((p) => {
		if (p.event && p.data && onContextMenu) onContextMenu(p.event, p.data);
	}, [onContextMenu]);

	/* ── Enter key to search ──────────────────────────────── */
	const handleKeyDown = useCallback((e) => {
		if (e.key === 'Enter') handleSearch();
	}, [handleSearch]);

	return (
		<FloatingWindow
			title="Job Search"
			onClose={onClose}
			defaultPos={{ x: 100, y: 50 }}
			defaultSize={{ w: 740, h: 520 }}
			minSize={{ w: 560, h: 380 }}
			className="fw-job-search"
			zIndex={1600}
		>
			{/* Search criteria form */}
			<div className="js-criteria" onKeyDown={handleKeyDown}>
				<div className="js-row">
					<label className="js-label">From</label>
					<input type="date" className="js-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
					<label className="js-label">To</label>
					<input type="date" className="js-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
					<label className="js-label">Job ID</label>
					<input type="text" className="js-input js-input--sm" value={jobId} onChange={(e) => setJobId(e.target.value)} placeholder="#" />
				</div>
				<div className="js-row">
					<label className="js-label">Customer</label>
					<input type="text" className="js-input js-input--lg" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Name..." />
					<label className="js-label">Tech #</label>
					<input type="text" className="js-input js-input--sm" value={techId} onChange={(e) => setTechId(e.target.value)} placeholder="#" />
					<label className="js-label">Route</label>
					<input type="text" className="js-input" value={routeCriteria} onChange={(e) => setRouteCriteria(e.target.value)} placeholder="MN-..." />
				</div>
				<div className="js-row">
					<label className="js-label">Status</label>
					<select className="js-select" value={status} onChange={(e) => setStatus(e.target.value)}>
						<option value="">All</option>
						<option value="pending">Pending</option>
						<option value="assigned">Assigned</option>
						<option value="in_progress">In Progress</option>
						<option value="completed">Completed</option>
						<option value="cancelled">Cancelled</option>
						<option value="on_hold">On Hold</option>
					</select>
					<label className="js-label">Type</label>
					<select className="js-select" value={jobType} onChange={(e) => setJobType(e.target.value)}>
						<option value="">All</option>
						<option value="install">Install</option>
						<option value="repair">Repair</option>
						<option value="maintenance">Maintenance</option>
						<option value="inspection">Inspection</option>
						<option value="disconnect">Disconnect</option>
						<option value="service_change">Service Change</option>
					</select>
					<div style={{ flex: 1 }} />
					<button className="btn btn--sm" onClick={handleClear}>Clear</button>
					<button className="btn btn--sm btn--primary" onClick={handleSearch} disabled={searching}>
						{searching ? 'Searching...' : 'Search'}
					</button>
				</div>
			</div>

			{/* Results */}
			{results === null ? (
				<div className="js-placeholder">
					Enter search criteria and click Search
				</div>
			) : (
				<>
					<div className="js-result-header">
						<span className="js-result-count">{resultCount} job{resultCount !== 1 ? 's' : ''} found</span>
						<span className="js-result-hint">Double-click for details · Drag to assign</span>
					</div>
					<div
						className="ag-theme-fieldopt js-grid"
						style={{ flex: 1, minHeight: 0 }}
						onMouseDown={handleMouseDown}
					>
						<AgGridReact
							ref={gridRef}
							rowData={results}
							columnDefs={columnDefs}
							defaultColDef={defaultColDef}
							getRowId={(p) => String(p.data.id)}
							animateRows={false}
							headerHeight={26}
							rowHeight={24}
							suppressCellFocus={true}
							onRowDoubleClicked={handleRowDoubleClicked}
							onCellContextMenu={onCellContextMenu}
							preventDefaultOnContextMenu={true}
						/>
					</div>
				</>
			)}
		</FloatingWindow>
	);
}
