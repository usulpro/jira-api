import React, { Component } from 'react';
import SplitPane from 'react-split-pane';
import styled from 'react-emotion';

import appPackage from '../package.json';
import './App.css';
import {
  getBoard,
  proxiRequest,
  getAllBoards,
  getBoardEpics,
  getEpicIssues,
  getNoEpicIssues,
  getBacklog,
  getIssue,
  onProxiRequest,
} from './api';

import {
  fetchInitData,
  fetchProjects,
  fetchProjectData,
  // isDataStored,
  refetchData,
  sortProjByIssues,
  contributorRates,
  makeIssuePayment,
} from './store';
import Inspector from './components/inspector';
import Console from './components/console';
import { Issue, sortIssues } from './ui/Issue';

// onProxiRequest(console.log);

const exec = (...fn) => () => fn.forEach(f => f());

class App extends Component {
  state = {
    boards: null,
    projects: null,
    epics: null,
    backlog: null,
    status: 'loading...',
    isStored: false, // isDataStored(),
    inspectedObject: undefined,
    currentProject: undefined,
  };
  issuesIdList = [];

  async componentDidMount() {
    this.log({ text: 'App did mount' });
    onProxiRequest(this.fetchLog);
    const { boardsCollection, projectsCollection } = await fetchProjects();

    const projects = projectsCollection; // .sort(sortProjByIssues);
    const currentProjKey = 'EWPH';
    this.setState(
      {
        projects,
        status: `fetching for ${currentProjKey}...`,
        isStored: true,
        currentProject: projects.find(proj => proj.key === currentProjKey),
      },
      this.fetchProjectData(currentProjKey)
    );
  }

  fetchLog = info =>
    this.log({ text: `fetching ${info.url}`, state: info.data });

  fetchProjectData = (key, finalState) => async () => {
    const { projectsCollection } = await fetchProjectData(key);
    this.setState(
      {
        projects: projectsCollection,
        status: `${key} is ready`,
        currentProject: projectsCollection.find(proj => proj.key === key),
        ...finalState,
      },
      () =>
        this.log({ text: 'fetchProjectData', state: { projectsCollection } })
    );
  };

  refetchData = async () => {
    const currentProjKey = this.state.currentProject.key;
    this.setState(
      {
        projects: null,
        status: `refetching for ${currentProjKey}...`,
        isStored: false,
      },
      async () => {
        this.log({ text: 'refetching...' });
        const {
          boardsCollection,
          projectsCollection,
          // epicsCollection,
          // issuesCollection,
        } = await refetchData();

        const projects = projectsCollection; // .sort(sortProjByIssues);

        this.setState(
          {
            projects,
            status: 'ready',
            isStored: true,
            currentProject: projects.find(proj => proj.key === currentProjKey),
          },
          this.fetchProjectData(currentProjKey)
        );
      }
    );
  };

  updIssue = issueId => async ev => {
    const issue = await getIssue(issueId);
    console.log('​App -> issue', issue);
  };

  fetchEstimates = () => {
    if (!this.issuesIdList.length) return;
    this.issuesIdList.forEach(issue => {
      this.setState({ status: `fetching for ${issue.issueId}` }, async () => {
        const issueData = await getIssue(issue.issueId);
        const estimate = issueData.fields.timetracking.originalEstimateSeconds;
        issue.estimate = estimate;
        this.setState({ status: `fetched for id:${issue.issueId}` });
        console.log('​App -> fetchEstimates -> estimate', issue);
      });
    });
  };

  getIssues = async boardId => {
    this.setState({ status: 'loading issues...' }, async () => {
      const { epics } = this.state;
      let isIssues = false;
      await epics.forEach(async (epic, ind, allEpics) => {
        const issues = await getEpicIssues(boardId, epic.id);
        console.log('​App -> issues', issues);
        epic.issues = issues;
        if (issues.length) {
          isIssues = true;
        }
        this.setState({ epics: allEpics, status: 'ready' });
      });
      this.setState({ status: 'ready' });
    });
  };

  getBacklog = async boardId => {
    this.setState({ status: 'loading backlog...' }, async () => {
      const backlog = await getBacklog(boardId);
      console.log('​backlog', backlog);
      this.setState({ backlog, status: 'ready' });
    });
  };

  getBoard = id => async () => {
    // this.issuesIdList = [];
    this.setState(
      {
        status: 'loading epics...',
        epics: null,
        backlog: null,
      },
      async () => {
        console.clear();
        // const board = await getBoard(id);
        const epics = await getBoardEpics(id);

        this.setState({ epics, status: 'ready' });
        console.log('​App -> board', epics);
        if (epics.length) await this.getIssues(id);
        await this.getBacklog(id);
      }
    );
  };

  findEstimate = issueId => {
    const issue = this.issuesIdList.find(v => v.issueId === issueId);
    // console.log('​findEstimate -> issueId', issueId, issue);

    if (issue && !issue.parentId) {
      const subtasks = this.issuesIdList.filter(v => v.parentId === issueId);
      const sum = subtasks.reduce(
        (sm, sbTask) => sm + (sbTask.estimate || 0),
        0
      );
      return sum;
    }
    if (issue && issue.estimate) {
      return issue.estimate;
    }
    return null;
  };

  renderIssues = (issues, epic) => {
    const Contaner = styled('div')({
      border: '1px solid rgb(150, 150, 150)',
      borderRadius: 2,
      padding: 4,
      margin: 2,
      width: 'auto',
    });

    const statusWeight = statusName =>
      ({
        'Selected for Development': 0,
        'In Progress': 0.25,
        Review: 0.75,
        Done: 1,
      }[statusName]);

    const estimateTask = task => {
      const calcCost = task => {
        try {
          const key = task.fields.assignee.key;
          const rate = contributorRates(key).rate;
          const seconds = task.fields.timetracking.originalEstimateSeconds;
          const cost = (rate * seconds) / 60 / 60;
          const hasCostErrors = false;
          return { cost, hasCostErrors };
        } catch (error) {
          return { cost: 0, hasCostErrors: true };
        }
      };
      try {
        return {
          seconds: task.fields.timetracking.originalEstimateSeconds,
          statusName: task.fields.status.name,
          statusId: task.fields.status.id,
          progress: statusWeight(task.fields.status.name),
          ...calcCost(task),
        };
      } catch (error) {
        return {
          error,
        };
      }
    };

    const reduceSubtasks = (sum, task) => {
      const taskEst = estimateTask(task);
      if (taskEst.error) return sum;
      const summary = {
        ...sum,
        seconds: (sum.seconds || 0) + (taskEst.seconds || 0),
        cost: (sum.cost || 0) + (taskEst.cost || 0),
        hasCostErrors:
          sum.hasCostErrors || false || (taskEst.hasCostErrors || false),
        statusName: 'integration',
        progressList: sum.progressList
          ? [...sum.progressList, taskEst]
          : [taskEst],
      };
      return summary;
    };

    const estimateIssue = issue => {
      if (!issue || !issue.fields || issue.disabled) return null;
      const hasSubtasks = issue.fields.subtasks && issue.fields.subtasks.length;
      if (!hasSubtasks) {
        return estimateTask(issue);
      }
      const story = issue.fields.subtasks.reduce(reduceSubtasks, {
        sum: 0,
        seconds: 0,
        hasCostErrors: false,
        statusName: '',
        progressList: [],
      });
      story.progress =
        story.progressList.reduce(
          (sum, taskEst) =>
            (sum || 0) + (taskEst.progress * taskEst.seconds || 0),
          0
        ) /
        story.progressList.reduce(
          (sum, taskEst) => (sum || 0) + (taskEst.seconds || 0),
          0
        );
      return story;
    };

    const estimateEpic = epic => {
      const issuesEst = epic.issues.map(estimateIssue).filter(Boolean);
      const epicEst = issuesEst.reduce(
        (sum, est) => ({
          cost: (sum.cost || 0) + (est.cost || 0),
          seconds: (sum.seconds || 0) + (est.seconds || 0),
          hasCostErrors: sum.hasCostErrors || est.hasCostErrors || false,
        }),
        { cost: 0, seconds: 0, hasCostErrors: false }
      );
      return epicEst;
    };

    const showEpicEstimate = epic => {
      const est = estimateEpic(epic);
      const Summary = styled('div')`
        padding: 20px 8px;
        background-color: #d4d4d4;
        margin-bottom: 16px;
        margin-top: 24px;
        border-radius: 4px;
        color: #3c3c3c;
      `;
      return (
        <Summary>
          <h4>{epic.name || epic.summary || `id: ${epic.id}`}</h4>
          {`Суммарная стоимость: ${Math.round(estimateEpic(epic).cost)} р. ${
            estimateEpic(epic).hasCostErrors ? '(посчитано с ошибками)' : ''
          } Суммарное время: ${Math.round(
            estimateEpic(epic).seconds / 60 / 60
          )} часов`}
        </Summary>
      );
    };

    const onTaskPayment = (issue, estimateIssue) => () => {
      const key = this.state.currentProject.key;
      this.setState(
        {
          status: `fetching for ${key}...`,
          inspectedObject: undefined,
          currentProject: undefined,
        },
        async () => {
          const { projectsCollection } = await makeIssuePayment(
            issue,
            estimateIssue,
            key
          );
          this.setState({
            projects: projectsCollection,
            status: `${key} is ready`,
            currentProject: projectsCollection.find(proj => proj.key === key),
          });
        }
      );
    };

    return (
      <div key="hz">
        {epic.issues && epic.issues.length ? (
          <div>
            {showEpicEstimate(epic)}
            <div>
              {epic.issues.filter(issue => !issue.disabled).map(issue => (
                <Contaner key={issue.id}>
                  <Issue
                    issue={issue}
                    onClick={inspectedObject =>
                      this.setState({ inspectedObject })
                    }
                    calcEstimate={estimateIssue}
                    onMakePayment={onTaskPayment(issue, estimateIssue)}
                  />

                  {issue.fields.subtasks.length ? (
                    <div style={{ marginLeft: 16, fontSize: 14 }}>
                      {sortIssues(issue.fields.subtasks, estimateIssue).map(task => (
                        <Issue
                          key={task.id}
                          issue={task}
                          subtask
                          onClick={inspectedObject =>
                            this.setState({ inspectedObject })
                          }
                          calcEstimate={estimateIssue}
                          onMakePayment={onTaskPayment(task, estimateIssue)}
                        />
                      ))}
                    </div>
                  ) : null}
                </Contaner>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  updState = obj => () => this.setState({ ...obj });

  renderTitle = () => {
    const { status, isStored } = this.state;
    const Ver = styled('span')`
      opacity: 0.8;
    `
    return (
      <header className="App-header">
        <h2 className="App-title">Welcome to Skipp API <Ver>{`ver ${appPackage.version}`}</Ver></h2>
        <p className="App-status">{status}</p>
        <input className="App-search" type="text" placeholder="search..." />
      </header>
    );
  };

  handleProjSelect = proj => () => {
    const key = proj.key;
    this.setState(
      {
        status: `fetching for ${key}...`,
        inspectedObject: undefined,
        currentProject: undefined,
      },
      this.fetchProjectData(proj.key, { inspectedObject: proj })
    );
  };

  renderProjects = () => (
    <div className="contaner-vert">
      {this.state.projects &&
        this.state.projects.map(proj => (
          <button
            key={proj.id}
            onClick={this.handleProjSelect(proj)}
            style={{
              margin: 8,
              border: 'solid 1px rgb(50,50,50)',
              borderRadius: 4,
              fontSize: 12,
              width: 150,
              padding: 4,
              cursor: 'pointer',
            }}
          >
            <img
              src={proj.avatarUrls['48x48']}
              alt="ava"
              style={{ width: 50 }}
            />
            <div>{proj.name}</div>
          </button>
        ))}
    </div>
  );

  renderProjEpics = () => {
    const { currentProject } = this.state;
    if (!currentProject) return null;

    const epics = currentProject.boards[0].epics;
    if (!epics) return null;

    const Contaner = styled('div')`
      padding: 16px;
    `;

    return (
      <Contaner>
        {epics.map(epic => this.renderIssues(epic.issues, epic))}
        {this.renderIssues(currentProject.boards[0].backlog.issues, {
          issues: currentProject.boards[0].backlog,
          name: 'Backlog',
        })}
      </Contaner>
    );
  };

  renderLayout = (renderProjects, renderProjEpics) => {
    return (
      <SplitPane
        split="vertical"
        minSize={180}
        maxSize={250}
        defaultSize={200}
        style={{ position: 'relative' }}
      >
        <div className="panel-vert">{renderProjects()}</div>
        <SplitPane
          split="vertical"
          minSize={180}
          maxSize={450}
          defaultSize={350}
          style={{ position: 'relative' }}
          primary="second"
        >
          <div className="panel-vert">{renderProjEpics()}</div>
          <SplitPane
            // split="horizontal"
            // primary="second"
            // allowResize={true}
            // defaultSize={200}
            // minSize={50}
            // maxSize={300}
            defaultSize="80%"
            split="horizontal"
            pane2Style={{
              overflowY: 'hidden',
              // flex: 1 1 0%;
              // position: relative;
              // outline: none;
            }}
          >
            <div className="panel-vert">
              <Inspector data={this.state.inspectedObject} />
            </div>
            <div style={{ height: '100%' }}>
              <Console
                logger={log => {
                  this.log = log;
                }}
                onClick={inspectedObject => this.setState({ inspectedObject })}
              />
            </div>
          </SplitPane>
        </SplitPane>
      </SplitPane>
    );
  };

  render() {
    return (
      <div className="App">
        {this.renderTitle()}
        {this.renderLayout(this.renderProjects, this.renderProjEpics)}

        {(this.state.epics &&
          !!this.state.epics.length && (
            <div>
              <h3>Epics:</h3>
              {true ? (
                <button onClick={this.fetchEstimates}>Запрос оценок</button>
              ) : null}
              <ul>
                {this.state.epics.map(epic => (
                  <li key={epic.id} style={{ textAlign: 'left' }}>
                    <h4>{epic.name || epic.summary || `id: ${epic.id}`}</h4>
                    {this.renderIssues(epic.issues)}
                  </li>
                ))}
              </ul>
            </div>
          )) ||
          null}
        {this.state.backlog && !!this.state.backlog.length ? (
          <div style={{ textAlign: 'left' }}>
            <h3>Backlog:</h3>
            {this.renderIssues(this.state.backlog)}
          </div>
        ) : null}
      </div>
    );
  }
}

export default App;
