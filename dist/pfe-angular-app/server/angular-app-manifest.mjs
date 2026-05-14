
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/mon-frontend/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "route": "/mon-frontend"
  },
  {
    "renderMode": 2,
    "route": "/mon-frontend/login"
  },
  {
    "renderMode": 2,
    "route": "/mon-frontend/request"
  },
  {
    "renderMode": 2,
    "route": "/mon-frontend/forgot-password"
  },
  {
    "renderMode": 2,
    "redirectTo": "/mon-frontend",
    "route": "/mon-frontend/**"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 451, hash: '94e2720d17f925dfd865bcf962b9a01550e066ec4b2e44761c754701f91de47c', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 964, hash: 'fd518a1624fa599910183b20ca542989bfe9fa31951bfe61632f0abc9e2a480b', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'request/index.html': {size: 5210, hash: 'b3cd509a621b1f5dd3b55b679a753553085f6b367082e1ded4dbd0f33f77dce8', text: () => import('./assets-chunks/request_index_html.mjs').then(m => m.default)},
    'forgot-password/index.html': {size: 3915, hash: '46b5a01e5b2eb7be328d0debcd8ebe9d906906a6c0dfb7fd10d9897d3639daf0', text: () => import('./assets-chunks/forgot-password_index_html.mjs').then(m => m.default)},
    'index.html': {size: 10805, hash: 'f6bf2908dfb857df06fae1f95031ddd0ff6586ab9c59382d91c2b4ee65f92379', text: () => import('./assets-chunks/index_html.mjs').then(m => m.default)},
    'login/index.html': {size: 5211, hash: '3af594214a6632a4c0a2d1d084418645d9bfb3ac04e1fde0001a70329e3e89d4', text: () => import('./assets-chunks/login_index_html.mjs').then(m => m.default)},
    'styles-5INURTSO.css': {size: 0, hash: 'menYUTfbRu8', text: () => import('./assets-chunks/styles-5INURTSO_css.mjs').then(m => m.default)}
  },
};
