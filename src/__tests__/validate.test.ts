import { describe, it, expect } from 'vitest';
import {
  validateDecodeResponse,
  validateDecodeRequest,
  MAX_INSTRUCTIONS_LENGTH,
  MIN_ESTIMATE_MINUTES,
  MAX_ESTIMATE_MINUTES,
} from '../lib/validate';

describe('validateDecodeResponse', () => {
  const valid = {
    title: 'Essay',
    requirements: [{ text: 'Write 5 pages', source: 'explicit' }],
    tasks: [{ title: 'Draft outline', estimateMinutes: 30, source: 'explicit' }],
  };

  it('accepts a valid payload', () => {
    const result = validateDecodeResponse(valid);
    expect(result.title).toBe('Essay');
    expect(result.requirements).toHaveLength(1);
    expect(result.tasks).toHaveLength(1);
  });

  it('throws when title is missing', () => {
    expect(() => validateDecodeResponse({ ...valid, title: '' })).toThrow();
  });

  it('throws when requirements/tasks are not arrays', () => {
    expect(() =>
      validateDecodeResponse({ ...valid, tasks: 'nope' }),
    ).toThrow();
  });

  it('throws when there are no usable tasks', () => {
    expect(() =>
      validateDecodeResponse({ ...valid, tasks: [{ title: '  ', estimateMinutes: 10 }] }),
    ).toThrow();
  });

  it('coerces an unknown source to "suggested"', () => {
    const result = validateDecodeResponse({
      ...valid,
      requirements: [{ text: 'Thing', source: 'guess' }],
    });
    expect(result.requirements[0].source).toBe('suggested');
  });

  it('clamps estimateMinutes into the valid range', () => {
    const result = validateDecodeResponse({
      ...valid,
      tasks: [
        { title: 'Tiny', estimateMinutes: 1, source: 'explicit' },
        { title: 'Huge', estimateMinutes: 99999, source: 'explicit' },
        { title: 'NaN', estimateMinutes: 'abc', source: 'explicit' },
      ],
    });
    expect(result.tasks[0].estimateMinutes).toBe(MIN_ESTIMATE_MINUTES);
    expect(result.tasks[1].estimateMinutes).toBe(MAX_ESTIMATE_MINUTES);
    expect(result.tasks[2].estimateMinutes).toBeGreaterThanOrEqual(MIN_ESTIMATE_MINUTES);
  });

  it('drops empty requirement/task entries', () => {
    const result = validateDecodeResponse({
      ...valid,
      requirements: [{ text: '', source: 'explicit' }, { text: 'Keep', source: 'explicit' }],
    });
    expect(result.requirements).toHaveLength(1);
    expect(result.requirements[0].text).toBe('Keep');
  });
});

describe('validateDecodeRequest', () => {
  it('accepts valid instructions and optional fields', () => {
    const r = validateDecodeRequest({
      instructions: 'Do the thing',
      course: 'CS 101',
      dueDate: '2026-11-01',
    });
    expect(r.instructions).toBe('Do the thing');
    expect(r.course).toBe('CS 101');
    expect(r.dueDate).toBe('2026-11-01');
  });

  it('rejects empty instructions', () => {
    expect(() => validateDecodeRequest({ instructions: '   ' })).toThrow();
  });

  it('rejects instructions over the length cap', () => {
    const long = 'x'.repeat(MAX_INSTRUCTIONS_LENGTH + 1);
    expect(() => validateDecodeRequest({ instructions: long })).toThrow();
  });

  it('treats blank optional fields as undefined', () => {
    const r = validateDecodeRequest({ instructions: 'ok', course: '  ', dueDate: '' });
    expect(r.course).toBeUndefined();
    expect(r.dueDate).toBeUndefined();
  });
});
