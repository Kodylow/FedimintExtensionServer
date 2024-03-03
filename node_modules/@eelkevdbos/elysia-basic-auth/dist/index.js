import { timingSafeEqual } from 'crypto';
import Elysia from 'elysia';
import * as fs from 'fs';
class BasicAuthError extends Error {
    constructor(message, realm) {
        super(message);
        this.message = message;
        this.realm = realm;
        this.code = 'BASIC_AUTH_ERROR';
        this.realm = realm;
    }
}
const defaultOptions = {
    enabled: true,
    credentials: { env: 'BASIC_AUTH_CREDENTIALS' },
    header: 'Authorization',
    realm: 'Secure Area',
    unauthorizedMessage: 'Unauthorized',
    unauthorizedStatus: 401,
    scope: '/',
    skipCorsPreflight: false,
};
function newCredentialsMap(option) {
    if (Array.isArray(option)) {
        return option.reduce((mapping, credentials) => {
            return { ...mapping, [credentials.username]: credentials };
        }, {});
    }
    if ('file' in option) {
        return fs
            .readFileSync(option.file, 'utf-8')
            .split('\n')
            .reduce((m, l) => {
            const [username, password] = l.split(':');
            if (!username || !password)
                return m;
            return { ...m, [username]: { username, password } };
        }, {});
    }
    if ('env' in option) {
        return (process.env[option.env] || '').split(';').reduce((m, cStr) => {
            const [username, password] = cStr.split(':');
            if (!username || !password)
                return m;
            return { ...m, [username]: { username, password } };
        }, {});
    }
    throw new Error('Invalid credentials option');
}
function strSafeEqual(actual, expected, encoding = 'utf-8') {
    const actualBuffer = Buffer.from(actual, encoding);
    const expectedBuffer = Buffer.from(expected, encoding);
    const maxLength = Math.max(actualBuffer.byteLength, expectedBuffer.byteLength);
    return timingSafeEqual(Buffer.concat([actualBuffer, Buffer.alloc(maxLength, 0)], maxLength), Buffer.concat([expectedBuffer, Buffer.alloc(maxLength, 0)], maxLength));
}
function newCredentials(attrs) {
    return { username: '', password: '', ...attrs };
}
function checkCredentials(challenge, credentialsMap) {
    let valid = !!(challenge.username && challenge.password);
    const reference = credentialsMap[challenge.username];
    valid = strSafeEqual(challenge.username, reference?.username || '') && valid;
    valid = strSafeEqual(challenge.password, reference?.password || '') && valid;
    return valid;
}
function getCredentials(authHeader) {
    const [_, token] = authHeader.split(' ');
    const [username, password] = Buffer.from(token, 'base64')
        .toString('utf-8')
        .split(':');
    return newCredentials({ username, password });
}
function getPath(request) {
    return new URL(request.url).pathname;
}
function isCORSPreflightRequest(request) {
    return (request.method === 'OPTIONS' &&
        request.headers.has('Origin') &&
        request.headers.has('Cross-Origin-Request-Method'));
}
function newScopePredicate(scope) {
    switch (typeof scope) {
        case 'string':
            return (ctx) => getPath(ctx.request).startsWith(scope);
        case 'function':
            return scope;
        case 'object':
            if (Array.isArray(scope)) {
                return (ctx) => scope.some(s => getPath(ctx.request).startsWith(s));
            }
        default:
            throw new Error(`Unhandled scope type: ${typeof scope}`);
    }
}
export function basicAuth(userOptions = {}) {
    const options = {
        ...defaultOptions,
        ...userOptions,
    };
    const credentialsMap = newCredentialsMap(options.credentials);
    const inScope = newScopePredicate(options.scope);
    const skipRequest = (request) => options.skipCorsPreflight && isCORSPreflightRequest(request);
    return new Elysia({
        name: 'elysia-basic-auth',
        seed: options,
    })
        .state('basicAuthRealm', null)
        .state('basicAuthUser', null)
        .error({ BASIC_AUTH_ERROR: BasicAuthError })
        .onError(({ code, error }) => {
        if (code === 'BASIC_AUTH_ERROR' && error.realm === options.realm) {
            return new Response(options.unauthorizedMessage, {
                status: options.unauthorizedStatus,
                headers: { 'WWW-Authenticate': `Basic realm="${options.realm}"` },
            });
        }
    })
        .onRequest(ctx => {
        if (options.enabled && inScope(ctx) && !skipRequest(ctx.request)) {
            const authHeader = ctx.request.headers.get(options.header);
            if (!authHeader || !authHeader.toLowerCase().startsWith('basic ')) {
                throw new BasicAuthError('Invalid header', options.realm);
            }
            const credentials = getCredentials(authHeader);
            if (!checkCredentials(credentials, credentialsMap)) {
                throw new BasicAuthError('Invalid credentials', options.realm);
            }
            ctx.store.basicAuthRealm = options.realm;
            ctx.store.basicAuthUser = credentials.username;
        }
    });
}
