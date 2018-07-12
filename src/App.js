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
} from './api';

class App extends Component {
  state = {
    boards: null,
    projects: null,
    epics: null,
    backlog: null,
    status: 'loading...',
  };
  async componentDidMount() {
    const { boards, projects } = await getAllBoards();
    this.setState({ boards, projects, status: 'ready' });
  }

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
    this.setState({ status: 'loading epics...' }, async () => {
      // const board = await getBoard(id);
      const epics = await getBoardEpics(id);

      this.setState({ epics, status: 'ready' });
      console.log('​App -> board', epics);
      if (epics.length) await this.getIssues(id);
      await this.getBacklog(id);
    });
  };

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <h2 className="App-title">Welcome to Jira API</h2>
        </header>
        <p className="App-intro">{this.state.status}</p>
        <button
          // onClick={() => proxiRequest('/rest/api/2/project')}
          onClick={() => proxiRequest('/rest/agile/1.0/board')}
        >
          proxiRequest
        </button>
        <button onClick={() => getAllBoards()}>getBoard</button>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
          }}
        >
          {this.state.projects &&
            this.state.projects.map(proj => (
              <button
                key={proj.id}
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
              <h3>Эпики:</h3>
              <ul>
                {this.state.epics.map(epic => (
                  <li key={epic.id} style={{ textAlign: 'left' }}>
                    <h4>{epic.name || epic.summary || `id: ${epic.id}`}</h4>
                    {epic.issues && epic.issues.length ? (
                      <div>
                        <h5>issues:</h5>
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
                              onClick={() => console.log(issue)}
                            >
                              {`${issue.fields.summary} ${issue.fields.description || ''}`}
                              {issue.fields.subtasks.length ? (
                                <div style={{ marginLeft: 50, fontSize: 12 }}>
                                  {issue.fields.subtasks.map(task => (
                                    <div key={task.id}>{`${task.fields.summary} ${task.fields.description || ''}`}</div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )) ||
          null}
      </div>
    );
  }
}

export default App;
