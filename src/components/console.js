import React from 'react';
import PropTypes from 'prop-types';
import styled, { css } from 'react-emotion';

const Panel = styled('div')`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  text-align: left;
  padding: 4px;
  font-size: 12px;
`;

const Line = styled('div')`
  width: 100%;
  height: 16px;
`;

export default class Console extends React.Component {
  static propTypes = {
    logger: PropTypes.func,
  }
  static defaultProps = {
    logger: () => {}
  }
  state = {
    logs: [
      {
        text: 'init',
      },
    ],
  };
  componentDidMount() {
    this.addToLog({text: 'Add did mount'})
    this.props.logger(this.addToLog)
  }
  addToLog = log => {
    const { logs } = this.state;
    logs.push(log);
    this.setState({ logs });
  };
  render() {
    return (
      <Panel>{this.state.logs.map(item => <Line>{item.text}</Line>)}</Panel>
    );
  }
}
