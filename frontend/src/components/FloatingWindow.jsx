import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * FloatingWindow — reusable draggable/resizable floating panel.
 * Used by FilterWindow, PersonnelWindow, JobSearchWindow, JobDetailPanel.
 *
 * Props:
 *   title        — window title text
 *   onClose      — close handler
 *   defaultPos   — { x, y } initial position
 *   defaultSize  — { w, h } initial size
 *   minSize      — { w, h } minimum dimensions
 *   children     — window body content
 *   className    — optional extra class on the wrapper
 *   zIndex       — optional z-index override
 *   resizable    — whether corner resize is enabled (default true)
 */
export default function FloatingWindow({
	title,
	onClose,
	defaultPos = { x: 120, y: 80 },
	defaultSize = { w: 500, h: 400 },
	minSize = { w: 300, h: 200 },
	children,
	className = '',
	zIndex = 1500,
	resizable = true,
}) {
	const [pos, setPos] = useState(defaultPos);
	const [size, setSize] = useState(defaultSize);
	const dragRef = useRef(false);
	const offsetRef = useRef({ x: 0, y: 0 });

	/* ── Titlebar drag ────────────────────────────────────── */
	const handleTitleMouseDown = useCallback((e) => {
		if (e.target.closest('.fw-close')) return; // don't drag on close button
		e.preventDefault();
		offsetRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
		dragRef.current = true;

		const onMove = (ev) => {
			if (!dragRef.current) return;
			setPos({
				x: Math.max(0, ev.clientX - offsetRef.current.x),
				y: Math.max(0, ev.clientY - offsetRef.current.y),
			});
		};
		const onUp = () => {
			dragRef.current = false;
			document.removeEventListener('mousemove', onMove);
			document.removeEventListener('mouseup', onUp);
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
		};
		document.addEventListener('mousemove', onMove);
		document.addEventListener('mouseup', onUp);
		document.body.style.cursor = 'move';
		document.body.style.userSelect = 'none';
	}, [pos]);

	/* ── Corner resize ────────────────────────────────────── */
	const handleResizeMouseDown = useCallback((e) => {
		e.preventDefault();
		e.stopPropagation();
		const startX = e.clientX;
		const startY = e.clientY;
		const startW = size.w;
		const startH = size.h;

		const onMove = (ev) => {
			setSize({
				w: Math.max(minSize.w, startW + (ev.clientX - startX)),
				h: Math.max(minSize.h, startH + (ev.clientY - startY)),
			});
		};
		const onUp = () => {
			document.removeEventListener('mousemove', onMove);
			document.removeEventListener('mouseup', onUp);
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
		};
		document.addEventListener('mousemove', onMove);
		document.addEventListener('mouseup', onUp);
		document.body.style.cursor = 'nwse-resize';
		document.body.style.userSelect = 'none';
	}, [size, minSize]);

	/* ── Escape to close ──────────────────────────────────── */
	useEffect(() => {
		const h = (e) => {
			if (e.key === 'Escape') onClose?.();
		};
		document.addEventListener('keydown', h);
		return () => document.removeEventListener('keydown', h);
	}, [onClose]);

	return (
		<div
			className={`fw-window ${className}`}
			style={{ left: pos.x, top: pos.y, width: size.w, height: size.h, zIndex }}
		>
			<div className="fw-titlebar" onMouseDown={handleTitleMouseDown}>
				<span className="fw-title">{title}</span>
				<button className="fw-close" onClick={onClose} title="Close">×</button>
			</div>
			<div className="fw-body">
				{children}
			</div>
			{resizable && (
				<div className="fw-resize" onMouseDown={handleResizeMouseDown} />
			)}
		</div>
	);
}
