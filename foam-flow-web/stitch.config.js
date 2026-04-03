export default {
  project:   "Foam Flow Simulation Dashboard",
  framework: "react",
  runtime:   "node",
  port:      3001,
  devPort:   5173,
  proxy: {
    '/api': 'http://localhost:3001',
    '/ws':  'ws://localhost:3001',
  },
  env: {
    NODE_ENV: "development"
  }
};
