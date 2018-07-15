import { GraphQLClient } from 'graphql-request';

const endpoint = 'https://api.graph.cool/simple/v1/cjjitqtxu10pn0118qlejvj0y';
const client = new GraphQLClient(endpoint, { headers: {} });
export const projectBase = 'https://skippdev.atlassian.net';

const query = `
  query get($url: String){
    data: apiv2(url: $url) {
      status
      response
    }
  }
  `;

let logRequestFn = () => {};
export const onProxiRequest = cb => {
  logRequestFn = cb;
};

export const proxiRequest = url => {
  return client
    .request(query, { url })
    .then(
      res => (res.data.status === 'Ok' ? res.data.response : res.data.status)
    )
    .then(response => {
      try {
        const data = JSON.parse(response);
        logRequestFn({
          url,
          status: 'Ok',
          time: 0,
          data,
        });
        return data;
      } catch (error) {
        return {
          error,
        };
      }
    });
  // .then(console.log);
};

// '/rest/agile/1.0/board/18'
export const getBoard = boardId =>
  proxiRequest(`/rest/agile/1.0/board/${boardId}`);

export const getAllBoards = async () => {
  const res = await proxiRequest(`/rest/agile/1.0/board`);
  const boards = res.values;
  const projects = boards.map(board => ({
    ...board.location,
    boardId: board.id,
  }));
  // console.log('​exportgetAllBoards -> boards, projects', boards, projects);
  return { boards, projects };
};

export const getBoardEpics = boardId =>
  proxiRequest(`/rest/agile/1.0/board/${boardId}/epic?`).then(
    res => res.values
  );

export const getEpicIssues = (boardId, epicId) =>
  proxiRequest(`/rest/agile/1.0/board/${boardId}/epic/${epicId}/issue?`).then(
    res => res.issues
  );

export const getBoardIssues = boardId =>
  proxiRequest(`/rest/agile/1.0/board/${boardId}/issue?`).then(
    res => res.issues
  );

// /rest/agile/1.0/board/17/epic?
export const getBacklog = boardId =>
  proxiRequest(`/rest/agile/1.0/board/${boardId}/backlog`).then(
    res => res.issues
  );

// /rest/agile/1.0/board/17/epic?
export const getNoEpicIssues = boardId =>
  proxiRequest(`/rest/agile/1.0/board/${boardId}/epic/none/issue?`).then(
    res => res.values
  );

export const getIssue = issueId =>
  proxiRequest(`/rest/agile/1.0/issue/${issueId}`);

export const getProject = projId =>
  proxiRequest(`/rest/api/2/project/${projId}`);
