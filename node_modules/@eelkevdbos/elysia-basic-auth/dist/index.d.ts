import Elysia, { PreContext } from 'elysia';
export type BasicAuthCredentials = {
    username: string;
    password: string;
};
export type BasicAuthCredentialOptions = {
    env: string;
} | {
    file: string;
} | BasicAuthCredentials[];
export type BasicAuthOptions = {
    enabled: Boolean;
    credentials: BasicAuthCredentialOptions;
    header: string;
    realm: string;
    unauthorizedMessage: string;
    unauthorizedStatus: number;
    scope: string | string[] | ((ctx: PreContext) => boolean);
    skipCorsPreflight: boolean;
};
declare class BasicAuthError extends Error {
    readonly message: string;
    readonly realm: string;
    code: string;
    constructor(message: string, realm: string);
}
export declare function basicAuth(userOptions?: Partial<BasicAuthOptions>): Elysia<"", {
    request: {};
    store: {
        basicAuthRealm: string | null;
        basicAuthUser: string | null;
    };
    derive: {};
    resolve: {};
}, {
    type: {};
    error: {
        readonly BASIC_AUTH_ERROR: BasicAuthError;
    };
}, {}, {}, {}, false>;
export {};
