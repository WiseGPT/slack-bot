export type TeamAccess = {
  appId: string;
  teamId: string;
  accessToken: string | null;
  authedUsers: Set<string>;
  scopes: Set<string>;
};

export type UserAccess = {
  appId: string;
  teamId: string;
  userId: string;
  accessToken: string | null;
  scopes: Set<string>;
};

export type OAuthV2AccessResponse =
  | { ok: false; error: string }
  | {
      ok: true;
      app_id: string;
      authed_user: {
        id: string;
        scope?: string;
        access_token?: string;
        token_type?: string;
      };
      scope?: string;
      token_type?: string;
      access_token?: string;
      bot_user_id: string;
      team: {
        id: string;
        name: string;
      };
      enterprise: null | {
        id: string;
        name: string;
      };
      is_enterprise_install: boolean;
    };

export type OAuthV2AccessInput = {
  clientId: string;
  clientSecret: string;
  code: string;
};

export type OAuthV2AccessOutput = {
  appId: string;
  authedUser: {
    id: string;
    scopes: string[];
    accessToken?: string;
    tokenType?: string;
  };
  scopes: string[];
  tokenType?: string;
  accessToken?: string;
  botUserId: string;
  team: {
    id: string;
    name: string;
  };
};
