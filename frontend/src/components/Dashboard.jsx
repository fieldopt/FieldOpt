import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client';
import TechGrid from './TechGrid';
import JobGrid from './JobGrid';
import MapWindow from './MapWindow';
import ContextMenu from './ContextMenu';
import Toast from './Toast';

export default function Dashboard() {
	// --- Data state ---
	const [technicians, setTechnicians] = useState([]);
	const [jobs, setJobs] = useState([]);
	const [summary, setSummary] = useState(null);
	const [loading, setLoading] = useState(true);

	// --- UI state ---
	const [splitRatio, setSplitRatio] = useState(0.4);
	const [isDragging, setIsDragging] = useState(false);
	const [mapOpen, setMapOpen] = useState(false);
	const [autoRouting, setAutoRouting] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const splitRef = useRef(null);

	// --- Context menu state ---
	const [contextMenu, setContextMenu] = useState(null);

	// --- Custom drag state ---
	const [dragState, setDragState] = useState(null); // { job, mouseX, mouseY } or null
	const techGridRef = useRef(null);

	// --- Filter state ---
	const [jobFilter, setJobFilter] = useState(null);
	const [techFilter, setTechFilter] = useState(null);

	// --- Toast state ---
	const [toasts, setToasts] = useState([]);
	const toastId = useRef(0);

	const showToast = useCallback((message, type = 'info') => {
		const id = ++toastId.current;
		setToasts((prev) => [...prev, { id, message, type }]);
		setTimeout(() => {
			setToasts((prev) => prev.filter((t) => t.id !== id));
		}, 3000);
	}, []);

	// --- Data loading ---
	const loadData = useCallback(async (showRefresh = false) => {
		if (showRefresh) setRefreshing(true);
		try {
			const [techsRes, jobsRes, summaryRes] = await Promise.all([
				api.getTechnicians(),
				api.getJobs(),
				api.getJobsSummary(),
			]);
			setTechnicians(techsRes.data);
			setJobs(jobsRes.data);
			setSummary(summaryRes.data);
		} catch (error) {
			console.error('Error loading data:', error);
			showToast('Failed to load data', 'error');
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, [showToast]);

	useEffect(() => {
		loadData();
		const interval = setInterval(() => loadData(), 30000);
		return () => clearInterval(interval);
	}, [loadData]);

	// --- Close context menu on click ---
	useEffect(() => {
		const close = () => setContextMenu(null);
		document.addEventListener('click', close);
		return () => document.removeEventListener('click', close);
	}, []);

	// --- Keyboard shortcuts ---
	useEffect(() => {
		const handleKey = (e) => {
			if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
			if (e.key === 'Escape') { setContextMenu(null); setMapOpen(false); }
			if (e.key === 'r' && !e.ctrlKey && !e.metaKey) loadData(true);
			if (e.key === 'm' && !e.ctrlKey && !e.metaKey) setMapOpen((prev) => !prev);
		};
		document.addEventListener('keydown', handleKey);
		return () => document.removeEventListener('keydown', handleKey);
	}, [loadData]);

	// --- Custom drag: global mouse tracking ---
	useEffect(() => {
		if (!dragState) return;

		const handleMouseMove = (e) => {
			setDragState((prev) => prev ? { ...prev, mouseX: e.clientX, mouseY: e.clientY } : null);
		};

		const handleMouseUp = (e) => {
			// Check if we released over the tech grid
			const techGridEl = techGridRef.current;
			if (techGridEl && dragState) {
				const rowEl = document.elementFromPoint(e.clientX, e.clientY)?.closest('.ag-row');
				if (rowEl && techGridEl.contains(rowEl)) {
					const rowIndex = Number(rowEl.getAttribute('row-index'));
					// Find the tech grid's AG Grid API via the ref
					const agEl = techGridEl.querySelector('.ag-body-viewport');
					if (agEl) {
						// Get tech data from row index by reading the row's data attribute
						// We'll use a simpler approach: find tech by rendered row position
						const techId = rowEl.getAttribute('data-tech-id');
						if (techId) {
							handleDropJobOnTech(dragState.job.id, Number(techId));
						}
					}
				}
			}
			setDragState(null);
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
		};

		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
		document.body.style.cursor = 'grabbing';
		document.body.style.userSelect = 'none';

		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
		};
	}, [dragState]); // eslint-disable-line react-hooks/exhaustive-deps

	// --- Auto-route ---
	const handleAutoRoute = useCallback(async () => {
		setAutoRouting(true);
		try {
			const res = await api.autoRoute();
			const assigned = res.data.jobs_assigned ?? 0;
			const unassigned = res.data.jobs_unassigned ?? 0;
			showToast(`Routed ${assigned} job${assigned !== 1 ? 's' : ''}${unassigned > 0 ? ` · ${unassigned} unassigned` : ''}`, assigned > 0 ? 'success' : 'warning');
			await loadData(true);
		} catch (error) {
			console.error('Error auto-routing:', error);
			showToast('Auto-route failed', 'error');
		} finally {
			setAutoRouting(false);
		}
	}, [loadData, showToast]);

	// --- Job actions ---
	const handleJobAction = useCallback(async (action, job) => {
		setContextMenu(null);
		try {
			const labels = { start: 'Started', complete: 'Completed', cancel: 'Cancelled', unassign: 'Unassigned', hold: 'On hold' };
			switch (action) {
				case 'start': await api.startJob(job.id); break;
				case 'complete': await api.completeJob(job.id); break;
				case 'cancel': await api.cancelJob(job.id); break;
				case 'unassign': await api.unassignJob(job.id); break;
				case 'hold': await api.updateJobStatus(job.id, 'on_hold'); break;
				default: return;
			}
			showToast(`Job #${job.id} — ${labels[action]}`, 'success');
			await loadData(true);
		} catch (error) {
			console.error(`Error performing ${action}:`, error);
			showToast(`Failed to ${action} job #${job.id}`, 'error');
		}
	}, [loadData, showToast]);

	// --- Tech actions ---
	const handleTechAction = useCallback(async (action, tech) => {
		setContextMenu(null);
		try {
			const statusMap = { set_available: 'available', set_on_break: 'on_break', set_off_duty: 'off_duty' };
			const status = statusMap[action];
			if (!status) return;
			await api.updateTechStatus(tech.id, status);
			showToast(`${tech.name} → ${status.replace(/_/g, ' ')}`, 'success');
			await loadData(true);
		} catch (error) {
			console.error(`Error performing ${action}:`, error);
			showToast(`Failed to update ${tech.name}`, 'error');
		}
	}, [loadData, showToast]);

	// --- Drop handler ---
	const handleDropJobOnTech = useCallback(async (jobId, techId) => {
		try {
			const job = jobs.find((j) => j.id === jobId);
			const tech = technicians.find((t) => t.id === techId);
			if (!job || !tech) return;
			if (job.status === 'assigned' || job.status === 'in_progress') {
				await api.reassignJob(jobId, techId);
			} else {
				await api.createAssignment({ job_id: jobId, technician_id: techId });
			}
			showToast(`Job #${jobId} → ${tech.name}`, 'success');
			await loadData(true);
		} catch (error) {
			console.error('Error assigning job:', error);
			showToast('Assignment failed', 'error');
		}
	}, [jobs, technicians, loadData, showToast]);

	// --- Context menu assign ---
	const handleAssignToTech = useCallback(async (jobId, techId) => {
		setContextMenu(null);
		try {
			const job = jobs.find((j) => j.id === jobId);
			const tech = technicians.find((t) => t.id === techId);
			if (!job || !tech) return;
			if (job.status === 'assigned' || job.status === 'in_progress') {
				await api.reassignJob(jobId, techId);
			} else {
				await api.createAssignment({ job_id: jobId, technician_id: techId });
			}
			showToast(`Job #${jobId} → ${tech.name}`, 'success');
			await loadData(true);
		} catch (error) {
			console.error('Error assigning job:', error);
			showToast('Assignment failed', 'error');
		}
	}, [jobs, technicians, loadData, showToast]);

	// --- Dashboard filter toggles ---
	const toggleJobFilter = useCallback((status) => {
		setJobFilter((prev) => (prev === status ? null : status));
		setTechFilter(null);
	}, []);

	const toggleTechFilter = useCallback((filter) => {
		setTechFilter((prev) => (prev === filter ? null : filter));
		setJobFilter(null);
	}, []);

	// --- Split divider ---
	const handleDividerMouseDown = useCallback((e) => {
		e.preventDefault();
		setIsDragging(true);
	}, []);

	useEffect(() => {
		if (!isDragging) return;
		const handleMouseMove = (e) => {
			if (!splitRef.current) return;
			const rect = splitRef.current.getBoundingClientRect();
			setSplitRatio(Math.min(Math.max((e.clientY - rect.top) / rect.height, 0.15), 0.85));
		};
		const handleMouseUp = () => setIsDragging(false);
		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
		document.body.style.cursor = 'row-resize';
		document.body.style.userSelect = 'none';
		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
		};
	}, [isDragging]);

	if (loading) {
		return (
			<div className="loading-screen">
				<div className="loading-spinner" />
				Loading FieldOpt...
			</div>
		);
	}

	// --- Computed ---
	const pendingCount = summary?.pending ?? 0;
	const assignedCount = summary?.assigned ?? 0;
	const inProgressCount = summary?.in_progress ?? 0;
	const completedCount = summary?.completed ?? 0;
	const onHoldCount = summary?.on_hold ?? 0;
	const failedCount = 0;
	const activeTechs = technicians.filter((t) => t.status === 'available' || t.status === 'on_job' || t.status === 'en_route').length;
	const offDutyTechs = technicians.filter((t) => t.status === 'off_duty').length;

	const filteredJobs = jobFilter ? jobs.filter((j) => j.status === jobFilter) : jobs;
	const filteredTechs = techFilter === 'active'
		? technicians.filter((t) => t.status === 'available' || t.status === 'on_job' || t.status === 'en_route')
		: techFilter === 'off_duty'
			? technicians.filter((t) => t.status === 'off_duty')
			: technicians;

	return (
		<div className="app-shell">
			{/* === Header === */}
			<header className="header-bar">
				<div className="header-brand">
					<div className="header-brand-icon" />
					FieldOpt
				</div>
				<div className="header-divider" />
				<span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Dispatch Console</span>
				<div className="header-actions">
					<button className={`btn${mapOpen ? ' btn--primary' : ''}`} onClick={() => setMapOpen((prev) => !prev)}>
						<MapIcon />Map
					</button>
					<button className="btn" onClick={() => loadData(true)} disabled={refreshing}>
						<RefreshIcon spinning={refreshing} />Refresh
					</button>
					<button className="btn btn--warning" onClick={handleAutoRoute} disabled={autoRouting || pendingCount === 0}>
						<BoltIcon />{autoRouting ? 'Routing...' : `Auto-Route ${pendingCount}`}
					</button>
				</div>
			</header>

			{/* === Dashboard Bar === */}
			<div className="dashboard-bar">
				<button className={`dash-indicator${jobFilter === 'pending' ? ' dash-indicator--active' : ''}`} onClick={() => toggleJobFilter('pending')}>
					<span className="dash-count dash-count--danger">{pendingCount}</span><span className="dash-label">Unassigned</span>
				</button>
				<button className={`dash-indicator${jobFilter === 'assigned' ? ' dash-indicator--active' : ''}`} onClick={() => toggleJobFilter('assigned')}>
					<span className="dash-count dash-count--info">{assignedCount}</span><span className="dash-label">Assigned</span>
				</button>
				<button className={`dash-indicator${jobFilter === 'in_progress' ? ' dash-indicator--active' : ''}`} onClick={() => toggleJobFilter('in_progress')}>
					<span className="dash-count dash-count--info">{inProgressCount}</span><span className="dash-label">In Progress</span>
				</button>
				<button className={`dash-indicator${jobFilter === 'completed' ? ' dash-indicator--active' : ''}`} onClick={() => toggleJobFilter('completed')}>
					<span className="dash-count dash-count--success">{completedCount}</span><span className="dash-label">Completed</span>
				</button>
				<button className={`dash-indicator${jobFilter === 'on_hold' ? ' dash-indicator--active' : ''}`} onClick={() => toggleJobFilter('on_hold')}>
					<span className="dash-count dash-count--warning">{onHoldCount}</span><span className="dash-label">On Hold</span>
				</button>
				<div className="dash-indicator">
					<span className="dash-count dash-count--warning">{failedCount}</span><span className="dash-label">Failed</span>
				</div>
				<div className="header-divider" />
				<button className={`dash-indicator${techFilter === 'active' ? ' dash-indicator--active' : ''}`} onClick={() => toggleTechFilter('active')}>
					<span className="dash-count dash-count--success">{activeTechs}</span><span className="dash-label">Techs Active</span>
				</button>
				<button className={`dash-indicator${techFilter === 'off_duty' ? ' dash-indicator--active' : ''}`} onClick={() => toggleTechFilter('off_duty')}>
					<span className="dash-count dash-count--muted">{offDutyTechs}</span><span className="dash-label">Off Duty</span>
				</button>
				<div className="dash-indicator">
					<span className="dash-count dash-count--muted">{technicians.length}</span><span className="dash-label">Total</span>
				</div>
				{(jobFilter || techFilter) && (
					<>
						<div className="header-divider" />
						<button className="dash-indicator dash-indicator--clear" onClick={() => { setJobFilter(null); setTechFilter(null); }}>
							✕ Clear Filter
						</button>
					</>
				)}
			</div>

			{/* === Split Panes === */}
			<div className="split-container" ref={splitRef}>
				<div className="pane" style={{ flex: `0 0 ${splitRatio * 100}%` }}>
					<div className="pane-header">
						<span className="pane-title">Technicians</span>
						<span className="pane-count">{filteredTechs.length}{techFilter ? ` / ${technicians.length}` : ''}</span>
					</div>
					<div className="pane-body" ref={techGridRef}>
						<TechGrid
							technicians={filteredTechs}
							onContextMenu={(e, tech) => {
								e.preventDefault();
								setContextMenu({ x: e.clientX, y: e.clientY, type: 'tech', data: tech });
							}}
							isDragTarget={!!dragState}
						/>
					</div>
				</div>

				<div className={`split-divider${isDragging ? ' split-divider--active' : ''}`} onMouseDown={handleDividerMouseDown}>
					<div className="split-divider-grip" />
				</div>

				<div className="pane" style={{ flex: 1 }}>
					<div className="pane-header">
						<span className="pane-title">Jobs</span>
						<span className="pane-count">{filteredJobs.length}{jobFilter ? ` / ${jobs.length}` : ''}</span>
					</div>
					<div className="pane-body">
						<JobGrid
							jobs={filteredJobs}
							technicians={technicians}
							onContextMenu={(e, job) => {
								e.preventDefault();
								setContextMenu({ x: e.clientX, y: e.clientY, type: 'job', data: job });
							}}
							onDragStart={(job) => setDragState({ job, mouseX: 0, mouseY: 0 })}
						/>
					</div>
				</div>
			</div>

			{/* === Drag Ghost === */}
			{dragState && dragState.mouseX > 0 && (
				<div className="drag-ghost" style={{ left: dragState.mouseX + 12, top: dragState.mouseY - 10 }}>
					Job #{dragState.job.job_number || dragState.job.id} — {dragState.job.customer_name}
				</div>
			)}

			{/* === Map === */}
			{mapOpen && <MapWindow technicians={technicians} jobs={jobs} onClose={() => setMapOpen(false)} />}

			{/* === Context Menu === */}
			{contextMenu && (
				<ContextMenu
					x={contextMenu.x} y={contextMenu.y} type={contextMenu.type} data={contextMenu.data}
					technicians={technicians} onJobAction={handleJobAction} onTechAction={handleTechAction} onAssignToTech={handleAssignToTech}
				/>
			)}

			{/* === Toasts === */}
			<div className="toast-container">
				{toasts.map((t) => <Toast key={t.id} message={t.message} type={t.type} />)}
			</div>
		</div>
	);
}

function MapIcon() {
	return (
		<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
			<path d="M1 3.5l4.5-2 5 2.5 4.5-2v11l-4.5 2-5-2.5-4.5 2z" />
			<path d="M5.5 1.5v11M10.5 4v11" />
		</svg>
	);
}

function RefreshIcon({ spinning }) {
	return (
		<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={spinning ? { animation: 'spin 0.8s linear infinite' } : undefined}>
			<path d="M2.5 8a5.5 5.5 0 019.3-4M13.5 8a5.5 5.5 0 01-9.3 4" />
			<path d="M11.5 1v3h3M4.5 15v-3h-3" />
		</svg>
	);
}

function BoltIcon() {
	return (
		<svg viewBox="0 0 16 16" fill="currentColor">
			<path d="M9.5 1L3 9h4.5L6.5 15 13 7H8.5z" />
		</svg>
	);
}
