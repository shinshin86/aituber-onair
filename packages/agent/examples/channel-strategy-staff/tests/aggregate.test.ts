import { describe, expect, it } from 'vitest';
import {
  aggregateGamePerformance,
  aggregateOverview,
  createDateWindow,
} from '../src/data/aggregate.js';
import { createFixtureCompositeDataSource } from '../src/data/dataSource.js';
import { FIXTURE_REFERENCE_DATE } from '../src/data/fixtures.js';

describe('fixture aggregation', () => {
  it('uses an injected reference date and excludes old streams', async () => {
    const source = createFixtureCompositeDataSource();
    const window = createDateWindow(FIXTURE_REFERENCE_DATE, 90);
    const streams = await source.listStreams({
      since: window.since,
      until: window.until,
      limit: 50,
    });

    expect(window).toEqual({
      days: 90,
      since: '2026-05-03T00:00:00.000Z',
      until: FIXTURE_REFERENCE_DATE,
    });
    expect(streams).toHaveLength(12);
    expect(streams.map((stream) => stream.id)).not.toContain('yt-old-mc-01');
    expect(streams.map((stream) => stream.id)).not.toContain('tw-old-coop-01');
  });

  it('keeps platform growth metrics separate and preserves unavailable values', async () => {
    const source = createFixtureCompositeDataSource();
    const window = createDateWindow(FIXTURE_REFERENCE_DATE, 90);
    const youtubeStreams = await source.listStreams({
      platform: 'youtube',
      since: window.since,
      until: window.until,
      limit: 50,
    });
    const twitchStreams = await source.listStreams({
      platform: 'twitch',
      since: window.since,
      until: window.until,
      limit: 50,
    });
    const youtube = aggregateOverview('youtube', youtubeStreams);
    const twitch = aggregateOverview('twitch', twitchStreams);

    expect(youtube.metrics.subscribersGained).toMatchObject({
      status: 'available',
      value: 303,
    });
    expect(youtube.metrics.followersGained.status).toBe('unavailable');
    expect(twitch.metrics.followersGained).toMatchObject({
      status: 'available',
      value: 417,
    });
    expect(twitch.metrics.subscribersGained.status).toBe('unavailable');
    expect(twitch.metrics.averageViewDurationSeconds).toMatchObject({
      status: 'unavailable',
      reason: 'not-provided-by-platform',
    });
    expect(twitch.limitations).toContain(
      'averageViewDurationSeconds: Twitch does not provide an equivalent public channel analytics metric.'
    );
  });

  it('groups the same game independently for YouTube and Twitch', async () => {
    const source = createFixtureCompositeDataSource();
    const window = createDateWindow(FIXTURE_REFERENCE_DATE, 90);
    const streams = await source.listStreams({
      since: window.since,
      until: window.until,
      limit: 50,
    });
    const minecraft = aggregateGamePerformance(streams).filter(
      (game) => game.gameId === 'minecraft'
    );

    expect(minecraft).toHaveLength(2);
    expect(minecraft.map((game) => game.platform).sort()).toEqual([
      'twitch',
      'youtube',
    ]);
  });
});
