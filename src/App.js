import React, { Component } from 'react';
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
} from './api';

class App extends Component {
  state = {
    boards: null,
    projects: null,
    epics: null,
    backlog: null,
    status: 'loading...',
  };
  issuesIdList = [];
  async componentDidMount() {
    const { boards, projects } = await getAllBoards();
    this.setState({ boards, projects, status: 'ready' });
  }

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
    if (issue && issue.estimate) return issue.estimate;
    return null;
  };

  renderIssues = issues => {
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
                    cursor: 'pointer',
                  }}
                  title="console.log"
                  onClick={() => console.log(issue)}
                  key={issue.id}
                >
                  <h5 style={{ margin: 8 }}>
                    {`${issue.fields.summary}  [id: ${issue.id}]`}
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
                    {addEstimation(this.findEstimate(issue.id) || 0)}
                    <button
                      onClick={this.updIssue(issue.id)}
                      style={{
                        margin: 4,
                        fontSize: 10,
                      }}
                    >
                      ?
                    </button>
                    {storeId(issue.id)}
                  </h5>
                  {issue.fields.description && (
                    <small>{issue.fields.description}</small>
                  )}
                  {issue.fields.subtasks.length ? (
                    <div style={{ marginLeft: 50, fontSize: 12 }}>
                      {issue.fields.subtasks.map(task => (
                        <div key={task.id}>
                          {`${task.fields.summary} ${task.fields.description ||
                            ''} [id: ${task.id}]`}
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
                          <button
                            onClick={this.updIssue(task.id)}
                            style={{
                              margin: 4,
                              fontSize: 10,
                            }}
                          >
                            ?
                          </button>
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

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <h2 className="App-title">Welcome to Jira API</h2>
        </header>
        <p className="App-intro">{this.state.status}</p>
        {/* <button
          // onClick={() => proxiRequest('/rest/api/2/project')}
          onClick={() => proxiRequest('/rest/agile/1.0/board')}
        >
          proxiRequest
        </button>
        <button onClick={() => getAllBoards()}>getBoard</button> */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
          }}
        >
          {this.state.projects &&
            this.state.projects.map(proj => (
              <button
                key={proj.projectId}
                onClick={this.getBoard(proj.boardId)}
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
                  src={`https://skippdev.atlassian.net${proj.avatarURI}`}
                  alt="ava"
                  style={{ width: 50 }}
                />
                <div>{proj.name}</div>
              </button>
            ))}
        </div>
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
