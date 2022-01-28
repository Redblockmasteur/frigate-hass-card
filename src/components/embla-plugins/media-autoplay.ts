import { EmblaCarouselType, EmblaPluginType } from 'embla-carousel';
import { FrigateCardMediaPlayer } from '../../types.js';

export type MediaAutoPlayPauseOptionsType = {
  playerSelector: string;
};

export const defaultOptions: Partial<MediaAutoPlayPauseOptionsType> = {};

export type MediaAutoPlayPauseType = EmblaPluginType<MediaAutoPlayPauseOptionsType> & {
  play: () => void;
}

export function MediaAutoPlayPause(
  userOptions?: MediaAutoPlayPauseOptionsType,
): MediaAutoPlayPauseType {
  const options = Object.assign({}, defaultOptions, userOptions);

  let carousel: EmblaCarouselType;
  let slides: HTMLElement[];

  /**
   * Initialize the plugin.
   */
  function init(embla: EmblaCarouselType): void {
    carousel = embla;
    slides = carousel.slideNodes();

    // Frigate card media autoplays when the media loads not necessarily when the
    // slide is selected, so only pause based on carousel events.
    carousel.on('destroy', pauseAllHandler);
    carousel.on('select', pausePrevious);

    document.addEventListener('visibilitychange', visibilityHandler);
  }

  /**
   * Destroy the plugin.
   */
  function destroy(): void {
    carousel.off('destroy', pauseAllHandler);
    carousel.off('select', pausePrevious);

    document.removeEventListener('visibilitychange', visibilityHandler);
  }

  /**
   * Handle document visibility changes.
   */
   function visibilityHandler(): void {
    if (document.visibilityState == 'hidden') {
      pause();
    } else if (document.visibilityState == 'visible') {
      play();
    }
  }

  /**
   * Get the media player from a slide.
   * @param slide
   * @returns A FrigateCardMediaPlayer object or `null`.
   */
  function getPlayer(slide: HTMLElement | undefined): FrigateCardMediaPlayer | null {
    return slide?.querySelector(options.playerSelector) as FrigateCardMediaPlayer | null;
  }

  /**
   * Pause all clips.
   */
  function pauseAllHandler(): void {
    slides.forEach((slide) => getPlayer(slide)?.pause());
  }

  /**
   * Autoplay the current slide.
   */
  function play(): void {
    getPlayer(slides[carousel.selectedScrollSnap()])?.play();
  }

  /**
   * Autopause the current slide.
   */
   function pause(): void {
    getPlayer(slides[carousel.selectedScrollSnap()])?.pause();
  }

  /**
   * Autopause the previous slide.
   */
   function pausePrevious(): void {
    getPlayer(slides[carousel.previousScrollSnap()])?.pause();
  }

  const self: MediaAutoPlayPauseType = {
    name: 'MediaAutoPlayPause',
    options,
    init,
    destroy,
    play,
  };
  return self;
}