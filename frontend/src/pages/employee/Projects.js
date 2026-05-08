import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { api } from '../../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { FolderKanban, Clock, CheckCircle, AlertCircle, Eye, Users, UsersRound, Search } from 'lucide-react';

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
  const [myProjectsSearch, setMyProjectsSearch] = useState('');
  const [teamProjectsSearch, setTeamProjectsSearch] = useState('');

  useEffect(() => { checkIfPM(); checkIfTeamLeader(); fetchProjects(); fetchWorkEntries(); }, []);

  const checkIfPM = async () => { try { const r = await api.get('/employee/is-pm'); setIsPM(r.data.is_pm); if (r.data.is_pm) fetchPMProjects(); } catch (e) {} };
  const checkIfTeamLeader = async () => { try { const r = await api.get('/employee/is-team-leader'); setIsTeamLeader(r.data.is_team_leader); setTeamMembers(r.data.team_members || []); if (r.data.is_team_leader) fetchTeamProjects(); } catch (e) {} };
  const fetchPMProjects = async () => { try { const r = await api.get('/projects/pm-view'); setPmProjects(r.data); } catch (e) {} };
  const fetchTeamProjects = async () => { try { const r = await api.get('/projects/team-view'); setTeamProjects(r.data); } catch (e) {} };
  const fetchProjects = async () => { try { const r = await api.get('/projects'); setProjects(r.data); } catch (e) {} finally { setLoading(false); } };
  const fetchWorkEntries = async () => { try { const r = await api.get('/work-entries'); setWorkEntries(r.data); } catch (e) {} };

  const getProjectHours = (code) => workEntries.filter(e => e.project_code === code).reduce((s, e) => s + (e.hours || 0), 0);
  const getStatusBadge = (status) => {
    const s = status?.toLowerCase();
    if (s === 'completed') return 'bg-green-100 text-green-700 border-green-200';
    if (s === 'late') return 'bg-red-500 text-white border-red-500';
    if (s === 'active' || s === 'ongoing') return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
  const handleViewProject = (p) => navigate(`/employee/work-entry?project=${p.project_code}&source=projects&status=${p.status}&name=${encodeURIComponent(p.name)}`);
  const handleViewDetails = (p) => { setSelectedProject(p); setViewDialogOpen(true); };

  const filteredMyProjects = projects.filter(p => p.name.toLowerCase().includes(myProjectsSearch.toLowerCase()) || p.project_code.toLowerCase().includes(myProjectsSearch.toLowerCase()));
  const filteredTeamProjects = teamProjects.filter(p => p.name.toLowerCase().includes(teamProjectsSearch.toLowerCase()) || p.project_code.toLowerCase().includes(teamProjectsSearch.toLowerCase()) || (p.developers && p.developers.some(d => d.name.toLowerCase().includes(teamProjectsSearch.toLowerCase()))));

  const myTotalHours = workEntries.reduce((s, e) => s + e.hours, 0);
  const myCompletedProjects = projects.filter(p => p.status?.toLowerCase() === 'completed').length;
  const myOngoingProjects = projects.filter(p => ['active', 'ongoing'].includes(p.status?.toLowerCase())).length;
  const teamTotalProjects = teamProjects.length;
  const teamCompletedProjects = teamProjects.filter(p => p.status?.toLowerCase() === 'completed').length;
  const teamOngoingProjects = teamProjects.filter(p => ['active', 'ongoing'].includes(p.status?.toLowerCase())).length;
  const teamTotalHours = teamProjects.reduce((s, p) => s + (p.total_hours || p.completed_hours || 0), 0);

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}><Icon size={18} /></div>
        <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p><p className="text-xl font-bold text-slate-900">{value}</p></div>
      </div>
    </div>
  );

  const ProjectTable = ({ data, search, setSearch, searchPlaceholder, showTeam = false }) => (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-700">{showTeam ? 'Team Member Projects' : 'My Assigned Projects'}</h3>
        <div className="relative w-full sm:w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <Input placeholder={searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm border-slate-200" data-testid={showTeam ? 'team-projects-search' : 'my-projects-search'} />
        </div>
      </div>
      {loading ? (
        <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
      ) : data.length === 0 ? (
        <div className="p-12 text-center"><FolderKanban size={36} className="mx-auto mb-3 text-slate-300" /><p className="text-sm text-slate-400">{search ? 'No projects match your search' : 'No projects found'}</p></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-slate-200 bg-slate-50/50">
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Project</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Status</th>
              {!showTeam && <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Type</th>}
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">{showTeam ? 'Team Members & Hours' : 'Hours'}</th>
              {!showTeam && <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Actions</th>}
            </tr></thead>
            <tbody>
              {data.map((project) => {
                const hrs = showTeam ? null : workEntries.filter(e => e.project_code === project.project_code).reduce((s, e) => s + e.hours, 0);
                return (
                  <tr key={project.id || project.project_code} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4"><p className="font-medium text-sm text-slate-800">{project.name}</p><p className="text-xs text-slate-400 font-mono">{project.project_code}</p></td>
                    <td className="py-3 px-4"><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${project.is_late ? 'bg-red-500 text-white border-red-500' : getStatusBadge(project.status)}`}>{project.is_late ? 'Late' : project.status}</span></td>
                    {!showTeam && <td className="py-3 px-4 text-sm text-slate-500">{project.type}</td>}
                    <td className="py-3 px-4">
                      {showTeam ? (
                        project.developers?.length > 0 ? (
                          <div className="space-y-1.5">
                            {project.developers.filter(dev => { const ids = teamMembers.map(tm => tm.employee_id); return dev.is_team_member && ids.includes(dev.employee_id); }).map((dev) => (
                              <div key={dev.employee_id} className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-2"><span className="text-sm font-medium text-slate-700">{dev.name}</span><span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 font-medium">Team</span></div>
                                <div className="flex items-center gap-2"><span className="text-sm font-bold text-blue-600">{dev.hours?.toFixed(1) || 0}h</span>
                                  <Button size="sm" variant="outline" onClick={() => navigate(`/employee/work-entry?project=${project.project_code}&source=projects&status=${project.status}&name=${encodeURIComponent(project.name)}&employee=${dev.employee_id}`)} className="h-7 text-xs border-slate-200" data-testid={`view-hours-${dev.employee_id}-${project.project_code}`}><Eye size={12} className="mr-1" /> View</Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : <p className="text-xs text-slate-400">No team member hours</p>
                      ) : (
                        <span className="text-sm font-bold text-blue-600">{hrs.toFixed(1)}h</span>
                      )}
                    </td>
                    {!showTeam && (
                      <td className="py-3 px-4">
                        <Button size="sm" variant="outline" onClick={() => handleViewProject(project)} className="h-8 text-xs border-slate-200" data-testid={`view-hours-${project.project_code}`}><Eye size={12} className="mr-1" /> View Hours</Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Team Leader View
  if (isTeamLeader) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto" data-testid="team-leader-projects-page">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">My Projects</h1>
            <p className="text-sm text-slate-500 mt-1">View your projects and team member projects</p>
          </div>
          <Tabs defaultValue="my-projects" className="w-full">
            <TabsList className="mb-6 bg-slate-100">
              <TabsTrigger value="my-projects" className="text-xs"><FolderKanban size={14} className="mr-1.5" /> My Projects ({projects.length})</TabsTrigger>
              <TabsTrigger value="team-projects" className="text-xs"><UsersRound size={14} className="mr-1.5" /> Team Projects ({teamTotalProjects})</TabsTrigger>
            </TabsList>
            <TabsContent value="my-projects">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard icon={FolderKanban} label="Total" value={projects.length} color="bg-blue-50 text-blue-600" />
                <StatCard icon={CheckCircle} label="Completed" value={myCompletedProjects} color="bg-green-50 text-green-600" />
                <StatCard icon={AlertCircle} label="Ongoing" value={myOngoingProjects} color="bg-amber-50 text-amber-600" />
                <StatCard icon={Clock} label="Total Hours" value={`${myTotalHours.toFixed(1)}h`} color="bg-indigo-50 text-indigo-600" />
              </div>
              <ProjectTable data={filteredMyProjects} search={myProjectsSearch} setSearch={setMyProjectsSearch} searchPlaceholder="Search projects..." />
            </TabsContent>
            <TabsContent value="team-projects">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard icon={FolderKanban} label="Total" value={teamTotalProjects} color="bg-blue-50 text-blue-600" />
                <StatCard icon={CheckCircle} label="Completed" value={teamCompletedProjects} color="bg-green-50 text-green-600" />
                <StatCard icon={AlertCircle} label="Ongoing" value={teamOngoingProjects} color="bg-amber-50 text-amber-600" />
                <StatCard icon={Clock} label="Total Hours" value={`${teamTotalHours.toFixed(1)}h`} color="bg-indigo-50 text-indigo-600" />
              </div>
              <ProjectTable data={filteredTeamProjects} search={teamProjectsSearch} setSearch={setTeamProjectsSearch} searchPlaceholder="Search projects or members..." showTeam />
            </TabsContent>
          </Tabs>
        </div>
      </Layout>
    );
  }

  // PM View
  if (isPM) {
    const pmCompletedProjects = pmProjects.filter(p => p.status?.toLowerCase() === 'completed').length;
    const pmOngoingProjects = pmProjects.filter(p => ['active', 'ongoing'].includes(p.status?.toLowerCase())).length;
    const pmTotalHours = pmProjects.reduce((s, p) => s + (p.total_hours || 0), 0);
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto" data-testid="pm-projects-page">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Project Management</h1>
            <p className="text-sm text-slate-500 mt-1">View assigned projects and team work hours</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard icon={FolderKanban} label="Assigned" value={pmProjects.length} color="bg-blue-50 text-blue-600" />
            <StatCard icon={Clock} label="Ongoing" value={pmOngoingProjects} color="bg-amber-50 text-amber-600" />
            <StatCard icon={CheckCircle} label="Completed" value={pmCompletedProjects} color="bg-green-50 text-green-600" />
            <StatCard icon={Clock} label="Total Hours" value={`${pmTotalHours.toFixed(1)}h`} color="bg-indigo-50 text-indigo-600" />
          </div>
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200"><h3 className="text-sm font-semibold text-slate-700">My Assigned Projects</h3></div>
            {pmProjects.length === 0 ? (
              <div className="p-12 text-center"><FolderKanban size={36} className="mx-auto mb-3 text-slate-300" /><p className="text-sm text-slate-400">No projects assigned</p></div>
            ) : (
              <div className="table-container">
                <table>
                  <thead><tr className="border-b border-slate-200 bg-slate-50/50">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Code</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Name</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Client</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Status</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Hours</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Team</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Actions</th>
                  </tr></thead>
                  <tbody>
                    {pmProjects.map((p) => (
                      <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors">
                        <td data-label="Code" className="py-3 px-4 text-sm font-mono text-blue-600">{p.project_code}</td>
                        <td data-label="Name" className="py-3 px-4 text-sm font-medium text-slate-800">{p.name}</td>
                        <td data-label="Client" className="py-3 px-4 text-sm text-slate-500">{p.client_username || p.client || '-'}</td>
                        <td data-label="Status" className="py-3 px-4"><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${getStatusBadge(p.status)}`}>{p.status?.toUpperCase()}</span></td>
                        <td data-label="Hours" className="py-3 px-4 text-sm font-bold text-blue-600">{(p.total_hours || 0).toFixed(1)}h</td>
                        <td data-label="Team" className="py-3 px-4 text-sm text-slate-500"><Users size={14} className="inline mr-1" />{p.developer_count || 0}</td>
                        <td data-label="Actions" className="py-3 px-4"><Button size="sm" variant="outline" onClick={() => handleViewDetails(p)} className="h-8 text-xs border-slate-200" data-testid={`view-details-${p.project_code}`}><Eye size={12} className="mr-1" /> Details</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader><DialogTitle className="text-lg font-semibold text-slate-900">{selectedProject?.name}</DialogTitle></DialogHeader>
              {selectedProject && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div><p className="text-xs text-slate-400 uppercase tracking-wider">Code</p><p className="font-mono text-sm text-blue-600 mt-0.5">{selectedProject.project_code}</p></div>
                    <div><p className="text-xs text-slate-400 uppercase tracking-wider">Client</p><p className="text-sm font-medium text-slate-800 mt-0.5">{selectedProject.client_username || '-'}</p></div>
                    <div><p className="text-xs text-slate-400 uppercase tracking-wider">Status</p><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border mt-0.5 ${getStatusBadge(selectedProject.status)}`}>{selectedProject.status?.toUpperCase()}</span></div>
                    <div><p className="text-xs text-slate-400 uppercase tracking-wider">Total Hours</p><p className="text-sm font-bold text-blue-600 mt-0.5">{(selectedProject.total_hours || 0).toFixed(1)}h</p></div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-700 mb-2">Developer Hours</h4>
                    {selectedProject.developers?.length > 0 ? (
                      <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-sm"><thead className="bg-slate-50 sticky top-0"><tr><th className="text-left p-2.5 text-xs text-slate-500">#</th><th className="text-left p-2.5 text-xs text-slate-500">Name</th><th className="text-right p-2.5 text-xs text-slate-500">Hours</th></tr></thead>
                        <tbody>{selectedProject.developers.map((dev, idx) => (<tr key={idx} className="border-t border-slate-100"><td className="p-2.5 text-slate-400">{idx + 1}</td><td className="p-2.5 text-slate-700">{dev.name}</td><td className="p-2.5 text-right font-bold text-blue-600">{dev.hours.toFixed(1)}h</td></tr>))}</tbody>
                        <tfoot className="bg-slate-50"><tr className="border-t border-slate-200"><td colSpan={2} className="p-2.5 font-semibold text-slate-700">Total</td><td className="p-2.5 text-right font-bold text-blue-600">{(selectedProject.total_hours || 0).toFixed(1)}h</td></tr></tfoot>
                        </table>
                      </div>
                    ) : (<p className="text-sm text-slate-400 text-center py-4">No work hours logged</p>)}
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
  const totalHoursSpent = workEntries.reduce((s, e) => s + (e.hours || 0), 0);
  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto" data-testid="employee-projects-page">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">My Projects</h1>
          <p className="text-sm text-slate-500 mt-1">View your assigned projects and hours spent</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard icon={FolderKanban} label="Assigned" value={projects.length} color="bg-blue-50 text-blue-600" />
          <StatCard icon={Clock} label="Ongoing" value={projects.filter(p => ['active', 'ongoing'].includes(p.status?.toLowerCase())).length} color="bg-amber-50 text-amber-600" />
          <StatCard icon={CheckCircle} label="Completed" value={projects.filter(p => p.status?.toLowerCase() === 'completed').length} color="bg-green-50 text-green-600" />
          <StatCard icon={Clock} label="Total Hours" value={`${totalHoursSpent.toFixed(1)}h`} color="bg-indigo-50 text-indigo-600" />
        </div>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200"><h3 className="text-sm font-semibold text-slate-700">Assigned Projects</h3></div>
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
          ) : projects.length === 0 ? (
            <div className="p-12 text-center"><FolderKanban size={36} className="mx-auto mb-3 text-slate-300" /><p className="text-sm text-slate-400">No projects assigned</p></div>
          ) : (
            <div className="table-container">
              <table>
                <thead><tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Code</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Name</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Status</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Start</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Hours</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Actions</th>
                </tr></thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors">
                      <td data-label="Code" className="py-3 px-4 text-sm font-mono text-slate-600">{p.project_code}</td>
                      <td data-label="Name" className="py-3 px-4 text-sm font-medium text-slate-800">{p.name}</td>
                      <td data-label="Status" className="py-3 px-4"><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${getStatusBadge(p.status)}`}>{p.status?.toUpperCase()}</span></td>
                      <td data-label="Start" className="py-3 px-4 text-sm text-slate-500">{formatDate(p.start_date)}</td>
                      <td data-label="Hours" className="py-3 px-4 text-sm font-bold text-blue-600">{getProjectHours(p.project_code).toFixed(1)}h</td>
                      <td data-label="Actions" className="py-3 px-4"><Button size="sm" variant="outline" onClick={() => handleViewProject(p)} className="h-8 text-xs border-slate-200"><Eye size={12} className="mr-1" /> View Hours</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
