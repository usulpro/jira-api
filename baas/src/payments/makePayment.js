import { fromEvent } from 'graphcool-lib';

async function createIssue(endpoint, variables) {
  const mutation = `
    mutation createIssue(
      $key: String!
      $paymentAmount: Int!
      $paymentCurrency: String!
      $paymentDate: DateTime!
    ) {
      createIssue(
        key: $key
        paymentAmount: $paymentAmount
        paymentCurrency: $paymentCurrency
        paymentDate: $paymentDate
      ) {
        id
      }
    }
  `;
  return endpoint.request(mutation, variables).then(r => r.id);
}

async function allIssues(endpoint) {
  const query = `
    query Info {
      issues: allIssues {
        key
        paymentAmount
        paymentDate
        paymentCurrency
      }
    }
  `;
  return endpoint.request(query).then(r => r.issues);
}

const multiFetch = async fetchList =>
  await Promise.all(fetchList.map(async item => item.put(await item.fetch())));

export default async event => {
  const graphcool = fromEvent(event);
  const endpoint = graphcool.api('simple/v1');
  const { paymentList } = event.data;

  if (!paymentList || !paymentList.length) {
    return {
      error: 'no payments specified',
    };
  }

  const response = await multiFetch(
    paymentList.map(({ key, paymentAmount, paymentCurrency, paymentDate }) => ({
      fetch: () =>
        createIssue(endpoint, {
          key,
          paymentAmount,
          paymentCurrency,
          paymentDate,
        }),
      put: id => {
        return { id, key };
      },
    }))
  );

  const issues = await allIssues(endpoint);

  return {
    data: {
      status: 'Ok',
      issues,
    },
  };
};
