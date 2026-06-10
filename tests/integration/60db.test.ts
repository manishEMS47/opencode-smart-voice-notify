// @ts-nocheck
import { test, describe, expect, beforeAll, afterAll } from 'bun:test';
import { createTTS } from '../../src/util/tts.js';
import { createMockShellRunner, createMockClient, createTestTempDir, cleanupTestTempDir, createTestConfig } from '../setup.js';

const has60dbKey = !!process.env.TEST_60DB_API_KEY && process.env.TEST_60DB_API_KEY !== 'your-api-key-here';

describe.skipIf(!has60dbKey)('60db Integration', () => {
  let tempDir;
  let mockShell;
  let mockClient;

  beforeAll(() => {
    tempDir = createTestTempDir();
    mockShell = createMockShellRunner();
    mockClient = createMockClient();

    // Create config with real credentials from env
    createTestConfig({
      ttsEngine: '60db',
      sixtyDbApiKey: process.env.TEST_60DB_API_KEY,
      sixtyDbVoiceId: process.env.TEST_60DB_VOICE_ID || 'fbb75ed2-975a-40c7-9e06-38e30524a9a1',
      enableTTS: true,
      debugLog: true,
    });
  });

  afterAll(() => {
    cleanupTestTempDir();
  });

  test('should generate and play speech using real 60db API', async () => {
    const tts = createTTS({ $: mockShell, client: mockClient });

    // We expect this to call the 60db API, write a temp file, and play it
    const success = await tts.speak('This is a real integration test for 60db.');

    expect(success).toBe(true);

    // Verify that playAudioFile was called (via mockShell)
    expect(mockShell.getCallCount()).toBeGreaterThan(0);

    const lastCall = mockShell.getLastCall();
    if (process.platform === 'win32') {
      expect(lastCall.command).toContain('powershell.exe');
      expect(lastCall.command).toContain('MediaPlayer');
    } else if (process.platform === 'darwin') {
      expect(lastCall.command).toContain('afplay');
    }
  }, 30000); // 30s timeout for API call

  test('should handle invalid API key gracefully', async () => {
    // Rewrite the config file with an invalid key (createTTS loads from file)
    createTestConfig({
      ttsEngine: '60db',
      sixtyDbApiKey: 'invalid-key',
      enableTTS: true,
    });

    const tts = createTTS({ $: mockShell, client: mockClient });
    const success = await tts.speak('Testing invalid key.');

    // Should fail 60db and fall back to Edge -> SAPI -> Say, or return false if all fail.
    expect(success).toBeDefined();
  }, 10000);
});
