import React, { useState, useMemo } from 'react';
import { Card, Row, Col, Button, Badge, ProgressBar, Table, Form } from 'react-bootstrap';
import { Icon } from '@iconify/react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useSelector } from 'react-redux';

// Couleurs pour les graphiques
const COLORS = {
  completed: '#28a745',
  inProgress: '#ffc107',
  notStarted: '#6c757d',
  primary: '#007bff',
  danger: '#dc3545'
};

const CHART_COLORS = [COLORS.completed, COLORS.inProgress, COLORS.notStarted];

const ProjectDetailView = ({ project, todoLists, onBack, allProjects, onProjectChange }) => {
  const [selectedList, setSelectedList] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  
  // Obtenir les utilisateurs depuis Redux
  const { items: users = [] } = useSelector(state => state.users || {});

  // Fonctions utilitaires pour les employés
  const getUserName = (userId) => {
    if (!userId) return 'Non assigné';
    const user = users.find(u => u.id.toString() === userId.toString());
    if (user) {
      return `${user.prenom || ''} ${user.nom || user.name || ''}`.trim();
    }
    return `Utilisateur ${userId}`;
  };

  // Filtrer les listes du projet
  const projectLists = todoLists.filter(list => list.project_id === project.id);
  
  // Calculer les statistiques détaillées
  const projectStats = useMemo(() => {
    let allTasks = projectLists.reduce((acc, list) => {
      if (list.tasks && Array.isArray(list.tasks)) {
        return [...acc, ...list.tasks];
      }
      return acc;
    }, []);

    // Filtrer les tâches par employé si sélectionné
    if (selectedEmployee !== 'all') {
      allTasks = allTasks.filter(task => 
        task.assigned_to && task.assigned_to.toString() === selectedEmployee.toString()
      );
    }

    // Statistiques globales du projet
    const completedTasks = allTasks.filter(task => task.status === 'Terminée').length;
    const inProgressTasks = allTasks.filter(task => task.status === 'En cours').length;
    const notStartedTasks = allTasks.filter(task => task.status === 'Non commencée' || !task.status).length;

    // Statistiques par liste
    const listStats = projectLists.map(list => {
      const listTasks = list.tasks || [];
      const listCompleted = listTasks.filter(task => task.status === 'Terminée').length;
      const listInProgress = listTasks.filter(task => task.status === 'En cours').length;
      const listNotStarted = listTasks.filter(task => task.status === 'Non commencée' || !task.status).length;
      
      let listProgress = 0;
      if (listTasks.length > 0) {
        let totalTasksProgressInList = 0;
        listTasks.forEach(task => {
          if (task.status === 'Terminée') {
            totalTasksProgressInList += 100;
          } else if (task.status === 'En cours') {
            totalTasksProgressInList += Number(task.pourcentage || 0);
          }
        });
        listProgress = totalTasksProgressInList / listTasks.length;
      }

      return {
        ...list,
        tasksCount: listTasks.length,
        completedTasks: listCompleted,
        inProgressTasks: listInProgress,
        notStartedTasks: listNotStarted,
        progress: parseFloat(listProgress.toFixed(2))
      };
    });

    // Calcul de la progression globale du projet
    const totalProgress = listStats.length > 0 
      ? parseFloat((listStats.reduce((sum, list) => sum + list.progress, 0) / listStats.length).toFixed(2))
      : 0;

    return {
      totalLists: projectLists.length,
      totalTasks: allTasks.length,
      completedTasks,
      inProgressTasks,
      notStartedTasks,
      totalProgress,
      listStats
    };
  }, [projectLists, selectedEmployee]);

  // Filtrer les tâches selon la liste sélectionnée
  const filteredTasks = useMemo(() => {
    let tasks = [];
    if (selectedList === 'all') {
      tasks = projectLists.reduce((acc, list) => {
        if (list.tasks && Array.isArray(list.tasks)) {
          return [...acc, ...list.tasks.map(task => ({ ...task, listName: list.titre || list.title }))];
        }
        return acc;
      }, []);
    } else {
      const list = projectLists.find(l => l.id === parseInt(selectedList));
      tasks = list && list.tasks ? list.tasks.map(task => ({ ...task, listName: list.titre || list.title })) : [];
    }

    // Appliquer le filtre employé
    if (selectedEmployee !== 'all') {
      tasks = tasks.filter(task => 
        task.assigned_to && task.assigned_to.toString() === selectedEmployee.toString()
      );
    }

    return tasks;
  }, [selectedList, projectLists, selectedEmployee]);

  return (
    <div className="project-detail-view">
      {/* En-tête avec bouton retour */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button variant="outline-secondary" onClick={onBack} className="mb-3">
            <Icon icon="fluent:arrow-left-24-filled" className="me-2" />
            Retour à la vue générale
          </Button>
          <div className="d-flex align-items-center gap-3">
            <div>
              <h2 className="mb-1">
                <Icon icon="fluent:folder-24-filled" className="me-2 text-primary" />
                {project.titre || project.title}
              </h2>
              <p className="text-muted mb-0">{project.description}</p>
              
              {/* Informations sur les dates */}
              <div className="mt-2">
                <Row>
                  <Col md={6}>
                    <div className="d-flex align-items-center gap-2">
                      <Icon icon="fluent:calendar-play-24-filled" className="text-success" />
                      <span className="small text-muted">
                        <strong>Date début:</strong> {project.date_debut ? 
                          new Date(project.date_debut).toLocaleDateString('fr-FR') : 
                          'Non définie'}
                      </span>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="d-flex align-items-center gap-2">
                      <Icon icon="fluent:calendar-clock-24-filled" className="text-warning" />
                      <span className="small text-muted">
                        <strong>Date fin:</strong> {project.date_fin_prevu ? 
                          new Date(project.date_fin_prevu).toLocaleDateString('fr-FR') : 
                          'Non définie'}
                      </span>
                    </div>
                  </Col>
                </Row>
              </div>
            </div>
            {allProjects && allProjects.length > 1 && onProjectChange && (
              <div className="ms-4">
                <Form.Select
                  value={project.id}
                  onChange={(e) => {
                    const newProject = allProjects.find(p => p.id === parseInt(e.target.value));
                    if (newProject) onProjectChange(newProject);
                  }}
                  style={{ width: '250px' }}
                >
                  {allProjects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.titre || p.title}
                    </option>
                  ))}
                </Form.Select>
              </div>
            )}
          </div>
        </div>
        <div className="text-end">
          <h3 className="text-primary fw-bold mb-0">{projectStats.totalProgress}%</h3>
          <small className="text-muted">Progression globale</small>
        </div>
      </div>

      {/* Statistiques principales du projet */}
      <Row className="mb-4">
        <Col xl={3} lg={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="p-4">
              <div className="d-flex align-items-center">
                <div className="bg-info bg-opacity-10 rounded-3 p-2 me-3">
                  <Icon icon="fluent:task-list-square-24-filled" className="text-info" style={{fontSize: '24px'}} />
                </div>
                <div>
                  <h6 className="text-muted mb-0 fw-normal">Listes Total</h6>
                  <h3 className="mb-0 fw-bold text-info">{projectStats.totalLists}</h3>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xl={3} lg={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="p-4">
              <div className="d-flex align-items-center">
                <div className="bg-warning bg-opacity-10 rounded-3 p-2 me-3">
                  <Icon icon="fluent:checkbox-checked-24-filled" className="text-warning" style={{fontSize: '24px'}} />
                </div>
                <div>
                  <h6 className="text-muted mb-0 fw-normal">Tâches Total</h6>
                  <h3 className="mb-0 fw-bold text-warning">{projectStats.totalTasks}</h3>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xl={3} lg={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="p-4">
              <div className="d-flex align-items-center">
                <div className="bg-success bg-opacity-10 rounded-3 p-2 me-3">
                  <Icon icon="fluent:checkmark-circle-24-filled" className="text-success" style={{fontSize: '24px'}} />
                </div>
                <div>
                  <h6 className="text-muted mb-0 fw-normal">Terminées</h6>
                  <h3 className="mb-0 fw-bold text-success">{projectStats.completedTasks}</h3>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xl={3} lg={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="p-4">
              <div className="d-flex align-items-center">
                <div className="bg-primary bg-opacity-10 rounded-3 p-2 me-3">
                  <Icon icon="fluent:clock-24-filled" className="text-primary" style={{fontSize: '24px'}} />
                </div>
                <div>
                  <h6 className="text-muted mb-0 fw-normal">En cours</h6>
                  <h3 className="mb-0 fw-bold text-primary">{projectStats.inProgressTasks}</h3>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Informations sur les dates du projet */}
      <Row className="mb-4">
        <Col lg={12}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pb-0">
              <h6 className="fw-semibold mb-0">
                <Icon icon="fluent:calendar-24-filled" className="me-2" />
                Chronologie du Projet
              </h6>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col lg={6} md={6} className="mb-3">
                  <div className="d-flex align-items-center">
                    <div className="bg-success bg-opacity-10 rounded-3 p-2 me-3">
                      <Icon icon="fluent:calendar-play-24-filled" className="text-success" style={{fontSize: '24px'}} />
                    </div>
                    <div>
                      <h6 className="text-muted mb-0 fw-normal">Date Début</h6>
                      <p className="mb-0 fw-semibold">
                        {project.date_debut ? 
                          new Date(project.date_debut).toLocaleDateString('fr-FR', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          }) : 
                          <span className="text-muted">Non définie</span>
                        }
                      </p>
                    </div>
                  </div>
                </Col>
                <Col lg={6} md={6} className="mb-3">
                  <div className="d-flex align-items-center">
                    <div className="bg-warning bg-opacity-10 rounded-3 p-2 me-3">
                      <Icon icon="fluent:calendar-clock-24-filled" className="text-warning" style={{fontSize: '24px'}} />
                    </div>
                    <div>
                      <h6 className="text-muted mb-0 fw-normal">Date Fin</h6>
                      <p className="mb-0 fw-semibold">
                        {project.date_fin_prevu ? 
                          new Date(project.date_fin_prevu).toLocaleDateString('fr-FR', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          }) : 
                          <span className="text-muted">Non définie</span>
                        }
                      </p>
                    </div>
                  </div>
                </Col>
              </Row>
              
              {/* Indicateurs de délais */}
              {project.date_fin_prevu && (
                <Row className="mt-3">
                  <Col lg={12}>
                    {(() => {
                      const today = new Date();
                      const endDate = new Date(project.date_fin_prevu);
                      const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                      
                      if (projectStats.totalProgress >= 100) {
                        return (
                          <div className="alert alert-success d-flex align-items-center">
                            <Icon icon="fluent:checkmark-circle-24-filled" className="me-2" />
                            <span><strong>Projet terminé</strong> - Félicitations !</span>
                          </div>
                        );
                      } else {
                        return (
                          <div className={`alert ${daysLeft < 7 ? 'alert-danger' : daysLeft < 30 ? 'alert-warning' : 'alert-info'} d-flex align-items-center`}>
                            <Icon icon={daysLeft < 7 ? "fluent:clock-alarm-24-filled" : "fluent:clock-24-filled"} className="me-2" />
                            <span>
                              {daysLeft < 0 ? 
                                `<strong>En retard</strong> - ${Math.abs(daysLeft)} jour${Math.abs(daysLeft) > 1 ? 's' : ''} de dépassement` :
                                `<strong>Échéance dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}</strong>`
                              }
                            </span>
                          </div>
                        );
                      }
                    })()}
                  </Col>
                </Row>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Graphiques */}
      <Row className="mb-4">
        {/* Graphique en secteurs - Répartition des tâches */}
        <Col lg={6} className="mb-4">
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white border-0 pb-0">
              <h6 className="fw-semibold mb-0">
                <Icon icon="fluent:pie-chart-24-filled" className="me-2" />
                Répartition des Tâches
              </h6>
            </Card.Header>
            <Card.Body>
              {projectStats.totalTasks > 0 ? (
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Terminées', value: projectStats.completedTasks },
                          { name: 'En cours', value: projectStats.inProgressTasks },
                          { name: 'Non commencées', value: projectStats.notStartedTasks }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {CHART_COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-5">
                  <Icon icon="fluent:chart-pie-24-filled" className="text-muted mb-3" style={{fontSize: '48px'}} />
                  <h6 className="text-muted">Aucune tâche disponible</h6>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Graphique en barres - Progression des listes */}
        <Col lg={6} className="mb-4">
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white border-0 pb-0">
              <h6 className="fw-semibold mb-0">
                <Icon icon="fluent:chart-column-24-filled" className="me-2" />
                Progression par Liste
              </h6>
            </Card.Header>
            <Card.Body>
              {projectStats.listStats.length > 0 ? (
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart
                      data={projectStats.listStats.map(list => ({
                        name: (list.titre || list.title).length > 10 ? 
                              (list.titre || list.title).substring(0, 10) + '...' : 
                              (list.titre || list.title),
                        fullName: list.titre || list.title,
                        progress: list.progress
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        fontSize={12}
                      />
                      <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                      <Tooltip 
                        formatter={(value, name, props) => [`${value}%`, 'Progression']}
                        labelFormatter={(label, payload) => 
                          payload && payload[0] ? payload[0].payload.fullName : label
                        }
                      />
                      <Bar dataKey="progress" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-5">
                  <Icon icon="fluent:chart-column-24-filled" className="text-muted mb-3" style={{fontSize: '48px'}} />
                  <h6 className="text-muted">Aucune liste disponible</h6>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Statistiques des employés */}
      {selectedEmployee === 'all' && (
        <Row className="mb-4">
          <Col lg={12}>
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white border-0">
                <h6 className="fw-semibold mb-0">
                  <Icon icon="fluent:people-24-filled" className="me-2" />
                  Répartition des Tâches par Employé
                </h6>
              </Card.Header>
              <Card.Body>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart
                      data={(() => {
                        const employeeStats = {};
                        const allTasks = projectLists.reduce((acc, list) => {
                          if (list.tasks && Array.isArray(list.tasks)) {
                            return [...acc, ...list.tasks];
                          }
                          return acc;
                        }, []);

                        allTasks.forEach(task => {
                          const employeeId = task.assigned_to || 'unassigned';
                          const employeeName = task.assigned_to ? getUserName(task.assigned_to) : 'Non assigné';
                          
                          if (!employeeStats[employeeId]) {
                            employeeStats[employeeId] = {
                              name: employeeName.length > 15 ? employeeName.substring(0, 15) + '...' : employeeName,
                              fullName: employeeName,
                              total: 0,
                              completed: 0,
                              inProgress: 0,
                              notStarted: 0
                            };
                          }
                          
                          employeeStats[employeeId].total++;
                          if (task.status === 'Terminée') {
                            employeeStats[employeeId].completed++;
                          } else if (task.status === 'En cours') {
                            employeeStats[employeeId].inProgress++;
                          } else {
                            employeeStats[employeeId].notStarted++;
                          }
                        });

                        return Object.values(employeeStats);
                      })()}
                      margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        fontSize={12}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [value, name]}
                        labelFormatter={(label, payload) => 
                          payload && payload[0] ? payload[0].payload.fullName : label
                        }
                      />
                      <Legend />
                      <Bar dataKey="completed" name="Terminées" fill={COLORS.completed} />
                      <Bar dataKey="inProgress" name="En cours" fill={COLORS.inProgress} />
                      <Bar dataKey="notStarted" name="Non commencées" fill={COLORS.notStarted} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Sélecteur de liste et tableau des tâches */}
      <Row>
        <Col lg={12}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="fw-semibold mb-0">
                  <Icon icon="fluent:table-24-filled" className="me-2" />
                  Tâches du Projet
                </h6>
                <div className="d-flex align-items-center gap-3">
                  <Form.Select
                    value={selectedList}
                    onChange={(e) => setSelectedList(e.target.value)}
                    style={{ width: 'auto' }}
                  >
                    <option value="all">Toutes les listes</option>
                    {projectStats.listStats.map(list => (
                      <option key={list.id} value={list.id}>
                        {list.titre || list.title} ({list.tasksCount} tâches)
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    style={{ width: 'auto' }}
                  >
                    <option value="all">Tous les employés</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {getUserName(user.id)}
                      </option>
                    ))}
                  </Form.Select>
                  <Badge bg="light" text="dark">
                    {filteredTasks.length} tâche{filteredTasks.length > 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {filteredTasks.length > 0 ? (
                <div className="table-responsive">
                  <Table className="mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th className="border-0 fw-semibold text-muted py-3 px-4">Tâche</th>
                        <th className="border-0 fw-semibold text-muted py-3">Liste</th>
                        <th className="border-0 fw-semibold text-muted py-3">Assigné à</th>
                        <th className="border-0 fw-semibold text-muted py-3">Statut</th>
                        <th className="border-0 fw-semibold text-muted py-3">Progression</th>
                        <th className="border-0 fw-semibold text-muted py-3">Date Début</th>
                        <th className="border-0 fw-semibold text-muted py-3">Date Fin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTasks.map((task, index) => {
                        const statusColor = task.status === 'Terminée' ? 'success' :
                                          task.status === 'En cours' ? 'warning' : 'secondary';
                        const taskProgress = task.status === 'Terminée' ? 100 : 
                                           task.status === 'En cours' ? (task.pourcentage || 0) : 0;
                        
                        return (
                          <tr key={task.id || index} className="border-bottom">
                            <td className="py-3 px-4">
                              <div className="d-flex align-items-center">
                                <Icon icon="fluent:task-24-filled" className="text-primary me-2" />
                                <div>
                                  <h6 className="mb-1 fw-semibold">{task.title || task.titre}</h6>
                                  {task.description && (
                                    <p className="text-muted small mb-0">
                                      {task.description.length > 50 ? 
                                        `${task.description.substring(0, 50)}...` : 
                                        task.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3">
                              <Badge bg="light" text="dark">
                                {task.listName}
                              </Badge>
                            </td>
                            <td className="py-3">
                              <div className="d-flex align-items-center">
                                <Icon icon="fluent:person-24-filled" className="text-info me-2" />
                                <span className="text-muted small">
                                  {getUserName(task.assigned_to)}
                                </span>
                              </div>
                            </td>
                            <td className="py-3">
                              <Badge bg={statusColor} className="px-3 py-2">
                                {task.status || 'Non commencée'}
                              </Badge>
                            </td>
                            <td className="py-3">
                              <div className="d-flex align-items-center" style={{width: '120px'}}>
                                <ProgressBar 
                                  now={taskProgress} 
                                  variant={statusColor}
                                  className="flex-grow-1 me-2"
                                  style={{ height: '6px' }}
                                />
                                <span className="small fw-semibold text-muted">{taskProgress}%</span>
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="d-flex align-items-center">
                                <Icon icon="fluent:calendar-play-24-filled" className="text-success me-2" />
                                <span className="text-muted small">
                                  {project.date_debut ? 
                                    new Date(project.date_debut).toLocaleDateString('fr-FR') : 
                                    'Non définie'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="d-flex align-items-center">
                                <Icon icon="fluent:calendar-clock-24-filled" className="text-warning me-2" />
                                <span className="text-muted small">
                                  {project.date_fin_prevu ? 
                                    new Date(project.date_fin_prevu).toLocaleDateString('fr-FR') : 
                                    'Non définie'}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-5">
                  <Icon icon="fluent:task-24-filled" className="text-muted mb-3" style={{fontSize: '48px'}} />
                  <h6 className="text-muted">Aucune tâche trouvée</h6>
                  <p className="text-muted small mb-0">
                    {selectedList === 'all' ? 
                      'Ce projet ne contient aucune tâche' : 
                      'Cette liste ne contient aucune tâche'}
                  </p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ProjectDetailView;
