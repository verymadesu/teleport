/**
 * Teleport
 * Copyright (C) 2023  Gravitational, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import styled from 'styled-components';
import { Flex, ButtonText, Box } from 'design';
import * as Alerts from 'design/Alert';
import { StepSlider } from 'design/StepSlider';
import { Attempt } from 'shared/hooks/useAsync';

import * as types from 'teleterm/ui/services/clusters/types';

import { PromptPasswordless } from './PromptPasswordless';
import PromptSsoStatus from './PromptSsoStatus';
import { FormPasswordless } from './FormPasswordless';
import { FormSso } from './FormSso';
import { FormLocal } from './FormLocal';

import type { PasswordlessLoginState } from '../useClusterLogin';
import type { PrimaryAuthType } from 'shared/services';
import type { StepComponentProps } from 'design/StepSlider';

export default function LoginForm(props: Props) {
  const {
    loginAttempt,
    onAbort,
    authProviders,
    localAuthEnabled = true,
    shouldPromptSsoStatus,
    passwordlessLoginState,
  } = props;

  if (passwordlessLoginState) {
    return (
      <PromptPasswordless onCancel={onAbort} {...passwordlessLoginState} />
    );
  }

  if (shouldPromptSsoStatus) {
    return <PromptSsoStatus onCancel={onAbort} />;
  }

  const ssoEnabled = authProviders?.length > 0;

  // If local auth was not enabled, disregard any primary auth type config
  // and display sso providers if any.
  if (!localAuthEnabled && ssoEnabled) {
    return (
      <FlexBordered p={4} pb={5}>
        {loginAttempt.status === 'error' && (
          <Alerts.Danger m={5} mb={0} details={loginAttempt.statusText}>
            Could not log in
          </Alerts.Danger>
        )}
        <FormSso {...props} />
      </FlexBordered>
    );
  }

  if (!localAuthEnabled) {
    return (
      <FlexBordered p={4}>
        <Alerts.Danger details="The ability to login has not been enabled. Please contact your system administrator for more information.">
          Login has not been enabled
        </Alerts.Danger>
      </FlexBordered>
    );
  }

  // Everything below requires local auth to be enabled.
  return (
    <FlexBordered>
      {loginAttempt.status === 'error' && (
        <Alerts.Danger m={4} mb={0} details={loginAttempt.statusText}>
          Could not log in
        </Alerts.Danger>
      )}
      <StepSlider<typeof loginViews>
        flows={loginViews}
        currFlow={'default'}
        {...props}
      />
    </FlexBordered>
  );
}

// Primary determines which authentication type to display
// on initial render of the login form.
const Primary = ({
  next,
  refCallback,
  hasTransitionEnded,
  ...otherProps
}: Props & StepComponentProps) => {
  const ssoEnabled = otherProps.authProviders?.length > 0;
  let otherOptionsAvailable = true;
  let $primary;

  switch (otherProps.primaryAuthType) {
    case 'passwordless':
      $primary = <FormPasswordless {...otherProps} autoFocus={true} />;
      break;
    case 'sso':
      $primary = <FormSso {...otherProps} autoFocus={true} />;
      break;
    case 'local':
      otherOptionsAvailable = otherProps.allowPasswordless || ssoEnabled;
      $primary = (
        <FormLocal
          {...otherProps}
          hasTransitionEnded={hasTransitionEnded}
          autoFocus={true}
        />
      );
      break;
  }

  return (
    <Box ref={refCallback} px={4} py={3}>
      <Box mb={3}>{$primary}</Box>
      {otherOptionsAvailable && (
        <Box textAlign="center">
          <ButtonText
            disabled={otherProps.loginAttempt.status === 'processing'}
            onClick={e => {
              e.preventDefault();
              otherProps.clearLoginAttempt();
              next();
            }}
          >
            Other sign-in options
          </ButtonText>
        </Box>
      )}
    </Box>
  );
};

// Secondary determines what other forms of authentication
// is allowed for the user to login with.
//
// There can be multiple authn types available, which will
// be visually separated by a divider.
const Secondary = ({
  prev,
  refCallback,
  ...otherProps
}: Props & StepComponentProps) => {
  const ssoEnabled = otherProps.authProviders?.length > 0;
  const { primaryAuthType, allowPasswordless } = otherProps;

  let $secondary;
  switch (primaryAuthType) {
    case 'passwordless':
      if (ssoEnabled) {
        $secondary = (
          <>
            <FormSso {...otherProps} autoFocus={true} />
            <Divider />
            <FormLocal {...otherProps} />
          </>
        );
      } else {
        $secondary = <FormLocal {...otherProps} autoFocus={true} />;
      }
      break;
    case 'sso':
      if (allowPasswordless) {
        $secondary = (
          <>
            <FormPasswordless {...otherProps} autoFocus={true} />
            <Divider />
            <FormLocal {...otherProps} />
          </>
        );
      } else {
        $secondary = <FormLocal {...otherProps} autoFocus={true} />;
      }
      break;
    case 'local':
      if (allowPasswordless) {
        $secondary = (
          <>
            <FormPasswordless {...otherProps} autoFocus={true} />
            {otherProps.allowPasswordless && ssoEnabled && <Divider />}
            {ssoEnabled && <FormSso {...otherProps} />}
          </>
        );
      } else {
        $secondary = <FormSso {...otherProps} autoFocus={true} />;
      }
      break;
  }

  return (
    <Box ref={refCallback} px={4} py={3}>
      {$secondary}
      <Box pt={3} textAlign="center">
        <ButtonText
          disabled={otherProps.loginAttempt.status === 'processing'}
          onClick={() => {
            otherProps.clearLoginAttempt();
            prev();
          }}
        >
          Back
        </ButtonText>
      </Box>
    </Box>
  );
};

const Divider = () => (
  <Flex
    alignItems="center"
    justifyContent="center"
    flexDirection="column"
    borderBottom={1}
    borderColor="text.muted"
    mx={4}
    mt={4}
    mb={4}
  >
    <StyledOr>Or</StyledOr>
  </Flex>
);

const FlexBordered = props => (
  <Flex justifyContent="center" flexDirection="column" {...props} />
);

const StyledOr = styled.div`
  background: ${props => props.theme.colors.levels.surface};
  display: flex;
  align-items: center;
  font-size: 10px;
  height: 32px;
  width: 32px;
  justify-content: center;
  position: absolute;
  z-index: 1;
`;

const loginViews = { default: [Primary, Secondary] };

type LoginAttempt = Attempt<void>;

export type Props = types.AuthSettings & {
  shouldPromptSsoStatus: boolean;
  passwordlessLoginState: PasswordlessLoginState;
  loginAttempt: LoginAttempt;
  clearLoginAttempt(): void;
  primaryAuthType: PrimaryAuthType;
  loggedInUserName?: string;
  onAbort(): void;
  onLoginWithSso(provider: types.AuthProvider): void;
  onLoginWithPasswordless(): void;
  onLogin(username: string, password: string): void;
  autoFocus?: boolean;
};
