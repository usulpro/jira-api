import React, { Component } from 'react';
import SplitPane from 'react-split-pane';
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
  isDataStored,
  refetchData,
  sortProjByIssues,
} from './store';
import Inspector from './components/inspector';
import Console from './components/console';

// onProxiRequest(console.log);

const exec = (...fn) => fn.forEach(f => f());

class App extends Component {
  state = {
    boards: null,
    projects: null,
    epics: null,
    backlog: null,
    status: 'loading...',
    isStored: isDataStored(),
    inspectedObject: undefined,
    currentProject: undefined,
  };
  issuesIdList = [];

  async componentDidMount() {
    // const { boards, projects } = await getAllBoards();
    this.log({ text: 'App componentDidMount' });
    onProxiRequest(this.fetchLog);
    const {
      boardsCollection,
      projectsCollection,
      epicsCollection,
      issuesCollection,
    } = await fetchInitData();

    console.log(
      '​App -> asynccomponentDidMount -> projectsCollection',
      projectsCollection
    );

    this.setState({
      projects: projectsCollection,
      status: 'ready',
      isStored: isDataStored(),
    });
  }

  /*
  logRequestFn({
          url,
          status: 'Ok',
          time: 0,
        });
  */
  fetchLog = info => this.log({ text: info.url });

  refetchData = async () => {
    this.setState(
      { projects: null, status: 'reloading...', isStored: false },
      async () => {
        const {
          boardsCollection,
          projectsCollection,
          epicsCollection,
          issuesCollection,
        } = await refetchData();
        this.setState({
          projects: projectsCollection,
          status: 'ready',
          isStored: isDataStored(),
        });
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

  renderIssues = issues => {
    console.log('renderIssues -> ​issues', issues);

    const epic = {
      issues,
      estimate: 0,
    };
    const addEstimation = est => {
      epic.estimate = epic.estimate + est;
      return null;
    };

    const storeId = (issueId, parentId) => {
      const ind = this.issuesIdList.findIndex(v => v.issueId === issueId);
      if (ind >= 0) {
        // this.issuesIdList[ind] = { issueId, estimate: 0, parentId };
        return null;
      }
      this.issuesIdList.push({ issueId, estimate: 0, parentId });
      return null;
    };

    return (
      <div>
        {epic.issues && epic.issues.length ? (
          <div>
            <i>issues:</i>
            <div>
              {epic.issues.map(issue => (
                <div
                  style={{
                    border: '1px solid rgb(150, 150, 150)',
                    borderRadius: 2,
                    padding: 4,
                    margin: 2,
                    width: 'auto',
                  }}
                  title="console.log"
                  key={issue.id}
                >
                  <h5 style={{ margin: 8 }}>
                    <a
                      href={`https://skippdev.atlassian.net/browse/${
                        issue.key
                      }`}
                      target="blank"
                    >
                      {`${issue.fields.summary}  [id: ${issue.id}]`}
                    </a>
                    <span
                      style={{
                        backgroundColor: 'rgb(200,200,200)',
                        color: 'rgb(50,50,50,)',
                        fontWeight: 400,
                        margin: 8,
                        padding: 6,
                      }}
                    >
                      {issue.key}
                    </span>
                    {`Оценка: ${Math.round(
                      this.findEstimate(issue.id) / 60 / 60
                    )} ч`}
                    {/* {addEstimation(this.findEstimate(issue.id) || 0)} */}
                    {storeId(issue.id)}
                  </h5>
                  {issue.fields.subtasks.length ? (
                    <div style={{ marginLeft: 50, fontSize: 12 }}>
                      {issue.fields.subtasks.map(task => (
                        <div key={task.id}>
                          <a
                            href={`https://skippdev.atlassian.net/browse/${
                              task.key
                            }`}
                            target="blank"
                          >
                            {`${task.fields.summary} [id: ${task.id}]`}
                          </a>
                          {storeId(task.id, issue.id)}
                          <span
                            style={{
                              backgroundColor: 'rgb(200,200,200)',
                              color: 'rgb(50,50,50,)',
                              fontWeight: 400,
                              margin: 3,
                              padding: 2,
                            }}
                          >
                            {task.key}
                          </span>
                          {`Оценка: ${Math.round(
                            this.findEstimate(task.id) / 60 / 60
                          )} ч`}
                          {addEstimation(this.findEstimate(task.id) || 0)}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <div
              style={{
                border: '1px solid rgb(50,50,50)',
                borderRadius: 4,
                padding: 16,
                backgroundColor: 'rgb(200,250,200)',
              }}
            >
              <h4>Суммарная оценка по разделу:</h4>
              <p>
                {`${Math.round((100 * epic.estimate) / 60 / 60) / 100} часов`}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  updState = obj => () => this.setState({ ...obj });

  renderTitle = () => {
    const { status, isStored } = this.state;
    return (
      <header className="App-header">
        <h2 className="App-title">Welcome to Skipp API</h2>
        {isStored ? (
          <p className="App-status">
            data stored locally{' '}
            <button className="Btn-refetch" onClick={this.refetchData}>
              refetch
            </button>{' '}
          </p>
        ) : (
          <p className="App-status">{status}</p>
        )}
        <input className="App-search" type="text" placeholder="search..." />
      </header>
    );
  };

  renderProjects = () => (
    <div className="contaner-vert">
      {this.state.projects &&
        this.state.projects.sort(sortProjByIssues).map(proj => (
          <button
            key={proj.projectId}
            onClick={this.updState({
              inspectedObject: proj,
              currentProject: proj,
            })}
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

    return (
      <ul>
        {epics.map(epic => (
          <li key={epic.id} style={{ textAlign: 'left' }}>
            <h4>{epic.name || epic.summary || `id: ${epic.id}`}</h4>
            {this.renderIssues(epic.issues)}
          </li>
        ))}
      </ul>
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
          >
            <div className="panel-vert">
              <Inspector data={this.state.inspectedObject} />
            </div>
            <div className="panel-vert">
              <Console
                logger={log => {
                  this.log = log;
                }}
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
