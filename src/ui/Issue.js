import React from 'react';
import styled from 'react-emotion';

import { UserAva } from './UserAva';
import { projectBase } from '../api';

const hours = seconds => Math.round((4 * seconds) / 60 / 60) / 4;

const Container = styled('div')(
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

const SpcFx = styled('div')`
  width: 1px;
  flex-grow: 1;
`;

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
  const hh = hours(est.seconds);
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
      <Label>Оценка:</Label>{' '}
      <Value title={costString}>{hh || 'нет оценки'}</Value>
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

const freeDone = issue => {
  const Card = styled('div')`
    font-size: 13px;
    color: #313131;
    padding: 3px 4px;
    text-align: center;
  `;
  const Label = styled('span')`
    opacity: 0.9;
  `;
  const title = `(Статус: ${issue.fields.status.name})`;
  return (
    <Card>
      <Label title={title}>{`Выполнено бесплатно`}</Label>
    </Card>
  );
};

const alreadyPaid = ({ paymentAmount, paymentDate, paymentCurrency }) => {
  const Card = styled('div')`
    font-size: 13px;
    color: #313131;
    padding: 3px 4px;
    text-align: center;
  `;

  const Label = styled('span')`
    opacity: 0.9;
  `;

  const DateLabel = styled('span')`
    opacity: 0.8;
    font-size: 12px;
  `;

  const Value = styled('span')`
    font-weight: 600;
  `;

  return (
    <Card>
      <Label>{`Оплачено: `}</Label>
      <Value>{`${paymentAmount} ${paymentCurrency}. `}</Value>
      <DateLabel>{`Дата: ${new Date(paymentDate).toDateString()}`}</DateLabel>
    </Card>
  );
};

const makePayment = (est, issue, callback) => {
  const Button = styled('button')`
    background-color: #d4d4d4;
    border-radius: 4px;
    border: 1px solid #868686;
    color: #353535;
    padding: 3px 8px;
    cursor: pointer;
  `;
  const title = `За ${hours(est.seconds)} ч. Контрибьютору ${
    issue.fields.assignee.displayName
  } (Статус: ${issue.fields.status.name})`;
  return (
    <Button title={title} onClick={callback}>{`оплатить ${est.cost}`}</Button>
  );
};

const paymentStatus = (issue, calcEstimate, onMakePayment, subtask) => {
  if (issue.paymentAmount) {
    return (
      <React.Fragment>
        <SpcFx />
        {alreadyPaid(issue)}
      </React.Fragment>
    );
  }
  if (
    issue.fields.status &&
    issue.fields.status.name === 'Done' &&
    issue.fields.timetracking.originalEstimateSeconds === 0
  ) {
    return (
      <React.Fragment>
        <SpcFx />
        {freeDone(issue)}
      </React.Fragment>
    );
  }
  if (issue.fields.status && issue.fields.status.name === 'Done') {
    return (
      <React.Fragment>
        <SpcFx />
        {makePayment(calcEstimate(issue), issue, onMakePayment)}
      </React.Fragment>
    );
  }
  return (
    <React.Fragment>
      {!subtask ? totalEstimation(calcEstimate(issue)) || <SpcFx /> : <SpcFx />}
      {estimation(calcEstimate(issue))}
    </React.Fragment>
  );
};

const issueCase = {
  isDone(iss) {
    return iss.fields.status && iss.fields.status.name === 'Done';
  },
  isFree(iss) {
    return (
      iss.fields.timetracking &&
      iss.fields.timetracking.originalEstimateSeconds === 0
    );
  },
  isPaid(iss) {
    return iss.paymentAmount || (this.isDone(iss) && this.isFree(iss));
  },
  isError: calcEstimate => iss => {
    try {
      const isOk =
        iss.fields.assignee.key &&
        iss.fields.timetracking.originalEstimateSeconds >= 0 &&
        calcEstimate(iss);
      return !isOk;
    } catch (error) {
      return true;
    }
  },
  sortByPaidDate: (iss1, iss2) => {
    try {
      const D1 = new Date(iss1.paymentDate);
      const D2 = new Date(iss2.paymentDate);
      return D2 - D1;
    } catch (error) {
      return 0;
    }
  },
};

export const sortIssues = (issues, calcEstimate) => {
  const notIn = list => iss => !list.includes(iss);
  const paidIssues = issues.filter(issueCase.isPaid, issueCase).sort(issueCase.sortByPaidDate);
  const notPaidIssues = issues.filter(notIn(paidIssues));
  const doneIssues = notPaidIssues.filter(issueCase.isDone, issueCase);
  const notDoneIssues = notPaidIssues.filter(notIn(doneIssues));
  const errorIssues = notDoneIssues.filter(
    issueCase.isError(calcEstimate),
    issueCase
  );
  const progressIssues = notDoneIssues.filter(notIn(errorIssues));

  const newIssues = [
    ...doneIssues,
    ...errorIssues,
    ...progressIssues,
    ...paidIssues,
  ];
  if (newIssues.length !== issues.length) throw new Error('sorting goes wrong');
  return newIssues;
};

export const Issue = ({
  issue,
  subtask,
  calcEstimate = () => null,
  onClick = () => {},
  onMakePayment = () => console.log(calcEstimate(issue)),
}) => {
  if (issue.disabled) return null;

  return (
    <Container subtask={subtask}>
      {subtask && (
        <UserAva
          user={issue.fields.assignee}
          onClick={() => onClick(issue.fields.assignee)}
        />
      )}
      <Title onClick={() => onClick(issue)}>{issue.fields.summary}</Title>
      {paymentStatus(issue, calcEstimate, onMakePayment, subtask)}
      {keyBadge(issue)}
    </Container>
  );
};
