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

// const localData = storage('skipp_db');
const localDbMap = {};
const projectsData = storage('skipp_projects');

// export const isDataStored = () => !!localData.get();

let boardsCollection = [];
let projectsCollection = [];

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
  // localData.clear();
  // return await fetchInitData();
  throw 'refetchData нужно переписать';
};

export const fetchProjects = async () => {
  const local = projectsData.get();
  if (local) {
    projectsCollection = local.projectsCollection;
    boardsCollection = local.boardsCollection;
    return local;
  }

  const { boards, projects } = await getAllBoards().then(
    logger.info('getAllBoards')
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

  console.log('​exportfetchProjects -> projectsCollection', projectsCollection);

  projectsData.set({
    boardsCollection,
    projectsCollection,
  });

  return {
    boardsCollection,
    projectsCollection,
  };
};

export const fetchProjectData = async key => {
  const localProjectData = storage(key);
  if (localProjectData.get()) {
    const local = localProjectData.get();
    if (local) return {
      boardsCollection,
      projectsCollection,
      epicsCollection: local.epicsCollection,
      issuesCollection: local.issuesCollection,
    };
  } else {
    localDbMap[key] = localProjectData;
  }

  const boardId = projectsCollection.find(proj => proj.key === key).boards[0].id;

  let issuesCollection = [];
  let epicsCollection = [];

  // epicsCollection =
  await multiFetch(
    boardsCollection.filter(brd => brd.id === boardId).map(board => ({
      fetch: () => getBoardEpics(board.id),
      put: epics => {
        board.epics = epics;
        epicsCollection.push(...epics);
        return epics;
      },
    }))
  );

  console.log('​boardsCollection', boardsCollection);

  // issuesCollection =
  await multiFetch(
    boardsCollection.filter(brd => brd.id === boardId).map(board => ({
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

  projectsData.set({
    boardsCollection,
    projectsCollection,
  });

  localProjectData.set({
    epicsCollection,
    issuesCollection,
  });

  localDbMap[key] = localProjectData;

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
