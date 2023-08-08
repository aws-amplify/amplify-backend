import React from 'react';
import { Button, Heading, Flex, Card } from '@aws-amplify/ui-react';
import style from './style';

const SignOut = ({ user, signOut }) => {
  return (
    <Card>
      <Flex direction="row-reverse">
        <Button onClick={signOut}>Sign Out</Button>
        <Heading level={5} style={style.user}>
          Hello {user?.attributes?.email}
        </Heading>
      </Flex>
    </Card>
  );
};

export default SignOut;
