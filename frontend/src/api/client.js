import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

const apiClient = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		'Content-Type': 'application/json',
	},
});

export const api = {
	// Technicians
	getTechnicians: () => apiClient.get('/technicians/'),
	getTechnician: (id) => apiClient.get(`/technicians/${id}`),
	createTechnician: (data) => apiClient.post('/technicians/', data),
	updateTechLocation: (id, data) => apiClient.patch(`/technicians/${id}/location`, data),
	updateTechStatus: (id, status) => apiClient.patch(`/technicians/${id}/status`, { status }),
	getTechWorkload: (id) => apiClient.get(`/technicians/${id}/workload`),

	// Jobs
	getJobs: (params = {}) => apiClient.get('/jobs/', { params }),
	getJob: (id) => apiClient.get(`/jobs/${id}`),
	createJob: (data) => apiClient.post('/jobs/', data),
	updateJobStatus: (id, status) => apiClient.patch(`/jobs/${id}/status`, { status }),
	getJobsSummary: (params = {}) => apiClient.get('/jobs/summary', { params }),
	getPendingJobs: (params = {}) => apiClient.get('/jobs/pending', { params }),
	startJob: (id) => apiClient.post(`/jobs/${id}/start`),
	completeJob: (id) => apiClient.post(`/jobs/${id}/complete`),
	cancelJob: (id, reason) => apiClient.post(`/jobs/${id}/cancel`, null, { params: { reason } }),

	// Assignments
	createAssignment: (data) => apiClient.post('/assignments/', data),
	getJobAssignment: (jobId) => apiClient.get(`/assignments/job/${jobId}`),
	getTechAssignments: (techId) => apiClient.get(`/assignments/technician/${techId}`),
	unassignJob: (jobId) => apiClient.post('/assignments/unassign', { job_id: jobId }),
	reassignJob: (jobId, newTechId) => apiClient.post('/assignments/reassign', {
		job_id: jobId,
		new_technician_id: newTechId,
	}),
	batchAssign: (jobIds, techId) => apiClient.post('/assignments/batch-assign', {
		job_ids: jobIds,
		technician_id: techId,
	}),
	batchUnassign: (jobIds) => apiClient.post('/assignments/batch-unassign', {
		job_ids: jobIds,
	}),

	// Routing
	autoRoute: (data = {}) => apiClient.post('/routing/auto-route', data),
	getBestTech: (jobId) => apiClient.get(`/routing/best-tech/${jobId}`),
	canDo: (jobId, techId) => apiClient.get(`/jobs/${jobId}/can-do/${techId}`),
};

export default api;
