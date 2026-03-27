import { useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';

/* Fix default marker icons */
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
Icon.Default.prototype.options.iconUrl = iconUrl;
Icon.Default.prototype.options.shadowUrl = shadowUrl;

const techIcon = new Icon({
	iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
	shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
	iconSize: [20, 33],
	iconAnchor: [10, 33],
	popupAnchor: [1, -28],
	shadowSize: [33, 33],
});

const jobIcon = new Icon({
	iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
	shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
	iconSize: [20, 33],
	iconAnchor: [10, 33],
	popupAnchor: [1, -28],
	shadowSize: [33, 33],
});

function AutoZoom({ technicians, jobs }) {
	const map = useMap();
	useEffect(() => {
		const bounds = [];
		technicians.forEach((t) => {
			if (t.current_latitude && t.current_longitude) bounds.push([t.current_latitude, t.current_longitude]);
		});
		jobs.forEach((j) => {
			if (j.latitude && j.longitude) bounds.push([j.latitude, j.longitude]);
		});
		if (bounds.length > 0) map.fitBounds(bounds, { padding: [30, 30] });
	}, [technicians, jobs, map]);
	return null;
}

export default function MapWindow({ technicians = [], jobs = [], onClose }) {
	const [pos, setPos] = useState({ x: 80, y: 80 });
	const [size, setSize] = useState({ w: 620, h: 460 });
	const dragRef = useRef(null);
	const offsetRef = useRef({ x: 0, y: 0 });
	const mapContainerRef = useRef(null);

	// --- Titlebar drag ---
	const handleTitleMouseDown = useCallback((e) => {
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

	// --- Corner resize ---
	const handleResizeMouseDown = useCallback((e) => {
		e.preventDefault();
		e.stopPropagation();
		const startX = e.clientX;
		const startY = e.clientY;
		const startW = size.w;
		const startH = size.h;

		const onMove = (ev) => {
			setSize({
				w: Math.max(320, startW + (ev.clientX - startX)),
				h: Math.max(240, startH + (ev.clientY - startY)),
			});
		};
		const onUp = () => {
			document.removeEventListener('mousemove', onMove);
			document.removeEventListener('mouseup', onUp);
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
			// Invalidate leaflet size after resize
			if (mapContainerRef.current) {
				setTimeout(() => {
					mapContainerRef.current?.invalidateSize?.();
				}, 50);
			}
		};
		document.addEventListener('mousemove', onMove);
		document.addEventListener('mouseup', onUp);
		document.body.style.cursor = 'nwse-resize';
		document.body.style.userSelect = 'none';
	}, [size]);

	const center = [40.7128, -74.006];

	return (
		<div
			className="map-window"
			style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
		>
			<div className="map-window-titlebar" onMouseDown={handleTitleMouseDown}>
				<span className="map-window-title">
					Map — {technicians.length} techs · {jobs.length} jobs
				</span>
				<button className="map-window-close" onClick={onClose} title="Close map (Esc)">
					×
				</button>
			</div>

			<div className="map-window-body">
				<MapContainer
					center={center}
					zoom={12}
					style={{ height: '100%', width: '100%' }}
					ref={mapContainerRef}
				>
					<TileLayer
						attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
						url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
					/>
					<AutoZoom technicians={technicians} jobs={jobs} />

					{technicians.map((tech) =>
						tech.current_latitude && tech.current_longitude ? (
							<Marker
								key={`t-${tech.id}`}
								position={[tech.current_latitude, tech.current_longitude]}
								icon={techIcon}
							>
								<Popup>
									<strong>{tech.name}</strong><br />
									Status: {tech.status}<br />
									Skills: {tech.skills?.join(', ') || '—'}
								</Popup>
							</Marker>
						) : null
					)}

					{jobs.map((job) =>
						job.latitude && job.longitude ? (
							<Marker
								key={`j-${job.id}`}
								position={[job.latitude, job.longitude]}
								icon={jobIcon}
							>
								<Popup>
									<strong>{job.customer_name}</strong><br />
									{job.service_address}<br />
									{job.job_type} — {job.status}<br />
									Priority: {job.priority}
								</Popup>
							</Marker>
						) : null
					)}
				</MapContainer>
			</div>

			{/* Resize handle */}
			<div className="map-window-resize" onMouseDown={handleResizeMouseDown} />
		</div>
	);
}
