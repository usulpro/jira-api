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
}

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
        boards: boardsCollection.filter(
          b => `${b.location.projectId}` === resp.id
        ),
      }),
    }))
  );

  epicsCollection = await multiFetch(
    boardsCollection.map(board => ({
      fetch: () => getBoardEpics(board.id),
      put: epics => {
        board.epics = epics;
        return epics;
      },
    }))
  );

  issuesCollection = await multiFetch(
    boardsCollection.map(board => ({
      fetch: () => getBoardIssues(board.id),
      put: issues => {
        board.issues = issues;
        // logger.log(`fetched ${issues ? issues.length : 'no one'} issues`, issues);
        return issues;
      },
    }))
  );

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
