import { useState, useRef, useEffect } from 'react';

export default function ContextMenu({
	x, y, type, data, technicians,
	onJobAction, onTechAction, onAssignToTech,
}) {
	const [submenu, setSubmenu] = useState(null);
	const menuRef = useRef(null);

	// Reposition if menu would overflow viewport
	useEffect(() => {
		if (!menuRef.current) return;
		const rect = menuRef.current.getBoundingClientRect();
		const el = menuRef.current;
		if (rect.right > window.innerWidth) {
			el.style.left = `${window.innerWidth - rect.width - 4}px`;
		}
		if (rect.bottom > window.innerHeight) {
			el.style.top = `${window.innerHeight - rect.height - 4}px`;
		}
	}, [x, y]);

	if (type === 'tech') {
		return (
			<div
				ref={menuRef}
				className="ctx-menu"
				style={{ left: x, top: y }}
				onClick={(e) => e.stopPropagation()}
			>
				<div className="ctx-menu-header">
					Tech #{data.id} — {data.name}
				</div>
				<div className="ctx-menu-sep" />
				<div className="ctx-menu-label">Set Status</div>
				<button
					className="ctx-menu-item"
					onClick={() => onTechAction('set_available', data)}
					disabled={data.status === 'available'}
				>
					<span className="ctx-dot ctx-dot--success" />
					Available
				</button>
				<button
					className="ctx-menu-item"
					onClick={() => onTechAction('set_on_break', data)}
					disabled={data.status === 'on_break'}
				>
					<span className="ctx-dot ctx-dot--warning" />
					On Break
				</button>
				<button
					className="ctx-menu-item"
					onClick={() => onTechAction('set_off_duty', data)}
					disabled={data.status === 'off_duty'}
				>
					<span className="ctx-dot ctx-dot--muted" />
					Off Duty
				</button>
			</div>
		);
	}

	if (type === 'job') {
		const isAssigned = data.status === 'assigned';
		const isInProgress = data.status === 'in_progress';
		const isPending = data.status === 'pending';
		const isCompleted = data.status === 'completed';
		const isCancelled = data.status === 'cancelled';

		return (
			<div
				ref={menuRef}
				className="ctx-menu"
				style={{ left: x, top: y }}
				onClick={(e) => e.stopPropagation()}
			>
				<div className="ctx-menu-header">
					Job #{data.id} — {data.customer_name}
				</div>
				<div className="ctx-menu-status">
					<span className={`status-badge status-badge--${data.status}`}>
						{data.status.replace(/_/g, ' ')}
					</span>
				</div>
				<div className="ctx-menu-sep" />

				{/* Assign / Reassign submenu */}
				{!isCompleted && !isCancelled && (
					<div
						className="ctx-menu-item ctx-menu-item--parent"
						onMouseEnter={() => setSubmenu('assign')}
						onMouseLeave={() => setSubmenu(null)}
					>
						{isAssigned || isInProgress ? 'Reassign To' : 'Assign To'}
						<span className="ctx-arrow">▸</span>

						{submenu === 'assign' && (
							<div className="ctx-submenu">
								{(() => {
									const requiredSkills = data.required_skills || [];
									const availableTechs = technicians.filter((t) => t.status !== 'off_duty');
									const qualified = availableTechs.filter((t) =>
										requiredSkills.every((s) => t.skills?.includes(s))
									);
									const unqualified = availableTechs.filter((t) =>
										!requiredSkills.every((s) => t.skills?.includes(s))
									);

									if (availableTechs.length === 0) {
										return <div className="ctx-menu-empty">No techs available</div>;
									}

									return (
										<>
											{qualified.length > 0 && (
												<div className="ctx-menu-label">Qualified</div>
											)}
											{qualified.map((tech) => (
												<button
													key={tech.id}
													className="ctx-menu-item"
													onClick={() => onAssignToTech(data.id, tech.id)}
												>
													<span style={{ color: 'var(--color-success)', marginRight: '4px', fontSize: '10px' }}>✓</span>
													<span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginRight: '6px' }}>
														{tech.id}
													</span>
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
													<button
														key={tech.id}
														className="ctx-menu-item"
														style={{ opacity: 0.5 }}
														onClick={() => onAssignToTech(data.id, tech.id)}
														title={`Missing: ${missing.join(', ')}`}
													>
														<span style={{ color: 'var(--color-danger)', marginRight: '4px', fontSize: '10px' }}>✕</span>
														<span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginRight: '6px' }}>
															{tech.id}
														</span>
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

				{/* Unassign */}
				{(isAssigned || isInProgress) && (
					<button className="ctx-menu-item" onClick={() => onJobAction('unassign', data)}>
						Unassign
					</button>
				)}

				<div className="ctx-menu-sep" />

				{/* Status transitions */}
				{isAssigned && (
					<button className="ctx-menu-item" onClick={() => onJobAction('start', data)}>
						Start Job
					</button>
				)}
				{isInProgress && (
					<button className="ctx-menu-item" onClick={() => onJobAction('complete', data)}>
						Complete Job
					</button>
				)}
				{!isCompleted && !isCancelled && (
					<button className="ctx-menu-item" onClick={() => onJobAction('hold', data)}>
						Place On Hold
					</button>
				)}
				{!isCompleted && !isCancelled && (
					<>
						<div className="ctx-menu-sep" />
						<button
							className="ctx-menu-item ctx-menu-item--danger"
							onClick={() => onJobAction('cancel', data)}
						>
							Cancel Job
						</button>
					</>
				)}
			</div>
		);
	}

	return null;
}
