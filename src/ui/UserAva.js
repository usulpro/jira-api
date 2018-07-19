import React from 'react';
import styled from 'react-emotion';

export const UserAva = ({ user, onClick }) => {
  if (!user) {
    const NoAva = styled('div')`
      width: 16px;
      height: 16px;
      border-radius: 16px;
      background-color: #ececec;
      border: 1px solid #cecece;
    `;

    return <NoAva title="Исполнитель не назначен" />;
  }

  const Ava = styled('img')`
    width: 16px;
    height: 16px;
    border-radius: 16px;
    cursor: pointer;
    &:hover: border: 1px solid red;
  `;

  return (
    <Ava
      src={user.avatarUrls['16x16']}
      alt="ava"
      title={user.displayName}
      onClick={onClick}
    />
  );
};
