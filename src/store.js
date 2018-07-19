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
  getContributors,
  getStoredIssues,
  makePayment,
} from './api';
import { storage } from './utils/localStorage';

const projectsData = storage('skipp_projects');
const localProjMap = {};

// export const isDataStored = () => !!localData.get();

let boardsCollection = [];
let projectsCollection = [];
let storedIssuesCollection = [];

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

let contributorsCollection = [];
export const contributorRates = key =>
  contributorsCollection.find(cont => cont.key === key) || keyShouldExist(key);

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
  projectsData.clear();
  Object.keys(localProjMap).map(key => localProjMap[key].clear());
  return await fetchProjects();
};

export const fetchProjects = async () => {
  // const local = projectsData.get();
  // if (local) {
  //   projectsCollection = local.projectsCollection;
  //   boardsCollection = local.boardsCollection;
  //   contributorsCollection = local.contributorsCollection;
  //   return local;
  // }
  contributorsCollection = await getContributors();
  storedIssuesCollection = await getStoredIssues();
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

  // projectsData.set({
  //   boardsCollection,
  //   projectsCollection,
  //   contributorsCollection,
  // });

  return {
    boardsCollection,
    projectsCollection,
  };
};

export const fetchProjectData = async key => {
  const localProjectData = storage(key);
  localProjMap[key] = localProjectData;
  // if (localProjectData.get()) {
  //   const local = localProjectData.get();
  //   if (local)
  //     return {
  //       boardsCollection,
  //       projectsCollection,
  //       epicsCollection: local.epicsCollection,
  //       issuesCollection: local.issuesCollection,
  //     };
  // }

  const boardId = projectsCollection.find(proj => proj.key === key).boards[0]
    .id;

  let issuesCollection = [];
  let backlogCollection = [];
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

  // backlogCollection =
  await multiFetch(
    boardsCollection.filter(brd => brd.id === boardId).map(board => ({
      fetch: () => getBacklog(board.id),
      put: items => {
        board.backlog = items;
        backlogCollection.push(...items);
        return items;
      },
    }))
  );

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
        if (res.fields.resolution && res.fields.resolution.name !== 'Done') {
          res.disabled = true;
        }

        const payedIssue = storedIssuesCollection.find(
          iss => iss.key === res.key
        );
        if (payedIssue) {
          console.log('​payedIssue', payedIssue);
          res.paymentAmount = payedIssue.paymentAmount;
          res.paymentCurrency = payedIssue.paymentCurrency;
          res.paymentDate = payedIssue.paymentDate;
        }
        Object.assign(issue, { ...res });
      },
    }))
  );

  // update backlog issues
  await multiFetch(
    backlogCollection.map(issue => ({
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

  // update subtasks
  backlogCollection.forEach(issue => {
    if (!issue.fields.subtasks.length) return;
    issue.fields.subtasks.forEach(task => {
      const fullIssue = backlogCollection.find(item => item.id === task.id);
      Object.assign(task, { ...fullIssue });
    });
  });

  console.log('backlogCollection', backlogCollection);
  console.log('boardsCollection', boardsCollection);
  console.log('projectsCollection', projectsCollection);

  // projectsData.set({
  //   boardsCollection,
  //   projectsCollection,
  // });

  // localProjectData.set({
  //   epicsCollection,
  //   issuesCollection,
  // });

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

export const makeIssuePayment = (issue, estimateFn, key) => {
  const est = estimateFn(issue);
  const paymentList = [
    {
      key: issue.key,
      paymentAmount: est.cost,
      paymentCurrency: 'rub',
      paymentDate: new Date().toISOString(),
    },
  ];
  return makePayment(paymentList).then(issues => {
    storedIssuesCollection = issues;
    return fetchProjectData(key);
  });
};
