import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';

// Fix for default marker icons in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = Icon.Default;
DefaultIcon.prototype.options.iconUrl = icon;
DefaultIcon.prototype.options.shadowUrl = iconShadow;

const techIcon = new Icon({
	iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
	shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
	iconSize: [25, 41],
	iconAnchor: [12, 41],
	popupAnchor: [1, -34],
	shadowSize: [41, 41]
});

const jobIcon = new Icon({
	iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
	shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
	iconSize: [25, 41],
	iconAnchor: [12, 41],
	popupAnchor: [1, -34],
	shadowSize: [41, 41]
});

function AutoZoom({ technicians, jobs }) {
	const map = useMap();
	
	useEffect(() => {
		if (technicians.length > 0 || jobs.length > 0) {
			const bounds = [];
			
			technicians.forEach(tech => {
				if (tech.current_latitude && tech.current_longitude) {
					bounds.push([tech.current_latitude, tech.current_longitude]);
				}
			});
			
			jobs.forEach(job => {
				if (job.latitude && job.longitude) {
					bounds.push([job.latitude, job.longitude]);
				}
			});
			
			if (bounds.length > 0) {
				map.fitBounds(bounds, { padding: [50, 50] });
			}
		}
	}, [technicians, jobs, map]);
	
	return null;
}

export default function Map({ technicians = [], jobs = [] }) {
	const center = [40.7128, -74.0060]; // NYC default
	
	return (
		<MapContainer
			center={center}
			zoom={12}
			style={{ height: '100%', width: '100%' }}
		>
			<TileLayer
				attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
				url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
			/>
			
			<AutoZoom technicians={technicians} jobs={jobs} />
			
			{/* Technician Markers */}
			{technicians.map(tech => (
				tech.current_latitude && tech.current_longitude && (
					<Marker
						key={`tech-${tech.id}`}
						position={[tech.current_latitude, tech.current_longitude]}
						icon={techIcon}
					>
						<Popup>
							<div>
								<h3 className="font-bold">{tech.name}</h3>
								<p className="text-sm">Status: {tech.status}</p>
								<p className="text-sm">Skills: {tech.skills.join(', ')}</p>
							</div>
						</Popup>
					</Marker>
				)
			))}
			
			{/* Job Markers */}
			{jobs.map(job => (
				job.latitude && job.longitude && (
					<Marker
						key={`job-${job.id}`}
						position={[job.latitude, job.longitude]}
						icon={jobIcon}
					>
						<Popup>
							<div>
								<h3 className="font-bold">{job.customer_name}</h3>
								<p className="text-sm">{job.service_address}</p>
								<p className="text-sm">Type: {job.job_type}</p>
								<p className="text-sm">Status: {job.status}</p>
								<p className="text-sm">Priority: {job.priority}</p>
							</div>
						</Popup>
					</Marker>
				)
			))}
		</MapContainer>
	);
}
