const config = {
  testDir: "./tests",
  timeout: 60_000,
  use: {
    headless: true,
    baseURL: "http://127.0.0.1:3000"
  }
};

export default config;
