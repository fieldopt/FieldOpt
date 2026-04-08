import { useState, useRef, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
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

const CHANNEL_NAME = 'fieldopt-map-sync';

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

/**
 * MapWindow — opens as a real OS popup window via Blob URL.
 * Falls back to in-page floating window if popup is blocked.
 * Syncs tech/job data via BroadcastChannel.
 */
export default function MapWindow({ technicians = [], jobs = [], onClose, usePopup = true }) {
	const [popupFailed, setPopupFailed] = useState(false);
	const popupRef = useRef(null);
	const channelRef = useRef(null);
	const pollRef = useRef(null);
	const blobUrlRef = useRef(null);

	/* ── Popup mode — Blob URL approach ───────────────────── */
	useEffect(() => {
		if (!usePopup) { setPopupFailed(true); return; }

		// Build a self-contained HTML string with inline Leaflet init
		const html = buildMapHTML(technicians, jobs);
		const blob = new Blob([html], { type: 'text/html' });
		const url = URL.createObjectURL(blob);
		blobUrlRef.current = url;

		const popup = window.open(
			url,
			'fieldopt-map',
			'width=720,height=520,left=100,top=100,toolbar=no,menubar=no,location=no,status=no'
		);

		if (!popup || popup.closed) {
			URL.revokeObjectURL(url);
			setPopupFailed(true);
			return;
		}

		popupRef.current = popup;

		// BroadcastChannel for live data sync
		const channel = new BroadcastChannel(CHANNEL_NAME);
		channelRef.current = channel;

		// Poll to detect popup close
		pollRef.current = setInterval(() => {
			if (popup.closed) {
				clearInterval(pollRef.current);
				onClose?.();
			}
		}, 500);

		return () => {
			clearInterval(pollRef.current);
			channel.close();
			if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
			if (popup && !popup.closed) popup.close();
		};
	}, []); // eslint-disable-line

	/* ── Sync data to popup via BroadcastChannel ─────────── */
	useEffect(() => {
		if (popupFailed || !channelRef.current) return;
		channelRef.current.postMessage({
			type: 'map-update',
			technicians,
			jobs,
		});
	}, [technicians, jobs, popupFailed]);

	/* ── If popup succeeded, render nothing in main window ── */
	if (!popupFailed) return null;

	/* ── Fallback: in-page floating window ────────────────── */
	return <InPageMap technicians={technicians} jobs={jobs} onClose={onClose} />;
}


/* ── Build self-contained HTML for the popup ─────────── */
function buildMapHTML(technicians, jobs) {
	const techs = technicians
		.filter((t) => t.current_latitude && t.current_longitude)
		.map((t) => ({
			lat: t.current_latitude, lng: t.current_longitude,
			name: t.name, status: t.status,
			routes: (t.assigned_routes || []).join(', ') || '\u2014',
			skills: (t.skills || []).join(', ') || '\u2014',
		}));

	const jobsArr = jobs
		.filter((j) => j.latitude && j.longitude)
		.map((j) => ({
			lat: j.latitude, lng: j.longitude,
			name: j.customer_name, address: j.service_address,
			jobType: j.job_type, status: j.status,
			route: j.route_criteria || '\u2014', priority: j.priority,
		}));

	return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>FieldOpt \u2014 Map</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#1a1d23;font-family:"Segoe UI",sans-serif}
#header{height:30px;background:#22262e;border-bottom:1px solid #3a3f4a;display:flex;align-items:center;padding:0 12px;font-size:12px;font-weight:600;color:#9a9da4}
#map{height:calc(100vh - 30px);width:100%}
.leaflet-container{background:#1a1d23}
</style>
</head>
<body>
<div id="header">FieldOpt Map \u2014 <span id="counts"></span></div>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var INIT_TECHS = ${JSON.stringify(techs)};
var INIT_JOBS = ${JSON.stringify(jobsArr)};

var map = L.map('map').setView([40.7128, -74.006], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	attribution: 'OpenStreetMap'
}).addTo(map);

var techIcon = L.icon({
	iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
	shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
	iconSize: [20, 33], iconAnchor: [10, 33], popupAnchor: [1, -28], shadowSize: [33, 33]
});
var jobIcon = L.icon({
	iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
	shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
	iconSize: [20, 33], iconAnchor: [10, 33], popupAnchor: [1, -28], shadowSize: [33, 33]
});

var markerLayer = L.layerGroup().addTo(map);

function render(techs, jobs) {
	markerLayer.clearLayers();
	var b = [];
	techs.forEach(function(t) {
		var m = L.marker([t.lat, t.lng], {icon: techIcon}).addTo(markerLayer);
		m.bindPopup('<b>' + t.name + '</b><br>Status: ' + t.status + '<br>Routes: ' + t.routes + '<br>Skills: ' + t.skills);
		b.push([t.lat, t.lng]);
	});
	jobs.forEach(function(j) {
		var m = L.marker([j.lat, j.lng], {icon: jobIcon}).addTo(markerLayer);
		m.bindPopup('<b>' + j.name + '</b><br>' + j.address + '<br>' + j.jobType + ' \\u2014 ' + j.status + '<br>Route: ' + j.route + ' \\u00b7 Pri: ' + j.priority);
		b.push([j.lat, j.lng]);
	});
	if (b.length > 0) map.fitBounds(b, {padding: [30, 30]});
	document.getElementById('counts').textContent = techs.length + ' techs \\u00b7 ' + jobs.length + ' jobs';
}

render(INIT_TECHS, INIT_JOBS);

try {
	var ch = new BroadcastChannel('${CHANNEL_NAME}');
	ch.onmessage = function(e) {
		if (e.data && e.data.type === 'map-update') {
			var t2 = (e.data.technicians || []).filter(function(t){return t.current_latitude && t.current_longitude}).map(function(t){
				return {lat:t.current_latitude,lng:t.current_longitude,name:t.name,status:t.status,routes:(t.assigned_routes||[]).join(', ')||'\\u2014',skills:(t.skills||[]).join(', ')||'\\u2014'};
			});
			var j2 = (e.data.jobs || []).filter(function(j){return j.latitude && j.longitude}).map(function(j){
				return {lat:j.latitude,lng:j.longitude,name:j.customer_name,address:j.service_address,jobType:j.job_type,status:j.status,route:j.route_criteria||'\\u2014',priority:j.priority};
			});
			render(t2, j2);
		}
	};
} catch(e) { console.warn('BroadcastChannel not available:', e); }
</script>
</body>
</html>`;
}


/* ── Fallback in-page floating map ────────────────────── */
function InPageMap({ technicians, jobs, onClose }) {
	const [pos, setPos] = useState({ x: 80, y: 80 });
	const [size, setSize] = useState({ w: 620, h: 460 });
	const dragRef = useRef(null);
	const offsetRef = useRef({ x: 0, y: 0 });
	const mapContainerRef = useRef(null);

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
			if (mapContainerRef.current) {
				setTimeout(() => mapContainerRef.current?.invalidateSize?.(), 50);
			}
		};
		document.addEventListener('mousemove', onMove);
		document.addEventListener('mouseup', onUp);
		document.body.style.cursor = 'nwse-resize';
		document.body.style.userSelect = 'none';
	}, [size]);

	const center = [40.7128, -74.006];

	return (
		<div className="map-window" style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}>
			<div className="map-window-titlebar" onMouseDown={handleTitleMouseDown}>
				<span className="map-window-title">
					Map — {technicians.length} techs · {jobs.length} jobs
				</span>
				<button className="map-window-close" onClick={onClose} title="Close map (Esc)">×</button>
			</div>
			<div className="map-window-body">
				<MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }} ref={mapContainerRef}>
					<TileLayer
						attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
						url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
					/>
					<AutoZoom technicians={technicians} jobs={jobs} />
					{technicians.map((tech) =>
						tech.current_latitude && tech.current_longitude ? (
							<Marker key={`t-${tech.id}`} position={[tech.current_latitude, tech.current_longitude]} icon={techIcon}>
								<Popup>
									<strong>{tech.name}</strong><br />
									Status: {tech.status}<br />
									Routes: {tech.assigned_routes?.join(', ') || '—'}<br />
									Skills: {tech.skills?.join(', ') || '—'}
								</Popup>
							</Marker>
						) : null
					)}
					{jobs.map((job) =>
						job.latitude && job.longitude ? (
							<Marker key={`j-${job.id}`} position={[job.latitude, job.longitude]} icon={jobIcon}>
								<Popup>
									<strong>{job.customer_name}</strong><br />
									{job.service_address}<br />
									{job.job_type} — {job.status}<br />
									Route: {job.route_criteria || '—'} · Pri: {job.priority}
								</Popup>
							</Marker>
						) : null
					)}
				</MapContainer>
			</div>
			<div className="map-window-resize" onMouseDown={handleResizeMouseDown} />
		</div>
	);
}
