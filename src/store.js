import {
  getBoard,
  getAllBoards,
  getProject,
  getBoardEpics,
  getBoardIssues,
  getEpicIssues,
  getNoEpicIssues,
  getBacklog,
  getIssue,
} from './api';
import { storage } from './utils/localStorage';

const localData = storage('skipp_db');

export const isDataStored = () => !!localData.get();

let boardsCollection = [];
let projectsCollection = [];
let issuesCollection = [];
let epicsCollection = [];

export const INSPECT_TYPE = {
  PROJECT: 'PROJECT',
  BOARD: 'BOARD',
  EPIC: 'EPIC',
  STORY: 'STORY',
  TASK: 'TASK',
  USER: 'USER',
};

const keyShouldExist = key => {
  throw `Rate for user with key ${key} isn't set`;
};

export const contributorRates = key =>
  ({
    vadosgrybyk: 1000,
    pv4pv4: 1000,
    ozmo: 1200,
  }[key] || keyShouldExist(key));

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
      if (data.length > 1) {
        throw 'нельзя передавать в logger.info более одного параметра';
      }
      return data[0];
    };
  },
  xinfo() {
    return (...data) => {
      if (data.length > 1) {
        throw 'нельзя передавать в logger.info более одного параметра';
      }
      return data[0];
    };
  },
};

const multiFetch = async fetchList =>
  await Promise.all(fetchList.map(async item => item.put(await item.fetch())));

export const refetchData = async () => {
  localData.clear();
  return await fetchInitData();
};

export const fetchInitData = async () => {
  const local = localData.get();
  console.log('​exportfetchInitData -> local', local);
  if (local) return local;

  const { boards, projects } = await getAllBoards().then(
    logger.xinfo('getAllBoards')
  );
  boardsCollection = boards;

  projectsCollection = await multiFetch(
    projects.map(proj => ({
      fetch: () => getProject(proj.projectId),
      put: resp => ({
        ...resp,
        inspectType: INSPECT_TYPE.PROJECT,
        boards: boardsCollection.filter(
          b => `${b.location.projectId}` === resp.id
        ),
      }),
    }))
  );

  // epicsCollection =
  await multiFetch(
    boardsCollection.map(board => ({
      fetch: () => getBoardEpics(board.id),
      put: epics => {
        board.epics = epics;
        epicsCollection.push(...epics);
        return epics;
      },
    }))
  );

  // issuesCollection =
  await multiFetch(
    boardsCollection.map(board => ({
      fetch: () => getBoardIssues(board.id),
      put: issues => {
        board.issues = issues;
        issuesCollection.push(...issues);
        // logger.log(`fetched ${issues ? issues.length : 'no one'} issues`, issues);
        return issues;
      },
    }))
  );

  // link issues to epic
  epicsCollection.forEach(epic => {
    const issues = issuesCollection.filter(issue => {
      const relatedEpic = issue.fields.epic || { id: null };
      if (!relatedEpic.id) return false;
      return relatedEpic.id === epic.id;
    });
    epic.issues = issues;
  });

  // update issues
  await multiFetch(
    issuesCollection.map(issue => ({
      fetch: () => getIssue(issue.id),
      put: res => {
        Object.assign(issue, { ...res });
      },
    }))
  );

  // update subtasks
  issuesCollection.forEach(issue => {
    if (!issue.fields.subtasks.length) return;
    issue.fields.subtasks.forEach(task => {
      const fullIssue = issuesCollection.find(item => item.id === task.id);
      Object.assign(task, { ...fullIssue });
    });
  });

  localData.set({
    boardsCollection,
    projectsCollection,
    epicsCollection,
    issuesCollection,
  });

  return {
    boardsCollection,
    projectsCollection,
    epicsCollection,
    issuesCollection,
  };
};

export const sortProjByIssues = (pr1, pr2) => {
  const brd1 = pr1.boards[0] || { issues: [] };
  const brd2 = pr2.boards[0] || { issues: [] };
  const iss1 = brd1.issues.length;
  const iss2 = brd2.issues.length;
  return iss2 - iss1;
};
