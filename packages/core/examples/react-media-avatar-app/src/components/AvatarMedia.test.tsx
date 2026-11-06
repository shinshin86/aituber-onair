// @vitest-environment jsdom
import { StrictMode, act } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type AvatarMedia, BUNDLED_AVATAR_MEDIA } from '../lib/avatarMedia';
import { AvatarMediaDisplay } from './AvatarMedia';

let root: Root;
let container: HTMLDivElement;
let nextUrl = 0;
const createUrl = vi.fn(() => `blob:test-${++nextUrl}`);
const revokeUrl = vi.fn();
function render(media: AvatarMedia) {
  act(() =>
    root.render(
      <StrictMode>
        <AvatarMediaDisplay media={media} />
      </StrictMode>,
    ),
  );
}
function ready(element: Element, event = 'load') {
  act(() => element.dispatchEvent(new Event(event)));
}

describe('media avatar transitions', () => {
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('URL', {
      createObjectURL: createUrl,
      revokeObjectURL: revokeUrl,
    });
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    createUrl.mockClear();
    revokeUrl.mockClear();
    container = document.createElement('div');
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('keeps the loaded frame until the replacement loads without remounting it', () => {
    render(BUNDLED_AVATAR_MEDIA.neutral);
    const initial = container.querySelector('img')!;
    ready(initial);
    render(BUNDLED_AVATAR_MEDIA.happy);
    const pending = container.querySelectorAll('img')[1];
    expect(initial.style.visibility).not.toBe('hidden');
    expect(pending.style.visibility).toBe('hidden');
    ready(pending);
    expect(container.querySelector('img')).toBe(pending);
    expect(container.querySelectorAll('img')).toHaveLength(1);
    expect(pending.style.visibility).not.toBe('hidden');
  });

  it('stops retrying when both the upload and bundled fallback fail', () => {
    const media: AvatarMedia = {
      id: 'broken',
      kind: 'image',
      source: 'upload',
      name: 'broken.png',
      file: new File(['invalid'], 'broken.png'),
    };
    render(media);
    ready(container.querySelector('img')!, 'error');
    ready(container.querySelector('img')!, 'error');
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('.avatar-fallback')).not.toBeNull();
    expect(container.querySelector('[role="status"]')).not.toBeNull();
  });

  it('holds uploaded video URLs through transitions and releases them on replacement or unmount', () => {
    const media: AvatarMedia = {
      id: 'upload',
      kind: 'video',
      source: 'upload',
      name: 'avatar.webm',
      file: new File(['video'], 'avatar.webm'),
    };
    render(media);
    const video = container.querySelector('video')!;
    ready(video, 'loadeddata');
    const activeUrl = video.src;
    render(BUNDLED_AVATAR_MEDIA.neutral);
    expect(revokeUrl).not.toHaveBeenCalledWith(activeUrl);
    ready(container.querySelector('img')!);
    expect(revokeUrl).toHaveBeenCalledWith(activeUrl);
    render(media);
    ready(container.querySelector('video')!, 'loadeddata');
    act(() => root.render(null));
    expect(revokeUrl.mock.calls.map(([url]) => url).sort()).toEqual(
      createUrl.mock.results.map(({ value }) => value).sort(),
    );
  });

  it('keeps the previous frame when a new file fails and loads neutral with an error', () => {
    render(BUNDLED_AVATAR_MEDIA.happy);
    ready(container.querySelector('img')!);
    const invalid: AvatarMedia = {
      id: 'invalid',
      kind: 'image',
      source: 'upload',
      name: 'invalid.png',
      file: new File(['invalid'], 'invalid.png'),
    };
    render(invalid);
    ready(container.querySelectorAll('img')[1], 'error');
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      '再生できません',
    );
    const fallback = container.querySelectorAll('img')[1];
    expect(fallback.getAttribute('src')).toBe('/avatar/media/neutral.gif');
    ready(fallback);
    expect(container.querySelector('img')).toBe(fallback);
  });
});
