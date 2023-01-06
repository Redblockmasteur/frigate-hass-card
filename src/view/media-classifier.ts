import {
  ViewMedia,
  FrigateEventViewMedia,
  FrigateRecordingViewMedia,
  RecordingViewMedia,
  EventViewMedia,
} from './media';

export class ViewMediaClassifier {
  public static isFrigateMedia(
    media: ViewMedia,
  ): media is FrigateEventViewMedia | FrigateRecordingViewMedia {
    return this.isFrigateEvent(media) || this.isFrigateRecording(media);
  }
  public static isFrigateEvent(media: ViewMedia): media is FrigateEventViewMedia {
    return media instanceof FrigateEventViewMedia;
  }
  public static isFrigateRecording(
    media: ViewMedia,
  ): media is FrigateRecordingViewMedia {
    return media instanceof FrigateRecordingViewMedia;
  }
  public static isEvent(media: ViewMedia): media is EventViewMedia {
    return this.isClip(media) || this.isSnapshot(media);
  }
  public static isRecording(media: ViewMedia): media is RecordingViewMedia {
    return media.getMediaType() === 'recording';
  }
  public static isClip(media: ViewMedia): boolean {
    return media.getMediaType() === 'clip';
  }
  public static isSnapshot(media: ViewMedia): boolean {
    return media.getMediaType() === 'snapshot';
  }
  public static isVideo(media: ViewMedia): boolean {
    return this.isClip(media) || this.isRecording(media); 
  }
}
