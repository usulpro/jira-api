import React from 'react';
import PropTypes from 'prop-types';
import styled, { css } from 'react-emotion';

const Panel = styled('div')`
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const Header = styled('header')({
  color: 'white',
  backgroundColor: 'hsl(0,0%,50%)',
  textAlign: 'left',
  fontSize: 12,
  padding: 4,
  paddingLeft: 16,
});

const Contaner = styled('div')`
  height: 100px;
  flex-grow: 1;
  flex-shrink: 1;
  overflow-y: auto;
  text-align: left;
  padding: 4px;
  font-size: 12px;
  border-top: 2px solid white;
  border-bottom: 2px solid white;
  box-sizing: border-box;
  background-color: hsl(0, 0%, 95%);
`;

const ScrolArea = styled('div')`
  opacity: 0.7;
`;

const Line = styled('div')`
  width: 100%;
  height: 16px;
  border-bottom: 1px solid #e0e0e0;
  cursor: pointer;
`;

const LineItem = ({text, state, onClick}) => (<Line onClick={() => onClick(state)}>{text}</Line>)

export default class Console extends React.Component {
  static propTypes = {
    logger: PropTypes.func,
    onClick: PropTypes.func,
  };
  static defaultProps = {
    logger: () => {},
    onClick: () => {},
  };
  state = {
    /**
     * @desc array of objects. log items
     * @param text {string} text to output
     * @param state {object} some data. console.log onClick
     */
    logs: [],
  };
  componentDidMount() {
    this.props.logger(this.addToLog);
  }
  addToLog = log => {
    const { logs } = this.state;
    logs.push(log);
    this.setState({ logs }, () => {
      this.scrollArea.scrollTop = this.scrollArea.scrollHeight;
    });
  };
  render() {
    return (
      <Panel>
        <Header>Console</Header>
        <Contaner
          innerRef={ref => {
            this.scrollArea = ref;
          }}
        >
          <ScrolArea>
            {this.state.logs.map((item, ind) => <LineItem text={item.text} state={item.state} key={`${item.text}-${ind}`} onClick={this.props.onClick}/>)}
          </ScrolArea>
        </Contaner>
      </Panel>
    );
  }
}
