export interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  ALLOWED_ORIGIN: string;
}

function json(data: unknown, status = 200, origin = '*'): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type',
      'cache-control': 'no-store'
    }
  });
}

async function githubTokenExchange(env: Env, code: string, redirectUri: string) {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri
    })
  });

  if (!response.ok) {
    throw new Error(`GitHub token exchange failed: ${response.status} ${await response.text()}`);
  }

  return response.json() as Promise<{
    access_token?: string;
    token_type?: string;
    scope?: string;
    error?: string;
    error_description?: string;
  }>;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('origin') ?? env.ALLOWED_ORIGIN;

    if (request.method === 'OPTIONS') {
      return json({ ok: true }, 204, origin);
    }

    if (origin !== env.ALLOWED_ORIGIN) {
      return json({ error: 'origin_not_allowed' }, 403, origin);
    }

    if (url.pathname === '/oauth/start') {
      const state = crypto.randomUUID();
      const redirectUri = `${env.ALLOWED_ORIGIN}/oauth/callback.html`;
      const github = new URL('https://github.com/login/oauth/authorize');
      github.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
      github.searchParams.set('redirect_uri', redirectUri);
      github.searchParams.set('state', state);
      // GitHub App user tokens are fine-grained; no classic PAT scope prompt here.
      return json({ authorize_url: github.toString(), state }, 200, origin);
    }

    if (url.pathname === '/oauth/exchange' && request.method === 'POST') {
      const body = (await request.json()) as { code?: string; redirectUri?: string };
      if (!body.code || !body.redirectUri) {
        return json({ error: 'missing_code_or_redirect' }, 400, origin);
      }

      try {
        const token = await githubTokenExchange(env, body.code, body.redirectUri);
        if (token.error || !token.access_token) {
          return json(token, 400, origin);
        }
        return json(
          {
            access_token: token.access_token,
            token_type: token.token_type,
            scope: token.scope
          },
          200,
          origin
        );
      } catch (error) {
        return json(
          { error: 'exchange_failed', message: error instanceof Error ? error.message : String(error) },
          500,
          origin
        );
      }
    }

    return json({ error: 'not_found' }, 404, origin);
  }
};
