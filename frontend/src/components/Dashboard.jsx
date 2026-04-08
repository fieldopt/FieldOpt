import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client';
import TechGrid from './TechGrid';
import JobGrid from './JobGrid';
import MapWindow from './MapWindow';
import ContextMenu from './ContextMenu';
import Toast from './Toast';
import TechTimeline from './TechTimeline';
import FilterWindow from './FilterWindow';
import PersonnelWindow from './PersonnelWindow';
import JobSearchWindow from './JobSearchWindow';
import JobDetailPanel from './JobDetailPanel';

/* ── Helpers ─────────────────────────────────────────────── */
function fmtDate(d) {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fmtDateDisplay(d) {
	const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	return `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`;
}
function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

export default function Dashboard() {
	/* ── Data ─────────────────────────────────────────────── */
	const [techs, setTechs] = useState([]);
	const [jobs, setJobs] = useState([]);
	const [summary, setSummary] = useState(null);
	const [loading, setLoading] = useState(true);

	/* ── Day ──────────────────────────────────────────────── */
	const [viewDate, setViewDate] = useState(() => new Date());
	const isToday = sameDay(viewDate, new Date());

	/* ── UI ───────────────────────────────────────────────── */
	const [splitRatio, setSplitRatio] = useState(0.4);
	const [dividerDrag, setDividerDrag] = useState(false);
	const [mapOpen, setMapOpen] = useState(false);
	const [timelineOpen, setTimelineOpen] = useState(false);
	const [autoRouting, setAutoRouting] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const splitRef = useRef(null);
	const [timelineHeight, setTimelineHeight] = useState(180);
	const [tlDrag, setTlDrag] = useState(false);

	/* ── v0.0.7 Windows ───────────────────────────────────── */
	const [filterOpen, setFilterOpen] = useState(false);
	const [personnelOpen, setPersonnelOpen] = useState(false);
	const [jobSearchOpen, setJobSearchOpen] = useState(false);
	const [detailJob, setDetailJob] = useState(null);

	/* ── v0.0.7 Display Filter state ─────────────────────── */
	const [displayFilter, setDisplayFilter] = useState(null);
	// displayFilter shape: { timeSlots: [], jobTypes: [], routeCriteria: [], techIds: [] } or null

	/* ── v0.0.7 Override Warning ──────────────────────────── */
	const [overrideWarning, setOverrideWarning] = useState(null);
	// shape: { jobIds, techId, techName, issues: [{label, pass}] }

	/* ── Autoroute confirmation ───────────────────────────── */
	const [autoRouteConfirm, setAutoRouteConfirm] = useState(false);

	/* ── Context menu ─────────────────────────────────────── */
	const [ctxMenu, setCtxMenu] = useState(null);

	/* ── Selection ────────────────────────────────────────── */
	const [selJobs, setSelJobs] = useState([]);
	const [selTechs, setSelTechs] = useState([]);

	/* ── Drag ─────────────────────────────────────────────── */
	const [dragJob, setDragJob] = useState(null);
	const [dragPos, setDragPos] = useState(null);
	const techPaneRef = useRef(null);
	const dragJobRef = useRef(null);
	useEffect(() => { dragJobRef.current = dragJob; }, [dragJob]);

	/* ── Filters (dashboard bar) ─────────────────────────── */
	const [jobFilter, setJobFilter] = useState(null);
	const [techFilter, setTechFilter] = useState(null);

	/* ── Toasts ───────────────────────────────────────────── */
	const [toasts, setToasts] = useState([]);
	const tid = useRef(0);
	const toast = useCallback((msg, type = 'info') => {
		const id = ++tid.current;
		setToasts((p) => [...p, { id, msg, type }]);
		setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3000);
	}, []);

	/* ── Data loading ─────────────────────────────────────── */
	const loadData = useCallback(async (showRefresh = false) => {
		if (showRefresh) setRefreshing(true);
		const d = fmtDate(viewDate);
		try {
			const [tr, jr, sr] = await Promise.all([
				api.getTechnicians(),
				api.getJobs({ scheduled_date: d }),
				api.getJobsSummary({ target_date: d }),
			]);
			setTechs(tr.data);
			setJobs(jr.data);
			setSummary(sr.data);
		} catch (e) {
			console.error('Load error:', e);
			toast('Failed to load data', 'error');
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, [viewDate, toast]);

	useEffect(() => { setLoading(true); loadData(); }, [viewDate]); // eslint-disable-line
	useEffect(() => { const i = setInterval(() => loadData(), 30000); return () => clearInterval(i); }, [loadData]);

	/* ── Close context menu ───────────────────────────────── */
	useEffect(() => { const c = () => setCtxMenu(null); document.addEventListener('click', c); return () => document.removeEventListener('click', c); }, []);

	/* ── Keyboard shortcuts ───────────────────────────────── */
	useEffect(() => {
		const h = (e) => {
			if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
			// Don't process shortcuts if inside a floating window
			if (e.target.closest('.fw-window') || e.target.closest('.fw-filter') || e.target.closest('.fw-personnel') || e.target.closest('.fw-job-search') || e.target.closest('.fw-job-detail')) return;
			if (e.key === 'Escape') { setCtxMenu(null); setMapOpen(false); setDetailJob(null); setFilterOpen(false); setPersonnelOpen(false); setJobSearchOpen(false); }
			if (e.key === 'r' && !e.ctrlKey && !e.metaKey) loadData(true);
			if (e.key === 'm' && !e.ctrlKey && !e.metaKey) setMapOpen((p) => !p);
			if (e.key === 't' && !e.ctrlKey && !e.metaKey) setTimelineOpen((p) => !p);
			if (e.key === 'f' && !e.ctrlKey && !e.metaKey) setFilterOpen((p) => !p);
			if (e.key === 'p' && !e.ctrlKey && !e.metaKey) setPersonnelOpen((p) => !p);
			if (e.key === 'j' && !e.ctrlKey && !e.metaKey) setJobSearchOpen((p) => !p);
			if (e.key === 'a' && !e.ctrlKey && !e.metaKey) setAutoRouteConfirm(true);
		};
		document.addEventListener('keydown', h);
		return () => document.removeEventListener('keydown', h);
	}, [loadData]);

	/* ── Day nav ──────────────────────────────────────────── */
	const goDay = useCallback((n) => setViewDate((p) => { const d = new Date(p); d.setDate(d.getDate() + n); return d; }), []);

	/* ── Drag system ─────────────────────────────────────── */
	useEffect(() => {
		if (!dragJob) return;
		const onMove = (e) => setDragPos({ x: e.clientX, y: e.clientY });
		const onUp = (e) => {
			const job = dragJobRef.current;
			const pane = techPaneRef.current;
			if (job && pane) {
				const el = document.elementFromPoint(e.clientX, e.clientY);
				const row = el?.closest('.ag-row');
				if (row && pane.contains(row)) {
					const techId = row.getAttribute('data-tech-id');
					if (techId) {
						const ids = selJobs.length > 0 && selJobs.includes(job.id) ? selJobs : [job.id];
						doAssignWithCheck(ids, Number(techId));
					}
				}
			}
			setDragJob(null);
			setDragPos(null);
			document.body.style.userSelect = '';
			document.body.style.cursor = '';
		};
		document.addEventListener('mousemove', onMove);
		document.addEventListener('mouseup', onUp);
		return () => {
			document.removeEventListener('mousemove', onMove);
			document.removeEventListener('mouseup', onUp);
			document.body.style.userSelect = '';
			document.body.style.cursor = '';
		};
	}, [dragJob]); // eslint-disable-line

	/* ── Assign with CanDo override check ────────────────── */
	const doAssignWithCheck = useCallback(async (jobIds, techId) => {
		const tech = techs.find((t) => t.id === techId);
		if (!tech) return;

		// For single job, check CanDo and warn if issues
		if (jobIds.length === 1) {
			const job = jobs.find((j) => j.id === jobIds[0]);
			if (job) {
				const issues = [];
				// Skill check
				const missingSkills = (job.required_skills || []).filter((s) => !tech.skills?.includes(s));
				issues.push({ label: `Skill${missingSkills.length > 0 ? ` (missing: ${missingSkills.join(', ')})` : ''}`, pass: missingSkills.length === 0 });
				// Route check
				const routeMatch = !job.route_criteria || (tech.assigned_routes || []).includes(job.route_criteria);
				issues.push({ label: `Route${!routeMatch ? ` (job: ${job.route_criteria}, tech: ${(tech.assigned_routes || []).join(', ') || 'none'})` : ''}`, pass: routeMatch });

				const hasIssue = issues.some((i) => !i.pass);
				if (hasIssue) {
					setOverrideWarning({ jobIds, techId, techName: tech.name, issues });
					return;
				}
			}
		}

		await doBatchAssign(jobIds, techId);
	}, [techs, jobs]); // eslint-disable-line

	/* ── Batch assign (single API call) ───────────────────── */
	const doBatchAssign = useCallback(async (jobIds, techId) => {
		const tech = techs.find((t) => t.id === techId);
		if (!tech) return;
		try {
			const res = await api.batchAssign(jobIds, techId);
			const n = res.data.assigned ?? 0;
			toast(`${n} job${n !== 1 ? 's' : ''} → ${tech.name}`, n > 0 ? 'success' : 'warning');
			await loadData(true);
		} catch (e) {
			toast('Assignment failed', 'error');
		}
	}, [techs, loadData, toast]);

	/* ── Override confirm ─────────────────────────────────── */
	const handleOverrideConfirm = useCallback(async () => {
		if (!overrideWarning) return;
		const { jobIds, techId } = overrideWarning;
		setOverrideWarning(null);
		await doBatchAssign(jobIds, techId);
	}, [overrideWarning, doBatchAssign]);

	/* ── Batch unassign ───────────────────────────────────── */
	const doBatchUnassign = useCallback(async (jobIds) => {
		try {
			const res = await api.batchUnassign(jobIds);
			const n = res.data.unassigned ?? 0;
			toast(`${n} job${n !== 1 ? 's' : ''} unassigned`, n > 0 ? 'success' : 'warning');
			setSelJobs([]);
			await loadData(true);
		} catch (e) {
			toast('Unassign failed', 'error');
		}
	}, [loadData, toast]);

	/* ── Auto-route ───────────────────────────────────────── */
	const handleAutoRoute = useCallback(async () => {
		setAutoRouting(true);
		try {
			const res = await api.autoRoute();
			const a = res.data.jobs_assigned ?? 0;
			const u = res.data.jobs_unassigned ?? 0;
			toast(`Routed ${a} job${a !== 1 ? 's' : ''}${u > 0 ? ` · ${u} unassigned` : ''}`, a > 0 ? 'success' : 'warning');
			await loadData(true);
		} catch { toast('Auto-route failed', 'error'); }
		finally { setAutoRouting(false); }
	}, [loadData, toast]);

	/* ── Job actions ───────────────────────────────────────── */
	const handleJobAction = useCallback(async (action, job) => {
		setCtxMenu(null);
		const labels = { start: 'Started', complete: 'Completed', cancel: 'Cancelled', unassign: 'Unassigned', hold: 'On hold' };
		try {
			if (action === 'start') await api.startJob(job.id);
			else if (action === 'complete') await api.completeJob(job.id);
			else if (action === 'cancel') await api.cancelJob(job.id);
			else if (action === 'unassign') await api.unassignJob(job.id);
			else if (action === 'hold') await api.updateJobStatus(job.id, 'on_hold');
			else if (action === 'batch_unassign') { await doBatchUnassign(selJobs); return; }
			else return;
			toast(`Job #${job.id} — ${labels[action]}`, 'success');
			await loadData(true);
		} catch { toast(`Failed to ${action} job #${job.id}`, 'error'); }
	}, [loadData, toast, doBatchUnassign, selJobs]);

	/* ── Tech actions ──────────────────────────────────────── */
	const handleTechAction = useCallback(async (action, tech) => {
		setCtxMenu(null);
		const map = { set_available: 'available', set_on_break: 'on_break', set_off_duty: 'off_duty' };
		const status = map[action];
		if (!status) return;

		const techIds = selTechs.length > 1 && selTechs.includes(tech.id) ? selTechs : [tech.id];
		let successCount = 0;
		for (const tid of techIds) {
			try {
				await api.updateTechStatus(tid, status);
				successCount++;
			} catch (e) {
				console.error(`Failed to update tech ${tid}:`, e);
			}
		}
		if (successCount > 0) {
			const label = status.replace(/_/g, ' ');
			toast(
				techIds.length > 1
					? `${successCount} tech${successCount !== 1 ? 's' : ''} → ${label}`
					: `${tech.name} → ${label}`,
				'success'
			);
			await loadData(true);
		} else {
			toast('Failed to update status', 'error');
		}
	}, [loadData, toast, selTechs]);

	/* ── Context menu assign (with check) ────────────────── */
	const handleAssignToTech = useCallback(async (jobId, techId) => {
		setCtxMenu(null);
		const ids = selJobs.length > 0 && selJobs.includes(jobId) ? selJobs : [jobId];
		await doAssignWithCheck(ids, techId);
	}, [selJobs, doAssignWithCheck]);

	/* ── Selection (independent per grid) ─────────────────── */
	const handleJobClick = useCallback((id, e, displayedIds) => {
		setSelJobs((prev) => {
			if (e.metaKey || e.ctrlKey) return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
			if (e.shiftKey && prev.length > 0 && displayedIds) {
				const lastSelected = prev[prev.length - 1];
				const a = displayedIds.indexOf(lastSelected);
				const b = displayedIds.indexOf(id);
				if (a === -1 || b === -1) return [id];
				const [start, end] = a < b ? [a, b] : [b, a];
				return [...new Set([...prev, ...displayedIds.slice(start, end + 1)])];
			}
			return prev.length === 1 && prev[0] === id ? [] : [id];
		});
	}, []);

	const handleTechClick = useCallback((id, e, displayedIds) => {
		setSelTechs((prev) => {
			if (e.metaKey || e.ctrlKey) return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
			if (e.shiftKey && prev.length > 0 && displayedIds) {
				const lastSelected = prev[prev.length - 1];
				const a = displayedIds.indexOf(lastSelected);
				const b = displayedIds.indexOf(id);
				if (a === -1 || b === -1) return [id];
				const [start, end] = a < b ? [a, b] : [b, a];
				return [...new Set([...prev, ...displayedIds.slice(start, end + 1)])];
			}
			return prev.length === 1 && prev[0] === id ? [] : [id];
		});
	}, []);

	/* ── Double-click job for detail ─────────────────────── */
	const handleJobDoubleClick = useCallback((job) => {
		setDetailJob(job);
	}, []);

	/* ── Personnel locate ─────────────────────────────────── */
	const handleLocateTech = useCallback((techId) => {
		setSelTechs([techId]);
		setPersonnelOpen(false);
		toast(`Located tech #${techId}`, 'info');
	}, [toast]);

	/* ── Filter toggles (dashboard bar) ───────────────────── */
	const toggleJF = useCallback((s) => { setJobFilter((p) => p === s ? null : s); setTechFilter(null); }, []);
	const toggleTF = useCallback((s) => { setTechFilter((p) => p === s ? null : s); setJobFilter(null); }, []);

	/* ── Display filter apply ─────────────────────────────── */
	const handleDisplayFilterApply = useCallback((filter) => {
		setDisplayFilter(filter);
		if (filter) toast('Filter applied', 'info');
		else toast('Filter cleared', 'info');
	}, [toast]);

	/* ── Divider ─────────────────────────────────────────── */
	useEffect(() => {
		if (!dividerDrag) return;
		const onMove = (e) => {
			if (!splitRef.current) return;
			const r = splitRef.current.getBoundingClientRect();
			setSplitRatio(Math.min(Math.max((e.clientY - r.top) / r.height, 0.1), 0.85));
		};
		const onUp = () => setDividerDrag(false);
		document.addEventListener('mousemove', onMove);
		document.addEventListener('mouseup', onUp);
		document.body.style.cursor = 'row-resize';
		document.body.style.userSelect = 'none';
		return () => {
			document.removeEventListener('mousemove', onMove);
			document.removeEventListener('mouseup', onUp);
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
		};
	}, [dividerDrag]);

	/* ── Timeline divider ─────────────────────────────────── */
	useEffect(() => {
		if (!tlDrag) return;
		const onMove = (e) => {
			if (!splitRef.current) return;
			const r = splitRef.current.getBoundingClientRect();
			const bottomY = r.bottom - e.clientY;
			setTimelineHeight(Math.min(Math.max(bottomY, 100), 500));
		};
		const onUp = () => setTlDrag(false);
		document.addEventListener('mousemove', onMove);
		document.addEventListener('mouseup', onUp);
		document.body.style.cursor = 'row-resize';
		document.body.style.userSelect = 'none';
		return () => {
			document.removeEventListener('mousemove', onMove);
			document.removeEventListener('mouseup', onUp);
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
		};
	}, [tlDrag]);

	/* ── Loading ──────────────────────────────────────────── */
	if (loading && techs.length === 0) return <div className="loading-screen"><div className="loading-spinner" />Loading FieldOpt...</div>;

	/* ── Computed: apply display filter + dashboard filter ── */
	const s = summary ?? {};
	const pending = s.pending ?? 0, assigned = s.assigned ?? 0, inProg = s.in_progress ?? 0;
	const completed = s.completed ?? 0, onHold = s.on_hold ?? 0;
	const active = techs.filter((t) => ['available', 'on_job', 'en_route'].includes(t.status)).length;
	const offDuty = techs.filter((t) => t.status === 'off_duty').length;

	// Step 1: Apply display filter (from FilterWindow)
	let filteredJobs = jobs;
	let filteredTechs = techs;
	if (displayFilter) {
		filteredJobs = jobs.filter((j) => {
			const slot = j.time_slot_start && j.time_slot_end ? `${j.time_slot_start}–${j.time_slot_end}` : null;
			if (slot && displayFilter.timeSlots.length > 0 && !displayFilter.timeSlots.includes(slot)) return false;
			if (j.job_type && displayFilter.jobTypes.length > 0 && !displayFilter.jobTypes.includes(j.job_type)) return false;
			if (j.route_criteria && displayFilter.routeCriteria.length > 0 && !displayFilter.routeCriteria.includes(j.route_criteria)) return false;
			return true;
		});
		filteredTechs = techs.filter((t) => {
			if (displayFilter.techIds.length > 0 && !displayFilter.techIds.includes(t.id)) return false;
			return true;
		});
	}

	// Step 2: Apply dashboard bar filter on top
	const fJobs = jobFilter ? filteredJobs.filter((j) => j.status === jobFilter) : filteredJobs;
	const fTechs = techFilter === 'active'
		? filteredTechs.filter((t) => ['available', 'on_job', 'en_route'].includes(t.status))
		: techFilter === 'off_duty' ? filteredTechs.filter((t) => t.status === 'off_duty') : filteredTechs;

	const timelineTechs = selTechs.length > 0 ? techs.filter((t) => selTechs.includes(t.id)) : [];

	return (
		<div className="app-shell">
			{/* ══ Header ══ */}
			<header className="header-bar">
				<div className="header-brand"><div className="header-brand-icon" />FieldOpt</div>
				<div className="header-divider" />
				<div className="day-picker">
					<button className="day-picker-btn" onClick={() => goDay(-1)}>◂</button>
					<button className={`day-picker-date${isToday ? ' day-picker-date--today' : ''}`} onClick={() => setViewDate(new Date())}>
						{isToday ? 'Today' : fmtDateDisplay(viewDate)}
					</button>
					<button className="day-picker-btn" onClick={() => goDay(1)}>▸</button>
				</div>
				<div className="header-actions">
					<button className={`btn${filterOpen ? ' btn--primary' : ''}`} onClick={() => setFilterOpen((p) => !p)}><FilterIcon />Filter</button>
					<button className={`btn${personnelOpen ? ' btn--primary' : ''}`} onClick={() => setPersonnelOpen((p) => !p)}><PersonnelIcon />Personnel</button>
					<button className={`btn${jobSearchOpen ? ' btn--primary' : ''}`} onClick={() => setJobSearchOpen((p) => !p)}><SearchIcon />Job Search</button>
					<div className="header-divider" />
					<button className={`btn${timelineOpen ? ' btn--primary' : ''}`} onClick={() => setTimelineOpen((p) => !p)}><TimelineIcon />Timeline</button>
					<button className={`btn${mapOpen ? ' btn--primary' : ''}`} onClick={() => setMapOpen((p) => !p)}><MapIcon />Map</button>
					<button className="btn" onClick={() => loadData(true)} disabled={refreshing}><RefreshIcon spinning={refreshing} />Refresh</button>
					<button className="btn btn--warning" onClick={() => setAutoRouteConfirm(true)} disabled={autoRouting || pending === 0}>
						<BoltIcon />{autoRouting ? 'Routing...' : `Auto-Route ${pending}`}
					</button>
				</div>
			</header>

			{/* ══ Dashboard Bar ══ */}
			<div className="dashboard-bar">
				<DI active={jobFilter === 'pending'} onClick={() => toggleJF('pending')} count={pending} color="danger" label="Unassigned" />
				<DI active={jobFilter === 'assigned'} onClick={() => toggleJF('assigned')} count={assigned} color="info" label="Assigned" />
				<DI active={jobFilter === 'in_progress'} onClick={() => toggleJF('in_progress')} count={inProg} color="info" label="In Progress" />
				<DI active={jobFilter === 'completed'} onClick={() => toggleJF('completed')} count={completed} color="success" label="Completed" />
				<DI active={jobFilter === 'on_hold'} onClick={() => toggleJF('on_hold')} count={onHold} color="warning" label="On Hold" />
				<div className="dash-indicator"><span className="dash-count dash-count--warning">0</span><span className="dash-label">Failed</span></div>
				<div className="header-divider" />
				<DI active={techFilter === 'active'} onClick={() => toggleTF('active')} count={active} color="success" label="Techs Active" />
				<DI active={techFilter === 'off_duty'} onClick={() => toggleTF('off_duty')} count={offDuty} color="muted" label="Off Duty" />
				<div className="dash-indicator"><span className="dash-count dash-count--muted">{techs.length}</span><span className="dash-label">Total</span></div>
				{(jobFilter || techFilter || displayFilter) && (
					<>
						<div className="header-divider" />
						<button className="dash-indicator dash-indicator--clear" onClick={() => { setJobFilter(null); setTechFilter(null); setDisplayFilter(null); }}>
							✕ Clear{displayFilter ? ' All' : ''}
						</button>
					</>
				)}
			</div>

			{/* ══ Split Panes ══ */}
			<div className="split-container" ref={splitRef}>
				{/* Tech pane */}
				<div className="pane" style={{ flex: `0 0 ${splitRatio * 100}%` }}>
					<div className="pane-header">
						<span className="pane-title">Technicians</span>
						<span className="pane-count">{fTechs.length}{(techFilter || displayFilter) ? ` / ${techs.length}` : ''}</span>
						{selTechs.length > 0 && <span className="pane-selection">{selTechs.length} selected</span>}
					</div>
					<div className="pane-body" ref={techPaneRef}>
						<TechGrid
							technicians={fTechs}
							selectedIds={selTechs}
							onRowClicked={handleTechClick}
							onContextMenu={(e, t) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, type: 'tech', data: t }); }}
							isDragTarget={!!dragJob}
						/>
					</div>
				</div>

				<div className={`split-divider${dividerDrag ? ' split-divider--active' : ''}`} onMouseDown={(e) => { e.preventDefault(); setDividerDrag(true); }}>
					<div className="split-divider-grip" />
				</div>

				{/* Job pane */}
				<div className="pane" style={{ flex: 1 }}>
					<div className="pane-header">
						<span className="pane-title">Jobs</span>
						<span className="pane-count">{fJobs.length}{(jobFilter || displayFilter) ? ` / ${jobs.length}` : ''}</span>
						{selJobs.length > 0 && <span className="pane-selection">{selJobs.length} selected</span>}
					</div>
					<div className="pane-body">
						<JobGrid
							jobs={fJobs}
							selectedIds={selJobs}
							onRowClicked={handleJobClick}
							onContextMenu={(e, j) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, type: 'job', data: j }); }}
							onDragStart={(job) => { setDragJob(job); setDragPos(null); }}
							onRowDoubleClicked={handleJobDoubleClick}
						/>
					</div>
				</div>

				{/* Timeline pane */}
				{timelineOpen && (
					<>
						<div className={`split-divider${tlDrag ? ' split-divider--active' : ''}`} onMouseDown={(e) => { e.preventDefault(); setTlDrag(true); }}>
							<div className="split-divider-grip" />
						</div>
						<div className="pane" style={{ flex: `0 0 ${timelineHeight}px`, minHeight: '100px' }}>
							<div className="pane-header">
								<span className="pane-title">Timeline</span>
								{timelineTechs.length > 0 && <span className="pane-count">{timelineTechs.map((t) => t.name).join(', ')}</span>}
							</div>
							<div className="pane-body"><TechTimeline technicians={timelineTechs} jobs={jobs} /></div>
						</div>
					</>
				)}
			</div>

			{/* ══ Drag Ghost ══ */}
			{dragJob && dragPos && (
				<div className="drag-ghost" style={{ left: dragPos.x + 12, top: dragPos.y - 10 }}>
					{selJobs.length > 1 && selJobs.includes(dragJob.id)
						? `${selJobs.length} jobs`
						: `Job #${dragJob.job_number || dragJob.id} — ${dragJob.customer_name}`}
				</div>
			)}

			{/* ══ Map ══ */}
			{mapOpen && <MapWindow technicians={techs} jobs={jobs} onClose={() => setMapOpen(false)} />}

			{/* ══ Context Menu ══ */}
			{ctxMenu && (
				<ContextMenu
					x={ctxMenu.x} y={ctxMenu.y} type={ctxMenu.type} data={ctxMenu.data}
					technicians={techs}
					selectedJobIds={selJobs}
					selectedTechIds={selTechs}
					onJobAction={handleJobAction}
					onTechAction={handleTechAction}
					onAssignToTech={handleAssignToTech}
				/>
			)}

			{/* ══ v0.0.7 Windows ══ */}
			{filterOpen && (
				<FilterWindow
					jobs={jobs}
					technicians={techs}
					activeFilter={displayFilter}
					onApply={(f) => { handleDisplayFilterApply(f); setFilterOpen(false); }}
					onClose={() => setFilterOpen(false)}
				/>
			)}

			{personnelOpen && (
				<PersonnelWindow
					technicians={techs}
					onLocateTech={handleLocateTech}
					onContextMenu={(e, t) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, type: 'tech', data: t }); }}
					onTechDetail={(tech) => setDetailJob(tech)}
					onClose={() => setPersonnelOpen(false)}
				/>
			)}

			{jobSearchOpen && (
				<JobSearchWindow
					viewDate={viewDate}
					onClose={() => setJobSearchOpen(false)}
					onJobDetail={(job) => setDetailJob(job)}
					onDragStart={(job) => { setDragJob(job); setDragPos(null); }}
					onContextMenu={(e, j) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, type: 'job', data: j }); }}
				/>
			)}

			{detailJob && (
				<JobDetailPanel
					job={detailJob}
					onClose={() => setDetailJob(null)}
				/>
			)}

			{/* ══ Autoroute Confirmation ══ */}
			{autoRouteConfirm && (
				<div className="override-overlay" onClick={() => setAutoRouteConfirm(false)}>
					<div className="override-modal" onClick={(e) => e.stopPropagation()}>
						<div className="override-title">Auto-Route Confirmation</div>
						<div className="override-body">
							Auto-route will assign <strong>{pending} pending job{pending !== 1 ? 's' : ''}</strong> to available technicians based on skill, route criteria, and distance.
						</div>
						<div className="override-actions">
							<button className="btn btn--sm" onClick={() => setAutoRouteConfirm(false)}>Cancel</button>
							<button className="btn btn--sm btn--warning" onClick={() => { setAutoRouteConfirm(false); handleAutoRoute(); }}>
								<BoltIcon />Route {pending} Jobs
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ══ Override Warning ══ */}
			{overrideWarning && (
				<div className="override-overlay" onClick={() => setOverrideWarning(null)}>
					<div className="override-modal" onClick={(e) => e.stopPropagation()}>
						<div className="override-title">Assignment Warning</div>
						<div className="override-body">
							Assigning {overrideWarning.jobIds.length === 1 ? `job #${overrideWarning.jobIds[0]}` : `${overrideWarning.jobIds.length} jobs`} to <strong>{overrideWarning.techName}</strong>:
							{overrideWarning.issues.map((issue, i) => (
								<div key={i} className="override-issue">
									<span className={issue.pass ? 'override-check' : 'override-x'}>
										{issue.pass ? '✓' : '✕'}
									</span>
									{issue.label}
								</div>
							))}
						</div>
						<div className="override-actions">
							<button className="btn btn--sm" onClick={() => setOverrideWarning(null)}>Cancel</button>
							<button className="btn btn--sm btn--warning" onClick={handleOverrideConfirm}>Assign Anyway</button>
						</div>
					</div>
				</div>
			)}

			{/* ══ Toasts ══ */}
			<div className="toast-container">
				{toasts.map((t) => <Toast key={t.id} message={t.msg} type={t.type} />)}
			</div>
		</div>
	);
}

/* ── Dashboard Indicator ─────────────────────────────────── */
function DI({ active, onClick, count, color, label }) {
	return (
		<button className={`dash-indicator${active ? ' dash-indicator--active' : ''}`} onClick={onClick}>
			<span className={`dash-count dash-count--${color}`}>{count}</span>
			<span className="dash-label">{label}</span>
		</button>
	);
}

/* ── Icons ─────────────────────────────────────────────── */
function MapIcon() { return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 3.5l4.5-2 5 2.5 4.5-2v11l-4.5 2-5-2.5-4.5 2z" /><path d="M5.5 1.5v11M10.5 4v11" /></svg>; }
function RefreshIcon({ spinning }) { return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={spinning ? { animation: 'spin 0.8s linear infinite' } : undefined}><path d="M2.5 8a5.5 5.5 0 019.3-4M13.5 8a5.5 5.5 0 01-9.3 4" /><path d="M11.5 1v3h3M4.5 15v-3h-3" /></svg>; }
function BoltIcon() { return <svg viewBox="0 0 16 16" fill="currentColor"><path d="M9.5 1L3 9h4.5L6.5 15 13 7H8.5z" /></svg>; }
function TimelineIcon() { return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 4h14M1 8h14M1 12h14" /><rect x="3" y="2.5" width="4" height="3" rx="0.5" fill="currentColor" stroke="none" /><rect x="8" y="6.5" width="5" height="3" rx="0.5" fill="currentColor" stroke="none" /><rect x="2" y="10.5" width="3" height="3" rx="0.5" fill="currentColor" stroke="none" /></svg>; }
function FilterIcon() { return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1.5 2.5h13l-5 5.5v4l-3 1.5V8z" /></svg>; }
function PersonnelIcon() { return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="5" r="2.5" /><path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" /></svg>; }
function SearchIcon() { return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6.5" cy="6.5" r="4" /><path d="M10 10l4 4" /></svg>; }
