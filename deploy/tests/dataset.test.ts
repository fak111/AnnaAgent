import { DatasetLoader } from '../src/lib/dataset';
import path from 'path';

describe('DatasetLoader', () => {
  const p = path.join(process.cwd(), 'ref/merged_data.json');
  it('initializes and lists ids (if file exists)', () => {
    const loader = new DatasetLoader(p);
    try {
      const ids = loader.listIds();
      expect(Array.isArray(ids)).toBe(true);
    } catch (e: any) {
      // If dataset missing in CI, we only assert it throws a clear error
      expect(e.message).toMatch(/Dataset file not found|not found|ENOENT/);
    }
  });
});

