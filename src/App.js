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
  projectBase,
} from './api';

import {
  fetchInitData,
  isDataStored,
  refetchData,
  sortProjByIssues,
  contributorRates,
} from './store';
import Inspector from './components/inspector';
import Console from './components/console';
import styled from 'react-emotion';

// onProxiRequest(console.log);

const exec = (...fn) => fn.forEach(f => f());

const UserAva = ({ user, onClick }) => {
  if (!user) {
    const NoAva = styled('div')`
      width: 16px;
      height: 16px;
      border-radius: 16px;
      background-color: #ececec;
      border: 1px solid #cecece;
    `;

    return <NoAva title="Исполнитель не назначен" />;
  }

  const Ava = styled('img')`
    width: 16px;
    height: 16px;
    border-radius: 16px;
    cursor: pointer;
    &:hover: border: 1px solid red;
  `;

  return (
    <Ava
      src={user.avatarUrls['16x16']}
      alt="ava"
      title={user.displayName}
      onClick={onClick}
    />
  );
};

const Issue = ({
  issue,
  subtask,
  calcEstimate = () => null,
  onClick = () => {},
}) => {
  const Contaner = styled('div')(
    {
      padding: 4,
      margin: 2,
      width: 'auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    props => ({
      opacity: props.subtask ? 0.7 : 0.8,
    })
  );
  const Title = styled('h5')`
    margin: 8px;
    cursor: pointer;
  `;

  const keyBadge = ({ key } = {}) => {
    if (!key) return null;
    const Key = styled('a')`
      color: hsl(0, 0%, 34%);
      margin: 0px 16px;
      font-size: 10px;
      float: right;
      text-decoration: none;
      border: 1px solid #9e9e9e;
      padding: 2px;
      border-radius: 2px;
    `;
    const link = `${projectBase}/browse/${key}`;
    return (
      <Key href={link} target="_blank">
        {key}
      </Key>
    );
  };

  const estimation = est => {
    if (!est) return null;
    const Label = styled('span')`
      opacity: 0.8;
      font-size: 12px;
    `;

    const StatusBadge = styled('span')`
      font-size: 10px;
      border: 1px solid #cacaca;
      background-color: #e8e8e8;
      border-radius: 2px;
      padding: 2px;
      margin: 0px 4px;
      color: #3a3a3a;
    `;

    const Value = styled('span')`
      font-size: 12px;
      font-weight: 600;
    `;

    if (est.error)
      return (
        <div title={est.error}>
          <Label>Ошибка!</Label>
        </div>
      );
    const hours = Math.round((4 * est.seconds) / 60 / 60) / 4;
    const tip = `прогресс: ${Math.round(100 * est.progress)}%`;
    const costString = `стоимость ${Math.round(est.cost)}р ${
      est.hasCostErrors ? '<- ошибка!' : ''
    }`;
    return (
      <div>
        <StatusBadge title={tip}>
          {est.statusName}
          {` (${Math.round(est.progress * 100)}%)`}
        </StatusBadge>
        <Label>Оценка:</Label> <Value title={costString}>{hours}</Value>
      </div>
    );
  };

  const totalEstimation = est => {
    if (!est.cost) return null;
    const Card = styled('div')`
      font-size: 12px;
      margin: 0px 80px;
      color: #313131;
      background-color: #ececec;
      padding: 2px 10px;
      border-radius: 12px;
      flex-grow: 1;
      text-align: center;
    `;
    const costString = `∑ ${Math.round(est.cost)} р.`;
    const errorString = `${est.hasCostErrors ? ' (!!!)' : ''}`;
    return (
      <Card title={est.hasCostErrors ? 'есть ошибки' : ''}>
        {costString}
        {errorString}
      </Card>
    );
  };

  const SpcFx = styled('div')`
    width: 1px;
    flex-grow: 1;
  `;

  return (
    <Contaner subtask={subtask}>
      {subtask && (
        <UserAva
          user={issue.fields.assignee}
          onClick={() => onClick(issue.fields.assignee)}
        />
      )}
      <Title onClick={() => onClick(issue)}>{issue.fields.summary}</Title>
      {!subtask ? totalEstimation(calcEstimate(issue)) || <SpcFx /> : <SpcFx />}
      {estimation(calcEstimate(issue))}
      {keyBadge(issue)}
    </Contaner>
  );
};

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
    this.log({ text: 'App did mount' });
    onProxiRequest(this.fetchLog);
    const {
      boardsCollection,
      projectsCollection,
      epicsCollection,
      issuesCollection,
    } = await fetchInitData();

    const projects = projectsCollection.sort(sortProjByIssues);
    // boardsCollection.forEach(board => this.addUserRates(board.issues));

    this.setState({
      projects,
      status: 'ready',
      isStored: isDataStored(),
      currentProject: projects[0],
    });
  }

  fetchLog = info =>
    this.log({ text: `fetching ${info.url}`, state: info.data });

  refetchData = async () => {
    this.setState(
      { projects: null, status: 'reloading...', isStored: false },
      async () => {
        this.log({ text: 'refetching...' });
        const {
          boardsCollection,
          projectsCollection,
          epicsCollection,
          issuesCollection,
        } = await refetchData();

        const projects = projectsCollection.sort(sortProjByIssues);
        // boardsCollection.forEach(board => this.addUserRates(board.issues));

        this.setState({
          projects,
          status: 'ready',
          isStored: isDataStored(),
          currentProject: projects[0],
        });
        this.log({ text: 'refetching done' });
        this.log({ text: 'projects', state: { projects } });
        this.log({ text: 'boardsCollection', state: { boardsCollection } });
        this.log({ text: 'epicsCollection', state: { epicsCollection } });
        this.log({ text: 'issuesCollection', state: { issuesCollection } });
      }
    );
  };

  // addUserRates = issues => {
  //   issues.forEach(({ assignee }) => {
  //     if (!assignee || assignee.rate) return;
  //     let rate;
  //     try {
  //       rate = contributorRates(assignee.key);
  //     } catch (error) {
  //       rate = 'ОШИБКА РЕЙТ ПОЛЬЗОВАТЕЛЯ НЕ ЗАДАН';
  //     }
  //     Object.assign(assignee, { rate });
  //   });
  // };

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
    const epic = {
      issues,
      estimate: 0,
    };

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
          const rate = contributorRates(key);
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
      if (!issue || !issue.fields) return null;
      const hasSubtasks = issue.fields.subtasks && issue.fields.subtasks.length;
      if (!hasSubtasks) {
        return estimateTask(issue);
      }
      const story = issue.fields.subtasks.reduce(reduceSubtasks, {});
      story.progress =
        story.progressList.reduce(
          (sum, taskEst) => sum + taskEst.progress * taskEst.seconds,
          0
        ) /
        story.progressList.reduce((sum, taskEst) => sum + taskEst.seconds, 0);
      return story;
    };

    return (
      <div>
        {epic.issues && epic.issues.length ? (
          <div>
            <i>issues:</i>
            <div>
              {epic.issues.map(issue => (
                <Contaner key={issue.id}>
                  <Issue
                    issue={issue}
                    onClick={inspectedObject =>
                      this.setState({ inspectedObject })
                    }
                    calcEstimate={estimateIssue}
                  />

                  {issue.fields.subtasks.length ? (
                    <div style={{ marginLeft: 16, fontSize: 14 }}>
                      {issue.fields.subtasks.map(task => (
                        <Issue
                          issue={task}
                          subtask
                          onClick={inspectedObject =>
                            this.setState({ inspectedObject })
                          }
                          calcEstimate={estimateIssue}
                        />
                      ))}
                    </div>
                  ) : null}
                </Contaner>
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
        this.state.projects.map(proj => (
          <button
            key={proj.id}
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
