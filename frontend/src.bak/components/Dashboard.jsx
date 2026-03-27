import { useState, useEffect } from 'react';
import { Zap, Users, Briefcase, CheckCircle, RefreshCw, MapPin } from 'lucide-react';
import Map from './Map';
import JobList from './JobList';
import { api } from '../api/client';

export default function Dashboard() {
	const [technicians, setTechnicians] = useState([]);
	const [jobs, setJobs] = useState([]);
	const [summary, setSummary] = useState(null);
	const [loading, setLoading] = useState(true);
	const [autoRouting, setAutoRouting] = useState(false);
	const [refreshing, setRefreshing] = useState(false);

	const loadData = async (showRefresh = false) => {
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
			alert('Error connecting to backend. Is it running on http://localhost:8000?');
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useEffect(() => {
		loadData();
		const interval = setInterval(() => loadData(), 30000);
		return () => clearInterval(interval);
	}, []);

	const handleAutoRoute = async () => {
		setAutoRouting(true);
		try {
			const response = await api.autoRoute();
			alert(`✅ Auto-routing complete!\n\n📊 Results:\n  • Jobs assigned: ${response.data.jobs_assigned}\n  • Jobs unassigned: ${response.data.jobs_unassigned}\n\n${response.data.jobs_unassigned > 0 ? '⚠️ Some jobs could not be assigned (check skills/availability)' : '🎉 All jobs successfully assigned!'}`);
			await loadData(true);
		} catch (error) {
			console.error('Error auto-routing:', error);
			alert('❌ Error during auto-routing. Check console for details.');
		} finally {
			setAutoRouting(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
				<div className="text-center">
					<div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
					<div className="text-xl text-gray-700">Loading FieldOpt...</div>
				</div>
			</div>
		);
	}

	const pendingJobs = jobs.filter(j => j.status === 'pending');
	const activeTechs = technicians.filter(t => t.status === 'available' || t.status === 'on_job').length;

	return (
		<div className="h-screen flex flex-col bg-gray-50">
			{/* Modern Header with Gradient */}
			<header className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white shadow-xl">
				<div className="px-6 py-4">
					<div className="flex justify-between items-center">
						<div className="flex items-center gap-4">
							<div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
								<MapPin className="w-8 h-8" />
							</div>
							<div>
								<h1 className="text-3xl font-bold tracking-tight">FieldOpt</h1>
								<p className="text-blue-100 text-sm">Intelligent Field Service Dispatch</p>
							</div>
						</div>
						
						<div className="flex items-center gap-3">
							<button
								onClick={() => loadData(true)}
								disabled={refreshing}
								className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50"
							>
								<RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
								Refresh
							</button>
							
							<button
								onClick={handleAutoRoute}
								disabled={autoRouting || pendingJobs.length === 0}
								className="bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-gray-900 font-bold py-3 px-6 rounded-lg flex items-center gap-2 shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
							>
								<Zap size={20} className={autoRouting ? 'animate-pulse' : ''} />
								{autoRouting ? 'Auto-Routing...' : `Auto-Route ${pendingJobs.length} Jobs`}
							</button>
						</div>
					</div>
				</div>
			</header>

			{/* Modern Stats Cards */}
			{summary && (
				<div className="bg-white border-b shadow-sm">
					<div className="px-6 py-5">
						<div className="grid grid-cols-4 gap-4">
							<div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
								<div className="flex items-center justify-between mb-3">
									<div className="bg-blue-600 text-white p-2.5 rounded-lg">
										<Users size={24} />
									</div>
									<div className="text-right">
										<div className="text-3xl font-bold text-blue-900">{activeTechs}</div>
										<div className="text-xs text-blue-600 font-medium">of {technicians.length}</div>
									</div>
								</div>
								<div className="text-sm font-semibold text-blue-700">Active Technicians</div>
							</div>
							
							<div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-5 rounded-xl border border-yellow-200 shadow-sm hover:shadow-md transition-shadow">
								<div className="flex items-center justify-between mb-3">
									<div className="bg-yellow-500 text-white p-2.5 rounded-lg">
										<Briefcase size={24} />
									</div>
									<div className="text-right">
										<div className="text-3xl font-bold text-yellow-900">{summary.pending}</div>
										<div className="text-xs text-yellow-600 font-medium">unassigned</div>
									</div>
								</div>
								<div className="text-sm font-semibold text-yellow-700">Pending Jobs</div>
							</div>
							
							<div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-xl border border-purple-200 shadow-sm hover:shadow-md transition-shadow">
								<div className="flex items-center justify-between mb-3">
									<div className="bg-purple-600 text-white p-2.5 rounded-lg">
										<Zap size={24} />
									</div>
									<div className="text-right">
										<div className="text-3xl font-bold text-purple-900">{summary.in_progress}</div>
										<div className="text-xs text-purple-600 font-medium">active now</div>
									</div>
								</div>
								<div className="text-sm font-semibold text-purple-700">In Progress</div>
							</div>
							
							<div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl border border-green-200 shadow-sm hover:shadow-md transition-shadow">
								<div className="flex items-center justify-between mb-3">
									<div className="bg-green-600 text-white p-2.5 rounded-lg">
										<CheckCircle size={24} />
									</div>
									<div className="text-right">
										<div className="text-3xl font-bold text-green-900">{summary.completed}</div>
										<div className="text-xs text-green-600 font-medium">today</div>
									</div>
								</div>
								<div className="text-sm font-semibold text-green-700">Completed</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Main Content Area */}
			<div className="flex-1 flex overflow-hidden">
				{/* Map Section */}
				<div className="flex-1 relative bg-gray-100">
					{technicians.length === 0 && jobs.length === 0 ? (
						<div className="absolute inset-0 flex items-center justify-center bg-gray-50">
							<div className="text-center p-8 bg-white rounded-2xl shadow-lg max-w-md">
								<MapPin className="w-16 h-16 mx-auto mb-4 text-gray-400" />
								<h3 className="text-xl font-bold text-gray-800 mb-2">No Data Yet</h3>
								<p className="text-gray-600 mb-6">
									Run the seed script to populate technicians and jobs:
								</p>
								<code className="block bg-gray-100 p-3 rounded text-sm text-left">
									python3 quick_seed.py
								</code>
							</div>
						</div>
					) : (
						<Map technicians={technicians} jobs={jobs} />
					)}
				</div>

				{/* Sidebar */}
				<div className="w-96 bg-white border-l shadow-xl overflow-hidden flex flex-col">
					<div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b">
						<h2 className="text-xl font-bold text-gray-800">
							Jobs <span className="text-gray-500">({jobs.length})</span>
						</h2>
						{jobs.length > 0 && (
							<p className="text-sm text-gray-600 mt-1">
								{pendingJobs.length} pending • {summary?.in_progress || 0} active
							</p>
						)}
					</div>
					<div className="flex-1 overflow-y-auto p-4">
						<JobList jobs={jobs} />
					</div>
				</div>
			</div>
		</div>
	);
}
