import { defineConfig, devices } from '@playwright/test'

const localSupabaseUrl = 'http://127.0.0.1:54321'
const localAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: false,
  retries: 0,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4174',
    headless: true,
    launchOptions: {
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    },
  },
  projects: [
    {
      name: 'desktop-chrome',
      testMatch: /pro-gating\.spec\.ts/,
      use: { browserName: 'chromium' },
    },
    {
      name: 'mobile-chrome',
      testMatch: /mobile-smoke\.spec\.ts/,
      use: {
        browserName: 'chromium',
        ...devices['Pixel 7'],
      },
    },
  ],
  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 4174',
    url: 'http://127.0.0.1:4174/login',
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: localSupabaseUrl,
      VITE_SUPABASE_ANON_KEY: localAnonKey,
    },
  },
})
