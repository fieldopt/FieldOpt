import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client';

const SPEEDS = [10, 50, 100, 200, 500];

const BASE_HOUR = 8; // virtual day starts 08:00

function fmtClock(elapsedMinutesFloat) {
	if (elapsedMinutesFloat == null) return '--:--:--';
	const totalSec = Math.max(0, Math.floor((BASE_HOUR * 60 + elapsedMinutesFloat) * 60));
	const h = Math.floor(totalSec / 3600) % 24;
	const m = Math.floor(totalSec / 60) % 60;
	const s = totalSec % 60;
	const ampm = h < 12 ? 'AM' : 'PM';
	const h12 = h % 12 || 12;
	return `${h12}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} ${ampm}`;
}

function elapsedFromIso(isoStr) {
	if (!isoStr) return null;
	try {
		const d = new Date(isoStr);
		return (d.getUTCHours() - BASE_HOUR) * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;
	} catch { return null; }
}

export default function SimBar({ elapsedMinutes, onToast, onRunningChange }) {
	const [status, setStatus] = useState(null); // null = loading
	const [busy, setBusy] = useState(false);
	const [tick, setTick] = useState(0); // re-render trigger for animation

	// Anchor: last known authoritative elapsed + the real-time moment we received it.
	// Display interpolates forward from the anchor using current speed.
	const anchorRef = useRef(null); // { elapsed: number, receivedAt: number }

	const fetchStatus = useCallback(async () => {
		try {
			const r = await api.simStatus();
			setStatus(r.data);
			// Re-anchor from polled status when we don't have a live WS event recently.
			const fromStatus = elapsedFromIso(r.data?.virtual_time);
			if (fromStatus != null && r.data?.loop_running) {
				anchorRef.current = { elapsed: fromStatus, receivedAt: Date.now() };
			}
		} catch {
			setStatus(null);
		}
	}, []);

	useEffect(() => {
		fetchStatus();
		const i = setInterval(fetchStatus, 5000);
		return () => clearInterval(i);
	}, [fetchStatus]);

	// New WS clock_tick → re-anchor.
	useEffect(() => {
		if (elapsedMinutes != null) {
			anchorRef.current = { elapsed: elapsedMinutes, receivedAt: Date.now() };
		}
	}, [elapsedMinutes]);

	// Local animation: while running and not paused, re-render every 100ms so
	// the clock visibly rolls. Backend is source of truth; we just interpolate
	// forward from the last anchor using current speed.
	const running = !!status?.loop_running && !status?.is_paused;
	useEffect(() => {
		if (!running) return;
		const id = setInterval(() => setTick((t) => t + 1), 100);
		return () => clearInterval(id);
	}, [running]);

	// Bubble running state up so Dashboard can lock the UI during demo playback.
	useEffect(() => {
		onRunningChange?.(running);
	}, [running, onRunningChange]);

	// Compute display elapsed (in fractional minutes).
	let displayElapsed = null;
	if (anchorRef.current) {
		if (running) {
			const realSecSinceAnchor = (Date.now() - anchorRef.current.receivedAt) / 1000;
			const speed = status?.speed || 1;
			displayElapsed = anchorRef.current.elapsed + (realSecSinceAnchor * speed) / 60;
		} else {
			// Paused or stopped — freeze at last anchor.
			displayElapsed = anchorRef.current.elapsed;
		}
	}

	if (!status?.is_demo) return null;

	const paused = status.loop_running && status.is_paused;
	const stopped = !status.loop_running;

	const act = async (fn, label) => {
		if (busy) return;
		setBusy(true);
		try {
			await fn();
			await fetchStatus();
		} catch (e) {
			onToast?.(`${label} failed: ${e?.response?.data?.detail || e.message}`, 'error');
		} finally {
			setBusy(false);
		}
	};

	const handleStart = () => act(async () => {
		anchorRef.current = null; // fresh demo, drop stale anchor
		await api.simStart(status.speed || 500);
	}, 'Start');
	const handlePause = () => act(api.simPause, 'Pause');
	const handleResume = () => act(api.simResume, 'Resume');
	const handleStop = () => act(api.simStop, 'Stop');
	const handleSpeed = (e) => act(() => api.simSetSpeed(Number(e.target.value)), 'Speed');

	return (
		<div className="sim-bar">
			<span className="sim-demo-badge">DEMO</span>

			<span className={`sim-status sim-status--${running ? 'running' : paused ? 'paused' : 'stopped'}`}>
				{running ? '● LIVE' : paused ? '⏸ PAUSED' : '◼ STOPPED'}
			</span>

			<span className="sim-clock">{fmtClock(displayElapsed)}</span>

			<div className="sim-controls">
				{stopped && (
					<button className="btn btn--sm btn--success" onClick={handleStart} disabled={busy}>
						▶ Start Demo
					</button>
				)}
				{running && (
					<button className="btn btn--sm" onClick={handlePause} disabled={busy}>
						⏸ Pause
					</button>
				)}
				{paused && (
					<button className="btn btn--sm btn--success" onClick={handleResume} disabled={busy}>
						▶ Resume
					</button>
				)}
				{!stopped && (
					<button className="btn btn--sm btn--danger" onClick={handleStop} disabled={busy}>
						◼ Stop
					</button>
				)}
			</div>

			<div className="sim-speed">
				<span className="sim-speed-label">Speed</span>
				<select
					className="sim-speed-select"
					value={status.speed || 500}
					onChange={handleSpeed}
					disabled={busy || stopped}
				>
					{SPEEDS.map((s) => (
						<option key={s} value={s}>{s}×</option>
					))}
				</select>
			</div>
		</div>
	);
}
