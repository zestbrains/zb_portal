import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { api } from '../../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { FolderKanban, Clock, CheckCircle, AlertCircle, Eye, Users, UsersRound } from 'lucide-react';

export default function EmployeeProjects({ user, onLogout }) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [pmProjects, setPmProjects] = useState([]);
  const [teamProjects, setTeamProjects] = useState([]);
  const [workEntries, setWorkEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPM, setIsPM] = useState(false);
  const [isTeamLeader, setIsTeamLeader] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    checkIfPM();
    checkIfTeamLeader();
    fetchProjects();
    fetchWorkEntries();
  }, []);

  const checkIfPM = async () => {
    try {
      const response = await api.get('/employee/is-pm');
      setIsPM(response.data.is_pm);
      if (response.data.is_pm) {
        fetchPMProjects();
      }
    } catch (error) {
      console.error('Error checking PM status');
    }
  };

  const checkIfTeamLeader = async () => {
    try {
      const response = await api.get('/employee/is-team-leader');
      setIsTeamLeader(response.data.is_team_leader);
      setTeamMembers(response.data.team_members || []);
      if (response.data.is_team_leader) {
        fetchTeamProjects();
      }
    } catch (error) {
      console.error('Error checking team leader status');
    }
  };

  const fetchPMProjects = async () => {
    try {
      const response = await api.get('/projects/pm-view');
      setPmProjects(response.data);
    } catch (error) {
      console.error('Error fetching PM projects');
    }
  };

  const fetchTeamProjects = async () => {
    try {
      const response = await api.get('/projects/team-view');
      setTeamProjects(response.data);
    } catch (error) {
      console.error('Error fetching team projects');
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkEntries = async () => {
    try {
      const response = await api.get('/work-entries');
      setWorkEntries(response.data);
    } catch (error) {
      console.error('Error fetching work entries');
    }
  };

  // Calculate hours spent per project using project_code
  const getProjectHours = (projectCode) => {
    return workEntries
      .filter(e => e.project_code === projectCode)
      .reduce((sum, e) => sum + (e.hours || 0), 0);
  };

  const getStatusBadge = (status) => {
    switch(status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'late': return 'bg-red-500 text-white';
      case 'active':
      case 'ongoing': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch(status?.toLowerCase()) {
      case 'completed': return <CheckCircle size={16} className="text-green-600" />;
      case 'late': return <AlertCircle size={16} className="text-white" />;
      default: return <Clock size={16} className="text-blue-600" />;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Handle View button - redirect to Working Hours filtered by project
  const handleViewProject = (project) => {
    navigate(`/employee/work-entry?project=${project.project_code}`);
  };

  // Handle View Details for PM - show all developers' hours
  const handleViewDetails = (project) => {
    setSelectedProject(project);
    setViewDialogOpen(true);
  };

  // Stats for regular employees
  const totalProjects = projects.length;
  const completedProjects = projects.filter(p => p.status?.toLowerCase() === 'completed').length;
  const ongoingProjects = projects.filter(p => ['active', 'ongoing'].includes(p.status?.toLowerCase())).length;
  const totalHoursSpent = workEntries.reduce((sum, e) => sum + (e.hours || 0), 0);

  // Stats for PM view
  const pmTotalProjects = pmProjects.length;
  const pmCompletedProjects = pmProjects.filter(p => p.status?.toLowerCase() === 'completed').length;
  const pmOngoingProjects = pmProjects.filter(p => ['active', 'ongoing'].includes(p.status?.toLowerCase())).length;
  const pmTotalHours = pmProjects.reduce((sum, p) => sum + (p.total_hours || 0), 0);

  // Stats for Team Leader view
  const tlTotalProjects = teamProjects.length;
  const tlCompletedProjects = teamProjects.filter(p => p.status?.toLowerCase() === 'completed').length;
  const tlOngoingProjects = teamProjects.filter(p => ['active', 'ongoing'].includes(p.status?.toLowerCase())).length;
  const tlTotalHours = teamProjects.reduce((sum, p) => sum + (p.total_hours || 0), 0);

  // Team Leader View - Table similar to PM/Admin
  if (isTeamLeader) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="p-4 sm:p-6 lg:p-8" data-testid="team-leader-projects-page">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-1">Team Projects</h1>
            <p className="text-sm sm:text-base text-gray-600">
              View your team's projects and work hours 
              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                {teamMembers.length} team member{teamMembers.length !== 1 ? 's' : ''}
              </span>
            </p>
          </div>

          {/* Team Members Banner */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <UsersRound size={18} className="text-blue-600" />
              <span className="font-medium text-blue-800">Your Team Members:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {teamMembers.map(member => (
                <span key={member.employee_id} className="px-2 py-1 bg-white border border-blue-200 rounded text-sm">
                  {member.name}
                </span>
              ))}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <FolderKanban size={20} className="sm:w-6 sm:h-6" />
                  <div>
                    <p className="text-xs sm:text-sm opacity-80">Team Projects</p>
                    <p className="text-xl sm:text-2xl font-bold">{tlTotalProjects}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Clock size={20} className="sm:w-6 sm:h-6" />
                  <div>
                    <p className="text-xs sm:text-sm opacity-80">Ongoing</p>
                    <p className="text-xl sm:text-2xl font-bold">{tlOngoingProjects}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <CheckCircle size={20} className="sm:w-6 sm:h-6" />
                  <div>
                    <p className="text-xs sm:text-sm opacity-80">Completed</p>
                    <p className="text-xl sm:text-2xl font-bold">{tlCompletedProjects}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Clock size={20} className="sm:w-6 sm:h-6" />
                  <div>
                    <p className="text-xs sm:text-sm opacity-80">Total Hours</p>
                    <p className="text-xl sm:text-2xl font-bold">{tlTotalHours.toFixed(1)}h</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Team Projects Table */}
          <Card className="shadow-lg">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <FolderKanban size={20} />
                Team Projects & Work Hours
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading projects...</div>
              ) : teamProjects.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <FolderKanban size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No team projects found</p>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Project Code</th>
                        <th>Project Name</th>
                        <th>Status</th>
                        <th>Total Hours</th>
                        <th>Team Members</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamProjects.map((project) => (
                        <tr key={project.id}>
                          <td className="font-mono text-sm">{project.project_code}</td>
                          <td className="font-medium">{project.name}</td>
                          <td>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              project.is_late ? 'bg-red-500 text-white' : getStatusBadge(project.status)
                            }`}>
                              {project.is_late ? 'Late' : project.status}
                            </span>
                          </td>
                          <td className="font-semibold text-blue-600">{project.total_hours?.toFixed(1) || 0}h</td>
                          <td>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                              {project.team_member_count || 0} members
                            </span>
                          </td>
                          <td>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetails(project)}
                              data-testid={`view-team-project-${project.id}`}
                            >
                              <Eye size={14} className="mr-1" />
                              View Hours
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* View Details Dialog - Team Leader */}
          <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
            <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Users size={20} />
                  {selectedProject?.name} - Team Work Hours
                </DialogTitle>
              </DialogHeader>
              {selectedProject && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">Project Code</p>
                      <p className="font-mono font-medium">{selectedProject.project_code}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">Total Hours</p>
                      <p className="font-bold text-blue-600">{selectedProject.total_hours?.toFixed(1) || 0}h</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Users size={16} />
                      Developer Breakdown ({selectedProject.developer_count || 0} developers)
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {selectedProject.developers?.length > 0 ? (
                        selectedProject.developers.map((dev, idx) => (
                          <div 
                            key={dev.employee_id || idx} 
                            className={`flex justify-between items-center p-3 rounded-lg border ${
                              dev.is_team_member ? 'bg-blue-50 border-blue-200' : 
                              dev.is_self ? 'bg-green-50 border-green-200' : 'bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{dev.name}</span>
                              {dev.is_self && (
                                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">You</span>
                              )}
                              {dev.is_team_member && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Team</span>
                              )}
                            </div>
                            <span className="font-semibold text-blue-600">{dev.hours?.toFixed(1) || 0}h</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-gray-500 py-4">No work entries recorded</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </Layout>
    );
  }

  // PM View - Table similar to Admin
  if (isPM) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="p-4 sm:p-6 lg:p-8" data-testid="pm-projects-page">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-1">Project Management</h1>
            <p className="text-sm sm:text-base text-gray-600">View assigned projects and team work hours</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <FolderKanban size={20} className="sm:w-6 sm:h-6" />
                  <div>
                    <p className="text-xs sm:text-sm opacity-80">Assigned Projects</p>
                    <p className="text-xl sm:text-2xl font-bold">{pmTotalProjects}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Clock size={20} className="sm:w-6 sm:h-6" />
                  <div>
                    <p className="text-xs sm:text-sm opacity-80">Ongoing</p>
                    <p className="text-xl sm:text-2xl font-bold">{pmOngoingProjects}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <CheckCircle size={20} className="sm:w-6 sm:h-6" />
                  <div>
                    <p className="text-xs sm:text-sm opacity-80">Completed</p>
                    <p className="text-xl sm:text-2xl font-bold">{pmCompletedProjects}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Clock size={20} className="sm:w-6 sm:h-6" />
                  <div>
                    <p className="text-xs sm:text-sm opacity-80">Total Hours</p>
                    <p className="text-xl sm:text-2xl font-bold">{pmTotalHours.toFixed(1)}h</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* PM Projects Table */}
          <Card className="shadow-lg">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <FolderKanban size={20} />
                My Assigned Projects
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading projects...</div>
              ) : pmProjects.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <FolderKanban size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No projects assigned to you</p>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Project Code</th>
                        <th>Project Name</th>
                        <th>Client</th>
                        <th>Status</th>
                        <th>Start Date</th>
                        <th>Total Hours</th>
                        <th>Developers</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pmProjects.map((project) => (
                        <tr key={project.id}>
                          <td data-label="Project Code" className="font-semibold text-indigo-600">{project.project_code}</td>
                          <td data-label="Project Name">{project.name}</td>
                          <td data-label="Client">{project.client_username || project.client || '-'}</td>
                          <td data-label="Status">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(project.status)}`}>
                              {getStatusIcon(project.status)}
                              {project.status?.toUpperCase() || 'N/A'}
                            </span>
                          </td>
                          <td data-label="Start Date">{formatDate(project.start_date)}</td>
                          <td data-label="Total Hours">
                            <span className="font-semibold text-blue-600">{(project.total_hours || 0).toFixed(1)}h</span>
                          </td>
                          <td data-label="Developers">
                            <span className="inline-flex items-center gap-1 text-gray-600">
                              <Users size={14} />
                              {project.developer_count || 0}
                            </span>
                          </td>
                          <td data-label="Actions">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetails(project)}
                              data-testid={`view-details-${project.project_code}`}
                            >
                              <Eye size={14} className="mr-1" />
                              View Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Project Details Dialog */}
          <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FolderKanban size={20} />
                  {selectedProject?.name}
                </DialogTitle>
              </DialogHeader>
              {selectedProject && (
                <div className="space-y-4">
                  {/* Project Info */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-500">Project Code</p>
                      <p className="font-semibold text-indigo-600">{selectedProject.project_code}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Client</p>
                      <p className="font-semibold">{selectedProject.client_username || selectedProject.client || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(selectedProject.status)}`}>
                        {selectedProject.status?.toUpperCase() || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total Hours</p>
                      <p className="font-semibold text-blue-600">{(selectedProject.total_hours || 0).toFixed(1)}h</p>
                    </div>
                  </div>

                  {/* Developer Hours Breakdown */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Users size={16} />
                      Developer Hours Breakdown
                    </h4>
                    {selectedProject.developers && selectedProject.developers.length > 0 ? (
                      <div className="max-h-80 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100 sticky top-0">
                            <tr>
                              <th className="text-left p-2">#</th>
                              <th className="text-left p-2">Developer Name</th>
                              <th className="text-right p-2">Hours Spent</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedProject.developers.map((dev, idx) => (
                              <tr key={idx} className="border-b">
                                <td className="p-2 text-gray-500">{idx + 1}</td>
                                <td className="p-2">{dev.name}</td>
                                <td className="p-2 text-right font-semibold text-blue-600">{dev.hours.toFixed(1)}h</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-50 font-semibold">
                            <tr>
                              <td className="p-2" colSpan={2}>Total</td>
                              <td className="p-2 text-right text-blue-600">{(selectedProject.total_hours || 0).toFixed(1)}h</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No work hours logged yet</p>
                    )}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </Layout>
    );
  }

  // Regular Employee View
  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-4 sm:p-6 lg:p-8" data-testid="employee-projects-page">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-1">My Projects</h1>
          <p className="text-sm sm:text-base text-gray-600">View your assigned projects and hours spent</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <FolderKanban size={20} className="sm:w-6 sm:h-6" />
                <div>
                  <p className="text-xs sm:text-sm opacity-80">Assigned Projects</p>
                  <p className="text-xl sm:text-2xl font-bold">{totalProjects}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <Clock size={20} className="sm:w-6 sm:h-6" />
                <div>
                  <p className="text-xs sm:text-sm opacity-80">Ongoing</p>
                  <p className="text-xl sm:text-2xl font-bold">{ongoingProjects}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <CheckCircle size={20} className="sm:w-6 sm:h-6" />
                <div>
                  <p className="text-xs sm:text-sm opacity-80">Completed</p>
                  <p className="text-xl sm:text-2xl font-bold">{completedProjects}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <Clock size={20} className="sm:w-6 sm:h-6" />
                <div>
                  <p className="text-xs sm:text-sm opacity-80">Total Hours Spent</p>
                  <p className="text-xl sm:text-2xl font-bold">{totalHoursSpent.toFixed(1)}h</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects Table */}
        <Card className="shadow-lg">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FolderKanban size={20} />
              Assigned Projects
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading projects...</div>
            ) : projects.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FolderKanban size={48} className="mx-auto mb-4 opacity-50" />
                <p>No projects assigned</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Project Code</th>
                      <th>Project Name</th>
                      <th>Status</th>
                      <th>Start Date</th>
                      <th>My Hours</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => {
                      const myHours = getProjectHours(project.project_code);
                      return (
                        <tr key={project.id}>
                          <td data-label="Project Code" className="font-semibold">{project.project_code}</td>
                          <td data-label="Project Name">{project.name}</td>
                          <td data-label="Status">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(project.status)}`}>
                              {getStatusIcon(project.status)}
                              {project.status?.toUpperCase() || 'N/A'}
                            </span>
                          </td>
                          <td data-label="Start Date">{formatDate(project.start_date)}</td>
                          <td data-label="My Hours">
                            <span className="font-semibold text-blue-600">{myHours.toFixed(1)}h</span>
                          </td>
                          <td data-label="Actions">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewProject(project)}
                            >
                              <Eye size={14} className="mr-1" />
                              View Hours
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
