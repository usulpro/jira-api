import React from 'react';
import PropTypes from 'prop-types';
import styled, { css } from 'react-emotion';
import { ObjectInspector } from 'react-inspector';
import { INSPECT_TYPE } from '../../store';
import { projectBase } from '../../api';

const DISPLAY_TYPE = {
  [INSPECT_TYPE.PROJECT]: 'Проект',
  [INSPECT_TYPE.STORY]: 'Пользовательская история',
  unknown: 'Объект',
  unset: 'выберите объект',
};

export default class Inspector extends React.Component {
  static defaultProps = {
    // data: {},
    collapsed: true,
  };

  keyBadge = ({ key } = {}) => {
    if (!key) return null;
    const Key = styled('a')`
      color: #d6d6d6;
      margin: 0px 16px;
      font-size: 10px;
      float: right;
      text-decoration: none;
      border: 1px solid #9e9e9e;
      padding: 2px;
      border-radius: 2px;
    `;
    const link = `${projectBase}/browse/${key}`
    return <Key href={link} target="_blank">{key}</Key>;
  };

  renderTitle = () => {
    const { data } = this.props;
    const displayType = data
      ? DISPLAY_TYPE[data.inspectType] || DISPLAY_TYPE.unknown
      : DISPLAY_TYPE.unset;

    const Header = styled('header')({
      color: 'white',
      backgroundColor: 'hsl(0,0%,50%)',
      textAlign: 'left',
      fontSize: 12,
      padding: 4,
      paddingLeft: 16,
    });

    return (
      <Header>
        {displayType}
        {this.keyBadge(data)}
      </Header>
    );
  };

  render() {
    const { data } = this.props;
    const Panel = styled('div')`
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    `;
    const Contaner = styled('div')({
      height: '100%',
      padding: 8,
      overflowX: 'auto',
    });
    return (
      <Panel>
        {this.renderTitle()}
        {!!data && (
          <Contaner>
            <ObjectInspector data={this.props.data} expandLevel={1} />
          </Contaner>
        )}
      </Panel>
    );
  }
}
