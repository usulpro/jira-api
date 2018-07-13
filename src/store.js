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

let boardsCollection = [];
let projectsCollection = [];
let issuesCollection = [];
let epicsCollection = [];

const logger = {
  enabled: true,
  log(...info) {
    if (this.enabled) {
      console.log(...info);
    }
  },
  info(...message) {
    return (...data) => {
      if (this.enabled) {
        console.log(...message, ...data);
      }
      return data;
    };
  },
};

export const fetchInitData = async () => {
  const { boards, projects } = await getAllBoards().then(logger.info('getAllBoards'));
  boardsCollection = boards;
  projectsCollection = projects;

  // this.setState({ boards, projects, status: 'ready' });
};
