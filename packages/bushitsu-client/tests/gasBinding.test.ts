import { describe, it, expect, vi } from 'vitest';
import { createGasBushitsuMessageSender } from '../src/gas';

describe('createGasBushitsuMessageSender', () => {
  it('sends payload via provided fetch function', () => {
    const fetchFn = vi.fn();

    const sender = createGasBushitsuMessageSender({
      endpoint: 'https://example.com/api',
      room: 'lobby',
      userName: 'bot',
      fetchFn,
    });

    sender.sendMessage('hello', 'user1');

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({
        method: 'post',
        contentType: 'application/json',
        muteHttpExceptions: true,
      }),
    );

    const [, request] = fetchFn.mock.calls[0];
    expect(JSON.parse(request.payload as string)).toEqual({
      room: 'lobby',
      userName: 'bot',
      text: 'hello',
      mentionTo: 'user1',
    });
  });

  it('supports custom payload builder', () => {
    const fetchFn = vi.fn();

    const sender = createGasBushitsuMessageSender({
      endpoint: 'https://example.com/api',
      room: 'board',
      userName: 'bot',
      fetchFn,
      payloadBuilder: ({ text, room }) => ({ text, room }),
    });

    sender.sendMessage('ping');

    const [, request] = fetchFn.mock.calls[0];
    expect(request.payload).toBe(
      JSON.stringify({ text: 'ping', room: 'board' }),
    );
  });

  it('throws on empty message', () => {
    const sender = createGasBushitsuMessageSender({
      endpoint: 'https://example.com/api',
      room: 'board',
      userName: 'bot',
      fetchFn: vi.fn(),
    });

    expect(() => sender.sendMessage('   ')).toThrow(
      'Cannot send an empty message',
    );
  });
});
