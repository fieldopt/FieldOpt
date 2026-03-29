import { useState, useRef, useEffect } from 'react';

export default function ContextMenu({
	x, y, type, data, technicians,
	selectedJobIds = [],
	selectedTechIds = [],
	onJobAction, onTechAction, onAssignToTech,
}) {
	const [submenu, setSubmenu] = useState(null);
	const menuRef = useRef(null);

	// Reposition if menu would overflow viewport
	useEffect(() => {
		if (!menuRef.current) return;
		const rect = menuRef.current.getBoundingClientRect();
		const el = menuRef.current;
		if (rect.right > window.innerWidth) el.style.left = `${window.innerWidth - rect.width - 4}px`;
		if (rect.bottom > window.innerHeight) el.style.top = `${window.innerHeight - rect.height - 4}px`;
	}, [x, y]);

	/* ── Tech context menu ────────────────────────────────── */
	if (type === 'tech') {
		const hasMulti = selectedTechIds.length > 1 && selectedTechIds.includes(data.id);
		return (
			<div ref={menuRef} className="ctx-menu" style={{ left: x, top: y }} onClick={(e) => e.stopPropagation()}>
				{hasMulti ? (
					<div className="ctx-menu-header">{selectedTechIds.length} techs selected</div>
				) : (
					<div className="ctx-menu-header">Tech #{data.id} — {data.name}</div>
				)}
				<div className="ctx-menu-sep" />
				<div className="ctx-menu-label">{hasMulti ? 'Set All Status' : 'Set Status'}</div>
				<button className="ctx-menu-item" onClick={() => onTechAction('set_available', data)}>
					<span className="ctx-dot ctx-dot--success" />Available
				</button>
				<button className="ctx-menu-item" onClick={() => onTechAction('set_on_break', data)}>
					<span className="ctx-dot ctx-dot--warning" />On Break
				</button>
				<button className="ctx-menu-item" onClick={() => onTechAction('set_off_duty', data)}>
					<span className="ctx-dot ctx-dot--muted" />Off Duty
				</button>
			</div>
		);
	}

	/* ── Job context menu ─────────────────────────────────── */
	if (type === 'job') {
		const isAssigned = data.status === 'assigned';
		const isInProgress = data.status === 'in_progress';
		const isCompleted = data.status === 'completed';
		const isCancelled = data.status === 'cancelled';
		const hasMultiSelect = selectedJobIds.length > 1 && selectedJobIds.includes(data.id);
		const multiAssignedIds = hasMultiSelect ? selectedJobIds : [];

		return (
			<div ref={menuRef} className="ctx-menu" style={{ left: x, top: y }} onClick={(e) => e.stopPropagation()}>
				{/* Header */}
				{hasMultiSelect ? (
					<div className="ctx-menu-header">{selectedJobIds.length} jobs selected</div>
				) : (
					<>
						<div className="ctx-menu-header">Job #{data.id} — {data.customer_name}</div>
						<div className="ctx-menu-status">
							<span className={`status-badge status-badge--${data.status}`}>
								{data.status.replace(/_/g, ' ')}
							</span>
						</div>
					</>
				)}
				<div className="ctx-menu-sep" />

				{/* Assign / Reassign submenu */}
				{!isCompleted && !isCancelled && (
					<div
						className="ctx-menu-item ctx-menu-item--parent"
						onMouseEnter={() => setSubmenu('assign')}
						onMouseLeave={() => setSubmenu(null)}
					>
						{hasMultiSelect
							? `Assign ${selectedJobIds.length} Jobs To`
							: (isAssigned || isInProgress ? 'Reassign To' : 'Assign To')
						}
						<span className="ctx-arrow">▸</span>

						{submenu === 'assign' && (
							<div className="ctx-submenu">
								{(() => {
									const requiredSkills = hasMultiSelect ? [] : (data.required_skills || []);
									const available = technicians.filter((t) => t.status !== 'off_duty');

									// Only filter by skills for single job assignment
									const qualified = requiredSkills.length > 0
										? available.filter((t) => requiredSkills.every((s) => t.skills?.includes(s)))
										: available;
									const unqualified = requiredSkills.length > 0
										? available.filter((t) => !requiredSkills.every((s) => t.skills?.includes(s)))
										: [];

									if (available.length === 0) return <div className="ctx-menu-empty">No techs available</div>;

									return (
										<>
											{qualified.length > 0 && requiredSkills.length > 0 && (
												<div className="ctx-menu-label">Qualified</div>
											)}
											{qualified.map((tech) => (
												<button key={tech.id} className="ctx-menu-item" onClick={() => onAssignToTech(data.id, tech.id)}>
													{requiredSkills.length > 0 && <span style={{ color: 'var(--color-success)', marginRight: '4px', fontSize: '10px' }}>✓</span>}
													<span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginRight: '6px' }}>{tech.id}</span>
													{tech.name}
													<span className={`ctx-dot ctx-dot--${tech.status === 'available' ? 'success' : tech.status === 'on_job' ? 'purple' : 'warning'}`} style={{ marginLeft: 'auto' }} />
												</button>
											))}
											{unqualified.length > 0 && (
												<>
													<div className="ctx-menu-sep" />
													<div className="ctx-menu-label">Missing Skills</div>
												</>
											)}
											{unqualified.map((tech) => {
												const missing = requiredSkills.filter((s) => !tech.skills?.includes(s));
												return (
													<button key={tech.id} className="ctx-menu-item" style={{ opacity: 0.5 }}
														onClick={() => onAssignToTech(data.id, tech.id)}
														title={`Missing: ${missing.join(', ')}`}
													>
														<span style={{ color: 'var(--color-danger)', marginRight: '4px', fontSize: '10px' }}>✕</span>
														<span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginRight: '6px' }}>{tech.id}</span>
														{tech.name}
													</button>
												);
											})}
										</>
									);
								})()}
							</div>
						)}
					</div>
				)}

				{/* Unassign — single or batch */}
				{hasMultiSelect ? (
					<button className="ctx-menu-item" onClick={() => onJobAction('batch_unassign', data)}>
						Unassign {selectedJobIds.length} Jobs
					</button>
				) : (
					(isAssigned || isInProgress) && (
						<button className="ctx-menu-item" onClick={() => onJobAction('unassign', data)}>
							Unassign
						</button>
					)
				)}

				{/* Single-job actions only when not multi-selected */}
				{!hasMultiSelect && (
					<>
						<div className="ctx-menu-sep" />
						{isAssigned && (
							<button className="ctx-menu-item" onClick={() => onJobAction('start', data)}>Start Job</button>
						)}
						{isInProgress && (
							<button className="ctx-menu-item" onClick={() => onJobAction('complete', data)}>Complete Job</button>
						)}
						{!isCompleted && !isCancelled && (
							<button className="ctx-menu-item" onClick={() => onJobAction('hold', data)}>Place On Hold</button>
						)}
						{!isCompleted && !isCancelled && (
							<>
								<div className="ctx-menu-sep" />
								<button className="ctx-menu-item ctx-menu-item--danger" onClick={() => onJobAction('cancel', data)}>
									Cancel Job
								</button>
							</>
						)}
					</>
				)}
			</div>
		);
	}

	return null;
}
