import {
  CallServiceActionConfig,
  ConfirmationRestrictionConfig,
  MoreInfoActionConfig,
  NavigateActionConfig,
  NoActionConfig,
  ToggleActionConfig,
  UrlActionConfig,
} from '@dermotduffy/custom-card-helpers';
import { z } from 'zod';
import { MEDIA_CHUNK_SIZE_DEFAULT, MEDIA_CHUNK_SIZE_MAX } from '../const.js';
import { deepRemoveDefaults } from '../utils/zod.js';

// *************************************************************************
//                       Common Configuration Constants
// *************************************************************************

// The min allowed size of buttons.
export const BUTTON_SIZE_MIN = 20;

const FRIGATE_MENU_PRIORITY_DEFAULT = 50;
export const FRIGATE_MENU_PRIORITY_MAX = 100;

export const FRIGATE_CARD_VIEWS_USER_SPECIFIED = [
  'live',
  'clip',
  'clips',
  'snapshot',
  'snapshots',
  'recording',
  'recordings',
  'image',
  'timeline',
] as const;
export type FrigateCardUserSpecifiedView =
  (typeof FRIGATE_CARD_VIEWS_USER_SPECIFIED)[number];

const FRIGATE_CARD_VIEWS = [
  ...FRIGATE_CARD_VIEWS_USER_SPECIFIED,
  'diagnostics',

  // Media: A generic piece of media (could be clip, snapshot, recording).
  'media',
] as const;

export type FrigateCardView = (typeof FRIGATE_CARD_VIEWS)[number];
export const FRIGATE_CARD_VIEW_DEFAULT = 'live' as const;

export const MEDIA_ACTION_NEGATIVE_CONDITIONS = ['unselected', 'hidden'] as const;
export type LazyUnloadCondition = (typeof MEDIA_ACTION_NEGATIVE_CONDITIONS)[number];
export type AutoPauseCondition = (typeof MEDIA_ACTION_NEGATIVE_CONDITIONS)[number];

export const MEDIA_ACTION_POSITIVE_CONDITIONS = ['selected', 'visible'] as const;
export type AutoPlayCondition = (typeof MEDIA_ACTION_POSITIVE_CONDITIONS)[number];
export const MEDIA_UNMUTE_CONDITIONS = [
  ...MEDIA_ACTION_POSITIVE_CONDITIONS,
  'microphone',
] as const;
export type AutoUnmuteCondition = (typeof MEDIA_UNMUTE_CONDITIONS)[number];

export const MEDIA_MUTE_CONDITIONS = [
  ...MEDIA_ACTION_NEGATIVE_CONDITIONS,
  'microphone',
] as const;
export type AutoMuteCondition = (typeof MEDIA_MUTE_CONDITIONS)[number];

const PTZ_BASE_ACTIONS = ['left', 'right', 'up', 'down', 'zoom_in', 'zoom_out'] as const;

// PTZ actions as used by the PTZ control (includes a 'home' button).
export const PTZ_CONTROL_ACTIONS = [...PTZ_BASE_ACTIONS, 'home'] as const;
export type PTZControlAction = (typeof PTZ_CONTROL_ACTIONS)[number];

// PTZ actions as used by the camera manager (includes generic presets).
const PTZ_ACTIONS = [...PTZ_BASE_ACTIONS, 'preset'] as const;
export type PTZAction = (typeof PTZ_ACTIONS)[number];

const PTZ_PHASES = ['start', 'stop'] as const;
export type PTZPhase = (typeof PTZ_PHASES)[number];

// *************************************************************************
//                        View Display Mode
// *************************************************************************

const viewDisplayModeSchema = z.enum(['single', 'grid']);
export type ViewDisplayMode = z.infer<typeof viewDisplayModeSchema>;

const viewDisplaySchema = z
  .object({
    mode: viewDisplayModeSchema,
    grid_selected_width_factor: z.number().min(0).optional(),
    grid_max_columns: z.number().min(0).optional(),
    grid_columns: z.number().min(0).optional(),
  })
  .optional();
export type ViewDisplayConfig = z.infer<typeof viewDisplaySchema>;

// *************************************************************************
//                            Actions
//
// Declare schemas to existing types:
// - https://github.com/colinhacks/zod/issues/372#issuecomment-826380330
// *************************************************************************

const schemaForType =
  <T>() =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <S extends z.ZodType<T, any, any>>(arg: S) => {
    return arg;
  };

// https://www.home-assistant.io/dashboards/actions/#options-for-confirmation
const actionBaseSchema = z.object({
  confirmation: z
    .boolean()
    .or(
      z.object({
        text: z.string().optional(),
        exemptions: z
          .object({
            user: z.string(),
          })
          .array()
          .optional(),
      }),
    )
    .optional(),
});

// HA accepts either a boolean or a ConfirmationRestrictionConfig object.
// `custom-card-helpers` currently only supports the latter. For maximum
// compatibility, this card supports what HA supports.
interface ExtendedConfirmationRestrictionConfig {
  confirmation?: boolean | ConfirmationRestrictionConfig;
}

const toggleActionSchema = schemaForType<
  ToggleActionConfig & ExtendedConfirmationRestrictionConfig
>()(
  actionBaseSchema.extend({
    action: z.literal('toggle'),
  }),
);

const callServiceActionSchema = schemaForType<
  CallServiceActionConfig & ExtendedConfirmationRestrictionConfig
>()(
  actionBaseSchema.extend({
    action: z.literal('call-service'),
    service: z.string(),
    data: z.object({}).passthrough().optional(),
  }),
);

const navigateActionSchema = schemaForType<
  NavigateActionConfig & ExtendedConfirmationRestrictionConfig
>()(
  actionBaseSchema.extend({
    action: z.literal('navigate'),
    navigation_path: z.string(),
  }),
);

const urlActionSchema = schemaForType<
  UrlActionConfig & ExtendedConfirmationRestrictionConfig
>()(
  actionBaseSchema.extend({
    action: z.literal('url'),
    url_path: z.string(),
  }),
);

const moreInfoActionSchema = schemaForType<
  MoreInfoActionConfig & ExtendedConfirmationRestrictionConfig
>()(
  actionBaseSchema.extend({
    action: z.literal('more-info'),
  }),
);

const customActionSchema = actionBaseSchema
  .extend({
    action: z.literal('fire-dom-event'),
  })
  .passthrough();

const noActionSchema = schemaForType<
  NoActionConfig & ExtendedConfirmationRestrictionConfig
>()(
  actionBaseSchema.extend({
    action: z.literal('none'),
  }),
);

export const frigateCardCustomActionsBaseSchema = customActionSchema.extend({
  action: z
    .literal('custom:frigate-card-action')
    // Syntactic sugar to avoid 'fire-dom-event' as part of an external API.
    .transform((): 'fire-dom-event' => 'fire-dom-event')
    .or(z.literal('fire-dom-event')),

  // Card this command is intended for.
  card_id: z
    .string()
    .regex(/^\w+$/, 'card_id parameter can only contain [a-z][A-Z][0-9_]')
    .optional(),
});

// *************************************************************************
//                           Custom Actions
// *************************************************************************

const FRIGATE_CARD_GENERAL_ACTIONS = [
  'camera_ui',
  'default',
  'diagnostics',
  'download',
  'expand',
  'fullscreen',
  'live_substream_off',
  'live_substream_on',
  'menu_toggle',
  'microphone_mute',
  'microphone_unmute',
  'mute',
  'pause',
  'play',
  'screenshot',
  'unmute',
] as const;
export type FrigateCardGeneralAction = (typeof FRIGATE_CARD_GENERAL_ACTIONS)[number];

const frigateCardViewActionSchema = frigateCardCustomActionsBaseSchema.extend({
  frigate_card_action: z.enum(FRIGATE_CARD_VIEWS_USER_SPECIFIED),
});
export type FrigateCardViewAction = z.infer<typeof frigateCardViewActionSchema>;

const frigateCardGeneralActionSchema = frigateCardCustomActionsBaseSchema.extend({
  frigate_card_action: z.enum(FRIGATE_CARD_GENERAL_ACTIONS),
});

const frigateCardCameraSelectActionSchema = frigateCardCustomActionsBaseSchema.extend({
  frigate_card_action: z.literal('camera_select'),
  camera: z.string().optional(),
  triggered: z.boolean().optional(),
});

const frigateCardLiveDependencySelectActionSchema =
  frigateCardCustomActionsBaseSchema.extend({
    frigate_card_action: z.literal('live_substream_select'),
    camera: z.string(),
  });

const frigateCardMediaPlayerActionSchema = frigateCardCustomActionsBaseSchema.extend({
  frigate_card_action: z.literal('media_player'),
  media_player: z.string(),
  media_player_action: z.enum(['play', 'stop']),
});

const frigateCardViewDisplayModeActionSchema = frigateCardCustomActionsBaseSchema.extend(
  {
    frigate_card_action: z.literal('display_mode_select'),
    display_mode: viewDisplayModeSchema,
  },
);

const frigateCardPTZActionSchema = frigateCardCustomActionsBaseSchema.extend({
  frigate_card_action: z.literal('ptz'),
  ptz_action: z.enum(PTZ_ACTIONS),
  ptz_phase: z.enum(PTZ_PHASES).optional(),
  ptz_preset: z.string().optional(),
});
export type FrigateCardPTZAction = z.infer<typeof frigateCardPTZActionSchema>;

const frigateCardShowPTZActionSchema = frigateCardCustomActionsBaseSchema.extend({
  frigate_card_action: z.literal('show_ptz'),
  show_ptz: z.boolean(),
});

export const frigateCardCustomActionSchema = z.union([
  frigateCardViewActionSchema,
  frigateCardGeneralActionSchema,
  frigateCardCameraSelectActionSchema,
  frigateCardLiveDependencySelectActionSchema,
  frigateCardMediaPlayerActionSchema,
  frigateCardViewDisplayModeActionSchema,
  frigateCardPTZActionSchema,
  frigateCardShowPTZActionSchema,
]);
export type FrigateCardCustomAction = z.infer<typeof frigateCardCustomActionSchema>;

// Cannot use discriminatedUnion since frigateCardCustomActionSchema uses a
// transform on the discriminated union key.
export const actionSchema = z.union([
  toggleActionSchema,
  callServiceActionSchema,
  navigateActionSchema,
  urlActionSchema,
  moreInfoActionSchema,
  noActionSchema,
  customActionSchema,
  frigateCardCustomActionSchema,
]);
export type ActionType = z.infer<typeof actionSchema>;

const actionsBaseSchema = z
  .object({
    tap_action: actionSchema.or(actionSchema.array()).optional(),
    hold_action: actionSchema.or(actionSchema.array()).optional(),
    double_tap_action: actionSchema.or(actionSchema.array()).optional(),
    start_tap_action: actionSchema.or(actionSchema.array()).optional(),
    end_tap_action: actionSchema.or(actionSchema.array()).optional(),
  })
  // Passthrough to allow (at least) entity/camera_image to go through. This
  // card doesn't need these attributes, but handleAction() in
  // custom_card_helpers may depending on how the action is configured.
  .passthrough();
export type Actions = z.infer<typeof actionsBaseSchema>;

export type ActionsConfig = Actions & {
  camera_image?: string;
  entity?: string;
};

const actionsSchema = z.object({
  actions: actionsBaseSchema.optional(),
});

const elementsBaseSchema = actionsBaseSchema.extend({
  style: z.record(z.string().nullable().or(z.undefined())).optional(),
  title: z.string().nullable().optional(),
});

// *************************************************************************
//                         Picture Elements
//
// All picture element types are validated (not just the Frigate card custom
// ones) as a convenience to present the user with a consistent error display
// up-front regardless of where they made their error.
// *************************************************************************

// https://www.home-assistant.io/lovelace/picture-elements/#state-badge
const stateBadgeIconSchema = elementsBaseSchema.extend({
  type: z.literal('state-badge'),
  entity: z.string(),
});

// https://www.home-assistant.io/lovelace/picture-elements/#state-icon
const stateIconSchema = elementsBaseSchema.extend({
  type: z.literal('state-icon'),
  entity: z.string(),
  icon: z.string().optional(),
  state_color: z.boolean().default(true),
});

// https://www.home-assistant.io/lovelace/picture-elements/#state-label
const stateLabelSchema = elementsBaseSchema.extend({
  type: z.literal('state-label'),
  entity: z.string(),
  attribute: z.string().optional(),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
});

// https://www.home-assistant.io/lovelace/picture-elements/#service-call-button
const serviceCallButtonSchema = elementsBaseSchema.extend({
  type: z.literal('service-button'),
  // Title is required for service button.
  title: z.string(),
  service: z.string(),
  service_data: z.object({}).passthrough().optional(),
});

// https://www.home-assistant.io/lovelace/picture-elements/#icon-element
const iconSchema = elementsBaseSchema.extend({
  type: z.literal('icon'),
  icon: z.string(),
  entity: z.string().optional(),
});

// https://www.home-assistant.io/lovelace/picture-elements/#image-element
const imageSchema = elementsBaseSchema.extend({
  type: z.literal('image'),
  entity: z.string().optional(),
  image: z.string().optional(),
  camera_image: z.string().optional(),
  camera_view: z.string().optional(),
  state_image: z.object({}).passthrough().optional(),
  filter: z.string().optional(),
  state_filter: z.object({}).passthrough().optional(),
  aspect_ratio: z.string().optional(),
});

// This state condition is used both for the Picture elements conditional
// schema, and also in frigateCardConditionSchema.
const stateConditions = z
  .object({
    entity: z.string(),
    state: z.string().optional(),
    state_not: z.string().optional(),
  })
  .array();

// https://www.home-assistant.io/lovelace/picture-elements/#image-element
export const conditionalSchema = z.object({
  type: z.literal('conditional'),
  conditions: stateConditions,
  elements: z.lazy(() => pictureElementsSchema),
});

// https://www.home-assistant.io/lovelace/picture-elements/#custom-elements
export const customSchema = z
  .object({
    // Insist that Frigate card custom elements are handled by other schemas.
    type: z.string().superRefine((val, ctx) => {
      if (!val.match(/^custom:(?!frigate-card).+/)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Frigate-card custom elements must match specific schemas',
          fatal: true,
        });
      }
    }),
  })
  .passthrough();

// *************************************************************************
//               Custom Element Configuration: Menu
// *************************************************************************

const menuBaseSchema = z.object({
  enabled: z.boolean().default(true).optional(),
  priority: z
    .number()
    .min(0)
    .max(FRIGATE_MENU_PRIORITY_MAX)
    .default(FRIGATE_MENU_PRIORITY_DEFAULT)
    .optional(),
  alignment: z.enum(['matching', 'opposing']).default('matching').optional(),
  icon: z.string().optional(),
});

const menuIconSchema = menuBaseSchema.merge(iconSchema).extend({
  type: z.literal('custom:frigate-card-menu-icon'),
});
export type MenuIcon = z.infer<typeof menuIconSchema>;

const menuStateIconSchema = menuBaseSchema
  .merge(stateIconSchema)
  .extend({
    type: z.literal('custom:frigate-card-menu-state-icon'),
  })
  .merge(menuBaseSchema);
export type MenuStateIcon = z.infer<typeof menuStateIconSchema>;

const menuSubmenuItemSchema = elementsBaseSchema.extend({
  entity: z.string().optional(),
  icon: z.string().optional(),
  state_color: z.boolean().default(true),
  selected: z.boolean().default(false),
  subtitle: z.string().optional(),
  enabled: z.boolean().default(true),
});
export type MenuSubmenuItem = z.infer<typeof menuSubmenuItemSchema>;

const menuSubmenuSchema = menuBaseSchema.merge(iconSchema).extend({
  type: z.literal('custom:frigate-card-menu-submenu'),
  items: menuSubmenuItemSchema.array(),
});
export type MenuSubmenu = z.infer<typeof menuSubmenuSchema>;

const menuSubmenuSelectSchema = menuBaseSchema.merge(stateIconSchema).extend({
  type: z.literal('custom:frigate-card-menu-submenu-select'),
  options: z.record(menuSubmenuItemSchema.deepPartial()).optional(),
});
export type MenuSubmenuSelect = z.infer<typeof menuSubmenuSelectSchema>;
export type MenuItem = MenuIcon | MenuStateIcon | MenuSubmenu | MenuSubmenuSelect;

// *************************************************************************
//                  Custom Element Configuration: Conditions
// *************************************************************************

const microphoneConditionSchema = z.object({
  connected: z.boolean().optional(),
  muted: z.boolean().optional(),
});
export type MicrophoneConditionState = z.infer<typeof microphoneConditionSchema>;

export const frigateCardConditionSchema = z.object({
  view: z.string().array().optional(),
  fullscreen: z.boolean().optional(),
  expand: z.boolean().optional(),
  camera: z.string().array().optional(),
  media_loaded: z.boolean().optional(),
  state: stateConditions.optional(),
  media_query: z.string().optional(),
  display_mode: viewDisplayModeSchema.optional(),
  triggered: z.string().array().optional(),
  interaction: z.boolean().optional(),
  microphone: microphoneConditionSchema.optional(),
});
export type FrigateCardCondition = z.infer<typeof frigateCardConditionSchema>;

export const frigateConditionalSchema = z.object({
  type: z.literal('custom:frigate-card-conditional'),
  conditions: frigateCardConditionSchema,
  elements: z.lazy(() => pictureElementsSchema),
});
export type FrigateConditional = z.infer<typeof frigateConditionalSchema>;

// *************************************************************************
//       Custom Element Configuration: Stock Picture Elements + Custom
// *************************************************************************

// Cannot use discriminatedUnion since customSchema uses a superRefine, which
// causes false rejections.
const pictureElementSchema = z.union([
  menuStateIconSchema,
  menuIconSchema,
  menuSubmenuSchema,
  menuSubmenuSelectSchema,
  frigateConditionalSchema,
  stateBadgeIconSchema,
  stateIconSchema,
  stateLabelSchema,
  serviceCallButtonSchema,
  iconSchema,
  imageSchema,
  conditionalSchema,
  customSchema,
]);
const pictureElementsSchema = pictureElementSchema.array().optional();
export type PictureElements = z.infer<typeof pictureElementsSchema>;

// *************************************************************************
//                     Media Layout Configuration
// *************************************************************************

const mediaLayoutConfigSchema = z.object({
  fit: z.enum(['contain', 'cover', 'fill']).optional(),
  position: z
    .object({
      x: z.number().min(0).max(100).optional(),
      y: z.number().min(0).max(100).optional(),
    })
    .optional(),
});
export type MediaLayoutConfig = z.infer<typeof mediaLayoutConfigSchema>;

// *************************************************************************
//                     Image Configuration
// Image config base options are used both for the `image` live provider and the
// `image` card view.
// *************************************************************************

const imageBaseConfigDefault = {
  refresh_seconds: 1,
};

const imageBaseConfigSchema = z.object({
  url: z.string().optional(),
  refresh_seconds: z.number().min(0).default(imageBaseConfigDefault.refresh_seconds),
});

const IMAGE_MODES = ['screensaver', 'camera', 'url'] as const;
const imageConfigDefault = {
  mode: 'url' as const,
  zoomable: true,
  ...imageBaseConfigDefault,
};

const imageConfigSchema = imageBaseConfigSchema
  .extend({
    mode: z.enum(IMAGE_MODES).default(imageConfigDefault.mode),
    layout: mediaLayoutConfigSchema.optional(),
    zoomable: z.boolean().default(imageConfigDefault.zoomable),
  })
  .merge(actionsSchema)
  .default(imageConfigDefault);
export type ImageViewConfig = z.infer<typeof imageConfigSchema>;

// *************************************************************************
//                     Thumbnail Configuration
// *************************************************************************

// The min/max width thumbnail (Frigate returns a maximum of 175px).
export const THUMBNAIL_WIDTH_MAX = 175;
export const THUMBNAIL_WIDTH_MIN = 75;

const thumbnailControlsBaseDefaults = {
  size: 100,
  show_details: true,
  show_favorite_control: true,
  show_timeline_control: true,
  show_download_control: true,
};

// Configuration for the actual rendered thumbnail.
const thumbnailsControlBaseSchema = z.object({
  size: z
    .number()
    .min(THUMBNAIL_WIDTH_MIN)
    .max(THUMBNAIL_WIDTH_MAX)
    .default(thumbnailControlsBaseDefaults.size),
  show_details: z.boolean().default(thumbnailControlsBaseDefaults.show_details),
  show_favorite_control: z
    .boolean()
    .default(thumbnailControlsBaseDefaults.show_favorite_control),
  show_timeline_control: z
    .boolean()
    .default(thumbnailControlsBaseDefaults.show_timeline_control),
  show_download_control: z
    .boolean()
    .default(thumbnailControlsBaseDefaults.show_download_control),
});
export type ThumbnailsControlBaseConfig = z.infer<typeof thumbnailsControlBaseSchema>;

const thumbnailControlsDefaults = {
  ...thumbnailControlsBaseDefaults,
  mode: 'right' as const,
};

const thumbnailsControlSchema = thumbnailsControlBaseSchema.extend({
  mode: z
    .enum(['none', 'above', 'below', 'left', 'right'])
    .default(thumbnailControlsDefaults.mode),
});
export type ThumbnailsControlConfig = z.infer<typeof thumbnailsControlSchema>;

// *************************************************************************
//                     Event Media Type Configuration
// *************************************************************************
const eventsMediaTypeSchema = z.enum(['all', 'clips', 'snapshots']);

// *************************************************************************
//                     Timeline Configuration
// *************************************************************************

const timelineCoreConfigDefault = {
  clustering_threshold: 3,
  events_media_type: 'all' as const,
  window_seconds: 60 * 60,
  show_recordings: true,
  style: 'stack' as const,
};

const timelineCoreConfigSchema = z.object({
  clustering_threshold: z
    .number()
    .optional()
    .default(timelineCoreConfigDefault.clustering_threshold),
  events_media_type: eventsMediaTypeSchema
    .optional()
    .default(timelineCoreConfigDefault.events_media_type),
  window_seconds: z
    .number()
    .min(1 * 60)
    .max(24 * 60 * 60)
    .optional()
    .default(timelineCoreConfigDefault.window_seconds),
  show_recordings: z
    .boolean()
    .optional()
    .default(timelineCoreConfigDefault.show_recordings),
  style: z.enum(['stack', 'ribbon']).optional().default(timelineCoreConfigDefault.style),
});
export type TimelineCoreConfig = z.infer<typeof timelineCoreConfigSchema>;

const miniTimelineConfigDefault = {
  ...timelineCoreConfigDefault,
  mode: 'none' as const,

  // Mini-timeline defaults to ribbon style.
  style: 'ribbon' as const,
};

const miniTimelineConfigSchema = timelineCoreConfigSchema.extend({
  mode: z.enum(['none', 'above', 'below']).default(miniTimelineConfigDefault.mode),
  style: timelineCoreConfigSchema.shape.style.default(miniTimelineConfigDefault.style),
});
export type MiniTimelineControlConfig = z.infer<typeof miniTimelineConfigSchema>;

const timelineConfigDefault = {
  ...timelineCoreConfigDefault,
  controls: {
    thumbnails: thumbnailControlsDefaults,
  },
};
const timelineConfigSchema = timelineCoreConfigSchema
  .extend({
    controls: z
      .object({
        thumbnails: thumbnailsControlSchema.default(
          timelineConfigDefault.controls.thumbnails,
        ),
      })
      .default(timelineConfigDefault.controls),
  })
  .default(timelineConfigDefault);
export type TimelineConfig = z.infer<typeof timelineConfigSchema>;

// *************************************************************************
//                 Next/Previous Control Configuration
// *************************************************************************
const nextPreviousControlConfigSchema = z.object({
  style: z.enum(['none', 'chevrons', 'icons', 'thumbnails']),
  size: z.number().min(BUTTON_SIZE_MIN),
});
export type NextPreviousControlConfig = z.infer<typeof nextPreviousControlConfigSchema>;

// *************************************************************************
//                 Title Control Configuration
// *************************************************************************

const titleControlConfigSchema = z.object({
  mode: z
    .enum([
      'none',
      'popup-top-right',
      'popup-top-left',
      'popup-bottom-right',
      'popup-bottom-left',
    ])
    .optional(),
  duration_seconds: z.number().min(0).max(60).optional(),
});
export type TitleControlConfig = z.infer<typeof titleControlConfigSchema>;

// *************************************************************************
//                 Carousel Transition Configuration
// *************************************************************************

const transitionEffectConfigSchema = z.enum(['none', 'slide']);
export type TransitionEffect = z.infer<typeof transitionEffectConfigSchema>;

// *************************************************************************
//                     Live Configuration
// *************************************************************************

const LIVE_PROVIDERS = [
  'auto',
  'image',
  'ha',
  'jsmpeg',
  'go2rtc',
  'webrtc-card',
] as const;
export type LiveProvider = (typeof LIVE_PROVIDERS)[number];

const microphoneConfigDefault = {
  always_connected: false,
  disconnect_seconds: 90,
  mute_after_microphone_mute_seconds: 60,
};

const microphoneConfigSchema = z
  .object({
    always_connected: z.boolean().default(microphoneConfigDefault.always_connected),
    disconnect_seconds: z
      .number()
      .min(0)
      .default(microphoneConfigDefault.disconnect_seconds),
    mute_after_microphone_mute_seconds: z
      .number()
      .min(0)
      .default(microphoneConfigDefault.mute_after_microphone_mute_seconds),
  })
  .default(microphoneConfigDefault);
export type MicrophoneConfig = z.infer<typeof microphoneConfigSchema>;

const go2rtcConfigSchema = z.object({
  url: z
    .string()
    .transform((input) => input.replace(/\/+$/, ''))
    .optional(),
  host: z.string().optional(),
  modes: z.enum(['webrtc', 'mse', 'mp4', 'mjpeg']).array().optional(),
  stream: z.string().optional(),
});

const liveImageConfigSchema = imageBaseConfigSchema;

const webrtcCardConfigSchema = z
  .object({
    entity: z.string().optional(),
    url: z.string().optional(),
  })
  .passthrough();

const jsmpegConfigSchema = z.object({
  options: z
    .object({
      // https://github.com/phoboslab/jsmpeg#usage
      audio: z.boolean().optional(),
      video: z.boolean().optional(),
      pauseWhenHidden: z.boolean().optional(),
      disableGl: z.boolean().optional(),
      disableWebAssembly: z.boolean().optional(),
      preserveDrawingBuffer: z.boolean().optional(),
      progressive: z.boolean().optional(),
      throttled: z.boolean().optional(),
      chunkSize: z.number().optional(),
      maxAudioLag: z.number().optional(),
      videoBufferSize: z.number().optional(),
      audioBufferSize: z.number().optional(),
    })
    .optional(),
});

const frigateCardPTZActions = z.object({
  actions_left: actionsBaseSchema.optional(),
  actions_right: actionsBaseSchema.optional(),
  actions_up: actionsBaseSchema.optional(),
  actions_down: actionsBaseSchema.optional(),
  actions_zoom_in: actionsBaseSchema.optional(),
  actions_zoom_out: actionsBaseSchema.optional(),
  actions_home: actionsBaseSchema.optional(),
});
export type FrigateCardPTZActions = z.infer<typeof frigateCardPTZActions>;

const livePTZControlsDefaults = {
  orientation: 'horizontal' as const,
  mode: 'on' as const,
  hide_pan_tilt: false,
  hide_zoom: false,
  hide_home: false,
  position: 'bottom-right' as const,
};

export const frigateCardPTZSchema = z.preprocess(
  // To avoid lots of YAML duplication, provide an easy way to just specify the
  // service data as actions for each PTZ icon, and it will be preprocessed into
  // the full form. This also provides compatability with the AlexIT/WebRTC PTZ
  // configuration.
  (data) => {
    if (!data || typeof data !== 'object' || !data['service']) {
      return data;
    }
    const out = { ...data };
    PTZ_CONTROL_ACTIONS.forEach((name) => {
      if (`data_${name}` in data && !(`actions_${name}` in data)) {
        out[`actions_${name}`] = {
          tap_action: {
            action: 'call-service',
            service: data['service'],
            data: data[`data_${name}`],
          },
        };
        delete out[`data_${name}`];
      }
    });
    return out;
  },
  frigateCardPTZActions.extend({
    mode: z.enum(['off', 'on']).default(livePTZControlsDefaults.mode),
    position: z
      .enum(['top-left', 'top-right', 'bottom-left', 'bottom-right'])
      .default(livePTZControlsDefaults.position),

    orientation: z
      .enum(['vertical', 'horizontal'])
      .default(livePTZControlsDefaults.orientation),

    hide_pan_tilt: z.boolean().default(livePTZControlsDefaults.hide_pan_tilt),
    hide_zoom: z.boolean().default(livePTZControlsDefaults.hide_zoom),
    hide_home: z.boolean().default(livePTZControlsDefaults.hide_home),

    service: z.string().optional(),
    style: z.object({}).passthrough().optional(),
  }),
);
export type FrigateCardPTZConfig = z.infer<typeof frigateCardPTZSchema>;

const liveThumbnailControlsDefaults = {
  ...thumbnailControlsDefaults,
  media_type: 'events' as const,
  events_media_type: 'all' as const,
};

const liveConfigDefault = {
  auto_play: [...MEDIA_ACTION_POSITIVE_CONDITIONS],
  auto_pause: [],
  auto_mute: [...MEDIA_MUTE_CONDITIONS],
  auto_unmute: ['microphone' as const],
  preload: false,
  lazy_load: true,
  lazy_unload: [],
  draggable: true,
  zoomable: true,
  transition_effect: 'slide' as const,
  show_image_during_load: true,
  mode: 'single' as const,
  controls: {
    builtin: true,
    next_previous: {
      size: 48,
      style: 'chevrons' as const,
    },
    ptz: livePTZControlsDefaults,
    thumbnails: liveThumbnailControlsDefaults,
    timeline: miniTimelineConfigDefault,
  },
  microphone: {
    ...microphoneConfigDefault,
  },
};

const livethumbnailsControlSchema = thumbnailsControlSchema.extend({
  media_type: z
    .enum(['events', 'recordings'])
    .default(liveConfigDefault.controls.thumbnails.media_type),
  events_media_type: eventsMediaTypeSchema.default(
    liveConfigDefault.controls.thumbnails.events_media_type,
  ),
});

const liveOverridableConfigSchema = z
  .object({
    controls: z
      .object({
        builtin: z.boolean().default(liveConfigDefault.controls.builtin),
        next_previous: nextPreviousControlConfigSchema
          .extend({
            // Live cannot show thumbnails, remove that option.
            style: z
              .enum(['none', 'chevrons', 'icons'])
              .default(liveConfigDefault.controls.next_previous.style),
            size: nextPreviousControlConfigSchema.shape.size.default(
              liveConfigDefault.controls.next_previous.size,
            ),
          })
          .default(liveConfigDefault.controls.next_previous),
        ptz: frigateCardPTZSchema.default(liveConfigDefault.controls.ptz),
        thumbnails: livethumbnailsControlSchema.default(
          liveConfigDefault.controls.thumbnails,
        ),
        timeline: miniTimelineConfigSchema.default(liveConfigDefault.controls.timeline),
        title: titleControlConfigSchema.optional(),
      })
      .default(liveConfigDefault.controls),
    show_image_during_load: z
      .boolean()
      .default(liveConfigDefault.show_image_during_load),
    layout: mediaLayoutConfigSchema.optional(),
    microphone: microphoneConfigSchema.default(liveConfigDefault.microphone),
    zoomable: z.boolean().default(liveConfigDefault.zoomable),
    display: viewDisplaySchema,
  })
  .merge(actionsSchema);

const liveConfigSchema = liveOverridableConfigSchema
  .extend({
    auto_play: z
      .enum(MEDIA_ACTION_POSITIVE_CONDITIONS)
      .array()
      .default(liveConfigDefault.auto_play),
    auto_pause: z
      .enum(MEDIA_ACTION_NEGATIVE_CONDITIONS)
      .array()
      .default(liveConfigDefault.auto_pause),
    auto_mute: z
      .enum(MEDIA_MUTE_CONDITIONS)
      .array()
      .default(liveConfigDefault.auto_mute),
    auto_unmute: z
      .enum(MEDIA_UNMUTE_CONDITIONS)
      .array()
      .default(liveConfigDefault.auto_unmute),
    preload: z.boolean().default(liveConfigDefault.preload),
    lazy_load: z.boolean().default(liveConfigDefault.lazy_load),
    lazy_unload: z
      .enum(MEDIA_ACTION_NEGATIVE_CONDITIONS)
      .array()
      .default(liveConfigDefault.lazy_unload),
    draggable: z.boolean().default(liveConfigDefault.draggable),
    transition_effect: transitionEffectConfigSchema.default(
      liveConfigDefault.transition_effect,
    ),
  })
  .default(liveConfigDefault);
export type LiveConfig = z.infer<typeof liveConfigSchema>;

const liveOverridesSchema = z
  .object({
    conditions: frigateCardConditionSchema,
    overrides: liveOverridableConfigSchema,
  })
  .array()
  .optional();
export type LiveOverrides = z.infer<typeof liveOverridesSchema>;

// *************************************************************************
//                       Cast Configuration
// *************************************************************************

const castConfigDefault = {
  method: 'standard' as const,
};

const castSchema = z.object({
  method: z.enum(['standard', 'dashboard']).default(castConfigDefault.method).optional(),
  dashboard: z
    .object({
      dashboard_path: z.string().optional(),
      view_path: z.string().optional(),
    })
    .optional(),
});

// *************************************************************************
//                     Camera Configuration
// *************************************************************************

const ENGINES = ['auto', 'frigate', 'generic', 'motioneye'] as const;

const cameraConfigDefault = {
  dependencies: {
    all_cameras: false,
    cameras: [],
  },
  engine: 'auto' as const,
  frigate: {
    client_id: 'frigate' as const,
  },
  hide: false,
  image: {
    refresh_seconds: 1,
  },
  live_provider: 'auto' as const,
  motioneye: {
    images: {
      directory_pattern: '%Y-%m-%d' as const,
      file_pattern: '%H-%M-%S' as const,
    },
    movies: {
      directory_pattern: '%Y-%m-%d' as const,
      file_pattern: '%H-%M-%S' as const,
    },
  },
  triggers: {
    motion: false,
    occupancy: true,
    entities: [],
  },
};

export const cameraConfigSchema = z
  .object({
    camera_entity: z.string().optional(),

    // Used for presentation in the UI (autodetected from the entity if
    // specified).
    icon: z.string().optional(),
    title: z.string().optional(),

    // Used to hide the camera (e.g. when used only as a dependency).
    hide: z.boolean().optional(),

    // Optional identifier to separate different camera configurations used in
    // this card.
    id: z.string().optional(),

    dependencies: z
      .object({
        all_cameras: z.boolean().default(cameraConfigDefault.dependencies.all_cameras),
        cameras: z.string().array().default(cameraConfigDefault.dependencies.cameras),
      })
      .default(cameraConfigDefault.dependencies),

    triggers: z
      .object({
        motion: z.boolean().default(cameraConfigDefault.triggers.motion),
        occupancy: z.boolean().default(cameraConfigDefault.triggers.occupancy),
        entities: z.string().array().default(cameraConfigDefault.triggers.entities),
      })
      .default(cameraConfigDefault.triggers),

    // Engine options.
    engine: z.enum(ENGINES).default('auto'),
    frigate: z
      .object({
        url: z.string().optional(),
        client_id: z.string().default(cameraConfigDefault.frigate.client_id),
        camera_name: z.string().optional(),
        labels: z.string().array().optional(),
        zones: z.string().array().optional(),
      })
      .default(cameraConfigDefault.frigate),
    motioneye: z
      .object({
        url: z.string().optional(),
        images: z
          .object({
            directory_pattern: z
              .string()
              .includes('%')
              .default(cameraConfigDefault.motioneye.images.directory_pattern),
            file_pattern: z
              .string()
              .includes('%')
              .default(cameraConfigDefault.motioneye.images.file_pattern),
          })
          .default(cameraConfigDefault.motioneye.images),
        movies: z
          .object({
            directory_pattern: z
              .string()
              .includes('%')
              .default(cameraConfigDefault.motioneye.movies.directory_pattern),
            file_pattern: z
              .string()
              .includes('%')
              .default(cameraConfigDefault.motioneye.movies.file_pattern),
          })
          .default(cameraConfigDefault.motioneye.movies),
      })
      .default(cameraConfigDefault.motioneye),

    // Live provider options.
    live_provider: z.enum(LIVE_PROVIDERS).default(cameraConfigDefault.live_provider),
    go2rtc: go2rtcConfigSchema.optional(),
    image: liveImageConfigSchema.default(cameraConfigDefault.image),
    jsmpeg: jsmpegConfigSchema.optional(),
    webrtc_card: webrtcCardConfigSchema.optional(),

    cast: castSchema.optional(),
  })
  .default(cameraConfigDefault);
export type CameraConfig = z.infer<typeof cameraConfigSchema>;

// Avoid using .nonempty() to avoid changing the inferred type
// (https://github.com/colinhacks/zod#minmaxlength).
const camerasConfigSchema = cameraConfigSchema.array().min(1);
export type CamerasConfig = z.infer<typeof camerasConfigSchema>;

// *************************************************************************
//                         View Configuration
// *************************************************************************

const viewConfigDefault = {
  default: FRIGATE_CARD_VIEW_DEFAULT,
  camera_select: 'current' as const,
  interaction_seconds: 300,
  reset_after_interaction: true,
  update_seconds: 0,
  update_force: false,
  update_cycle_camera: false,
  dark_mode: 'off' as const,
  scan: {
    enabled: false,
    show_trigger_status: true,
    filter_selected_camera: false,
    actions: {
      interaction_mode: 'inactive' as const,
      trigger: 'live' as const,
      untrigger: 'default' as const,
    },
    untrigger_seconds: 0,
  },
};

export const scanSchema = z.object({
  enabled: z.boolean().default(viewConfigDefault.scan.enabled),

  filter_selected_camera: z
    .boolean()
    .default(viewConfigDefault.scan.filter_selected_camera),
  show_trigger_status: z.boolean().default(viewConfigDefault.scan.show_trigger_status),

  actions: z
    .object({
      interaction_mode: z
        .enum(['all', 'inactive', 'active'])
        .default(viewConfigDefault.scan.actions.interaction_mode),
      trigger: z.enum(['live', 'none']).default(viewConfigDefault.scan.actions.trigger),
      untrigger: z
        .enum(['default', 'none'])
        .default(viewConfigDefault.scan.actions.untrigger),
    })
    .default(viewConfigDefault.scan.actions),
  untrigger_seconds: z.number().default(viewConfigDefault.scan.untrigger_seconds),
});
export type ScanOptions = z.infer<typeof scanSchema>;

const viewConfigSchema = z
  .object({
    default: z
      .enum(FRIGATE_CARD_VIEWS_USER_SPECIFIED)
      .default(viewConfigDefault.default),
    camera_select: z
      .enum([...FRIGATE_CARD_VIEWS_USER_SPECIFIED, 'current'])
      .default(viewConfigDefault.camera_select),
    interaction_seconds: z.number().default(viewConfigDefault.interaction_seconds),
    reset_after_interaction: z
      .boolean()
      .default(viewConfigDefault.reset_after_interaction),
    update_seconds: z.number().default(viewConfigDefault.update_seconds),
    update_force: z.boolean().default(viewConfigDefault.update_force),
    update_cycle_camera: z.boolean().default(viewConfigDefault.update_cycle_camera),
    update_entities: z.string().array().optional(),
    render_entities: z.string().array().optional(),
    dark_mode: z.enum(['on', 'off', 'auto']).optional(),
    scan: scanSchema.default(viewConfigDefault.scan),
  })
  .merge(actionsSchema)
  .default(viewConfigDefault);

// *************************************************************************
//                         Menu Configuration
// *************************************************************************

const FRIGATE_MENU_STYLES = [
  'none',
  'hidden',
  'overlay',
  'hover',
  'hover-card',
  'outside',
] as const;
const FRIGATE_MENU_POSITIONS = ['left', 'right', 'top', 'bottom'] as const;
const FRIGATE_MENU_ALIGNMENTS = FRIGATE_MENU_POSITIONS;

const visibleButtonDefault = {
  priority: FRIGATE_MENU_PRIORITY_DEFAULT,
  enabled: true,
};

const hiddenButtonDefault = {
  priority: FRIGATE_MENU_PRIORITY_DEFAULT,
  enabled: false,
};

const menuConfigDefault = {
  style: 'hidden' as const,
  position: 'top' as const,
  alignment: 'left' as const,
  buttons: {
    frigate: visibleButtonDefault,
    cameras: visibleButtonDefault,
    substreams: visibleButtonDefault,
    live: visibleButtonDefault,
    clips: visibleButtonDefault,
    snapshots: visibleButtonDefault,
    image: hiddenButtonDefault,
    timeline: visibleButtonDefault,
    download: visibleButtonDefault,
    camera_ui: visibleButtonDefault,
    fullscreen: visibleButtonDefault,
    expand: hiddenButtonDefault,
    media_player: visibleButtonDefault,
    microphone: {
      ...hiddenButtonDefault,
      type: 'momentary' as const,
    },
    mute: hiddenButtonDefault,
    play: hiddenButtonDefault,
    recordings: hiddenButtonDefault,
    screenshot: hiddenButtonDefault,
    display_mode: visibleButtonDefault,
    ptz: hiddenButtonDefault,
  },
  button_size: 40,
};

const visibleButtonSchema = menuBaseSchema.extend({
  enabled: menuBaseSchema.shape.enabled.default(visibleButtonDefault.enabled),
  priority: menuBaseSchema.shape.priority.default(visibleButtonDefault.priority),
});

const hiddenButtonSchema = menuBaseSchema.extend({
  enabled: menuBaseSchema.shape.enabled.default(hiddenButtonDefault.enabled),
  priority: menuBaseSchema.shape.priority.default(hiddenButtonDefault.priority),
});

export const menuConfigSchema = z
  .object({
    style: z.enum(FRIGATE_MENU_STYLES).default(menuConfigDefault.style),
    position: z.enum(FRIGATE_MENU_POSITIONS).default(menuConfigDefault.position),
    alignment: z.enum(FRIGATE_MENU_ALIGNMENTS).default(menuConfigDefault.alignment),
    buttons: z
      .object({
        frigate: visibleButtonSchema.default(menuConfigDefault.buttons.frigate),
        cameras: visibleButtonSchema.default(menuConfigDefault.buttons.cameras),
        substreams: visibleButtonSchema.default(menuConfigDefault.buttons.substreams),
        live: visibleButtonSchema.default(menuConfigDefault.buttons.live),
        clips: visibleButtonSchema.default(menuConfigDefault.buttons.clips),
        snapshots: visibleButtonSchema.default(menuConfigDefault.buttons.snapshots),
        image: hiddenButtonSchema.default(menuConfigDefault.buttons.image),
        timeline: visibleButtonSchema.default(menuConfigDefault.buttons.timeline),
        download: visibleButtonSchema.default(menuConfigDefault.buttons.download),
        camera_ui: visibleButtonSchema.default(menuConfigDefault.buttons.camera_ui),
        fullscreen: visibleButtonSchema.default(menuConfigDefault.buttons.fullscreen),
        expand: hiddenButtonSchema.default(menuConfigDefault.buttons.expand),
        media_player: visibleButtonSchema.default(
          menuConfigDefault.buttons.media_player,
        ),
        microphone: hiddenButtonSchema
          .extend({
            type: z
              .enum(['momentary', 'toggle'])
              .default(menuConfigDefault.buttons.microphone.type),
          })
          .default(menuConfigDefault.buttons.microphone),
        recordings: hiddenButtonSchema.default(menuConfigDefault.buttons.recordings),
        mute: hiddenButtonSchema.default(menuConfigDefault.buttons.mute),
        play: hiddenButtonSchema.default(menuConfigDefault.buttons.play),
        screenshot: hiddenButtonSchema.default(menuConfigDefault.buttons.screenshot),
        display_mode: visibleButtonSchema.default(
          menuConfigDefault.buttons.display_mode,
        ),
        ptz: hiddenButtonSchema.default(menuConfigDefault.buttons.ptz),
      })
      .default(menuConfigDefault.buttons),
    button_size: z.number().min(BUTTON_SIZE_MIN).default(menuConfigDefault.button_size),
  })
  .default(menuConfigDefault);
export type MenuConfig = z.infer<typeof menuConfigSchema>;

// *************************************************************************
//                       Event Viewer Configuration
// *************************************************************************

const viewerConfigDefault = {
  auto_play: [...MEDIA_ACTION_POSITIVE_CONDITIONS],
  auto_pause: [...MEDIA_ACTION_NEGATIVE_CONDITIONS],
  auto_mute: [...MEDIA_ACTION_NEGATIVE_CONDITIONS],
  auto_unmute: [],
  lazy_load: true,
  draggable: true,
  zoomable: true,
  transition_effect: 'slide' as const,
  snapshot_click_plays_clip: true,
  display_mode: 'single' as const,
  controls: {
    builtin: true,
    next_previous: {
      size: 48,
      style: 'thumbnails' as const,
    },
    thumbnails: thumbnailControlsDefaults,
    timeline: miniTimelineConfigDefault,
  },
};

const viewerNextPreviousControlConfigSchema = nextPreviousControlConfigSchema.extend({
  style: z
    .enum(['none', 'thumbnails', 'chevrons'])
    .default(viewerConfigDefault.controls.next_previous.style),
  size: nextPreviousControlConfigSchema.shape.size.default(
    viewerConfigDefault.controls.next_previous.size,
  ),
});

const viewerConfigSchema = z
  .object({
    auto_play: z
      .enum(MEDIA_ACTION_POSITIVE_CONDITIONS)
      .array()
      .default(viewerConfigDefault.auto_play),
    auto_pause: z
      .enum(MEDIA_ACTION_NEGATIVE_CONDITIONS)
      .array()
      .default(viewerConfigDefault.auto_pause),

    // Don't use MEDIA_UNMUTE_CONDITIONS and MEDIA_MUTE_CONDITIONS here, since
    // it includes 'microphone' which doesn't make sense for viewer media.
    auto_mute: z
      .enum(MEDIA_ACTION_NEGATIVE_CONDITIONS)
      .array()
      .default(viewerConfigDefault.auto_mute),
    auto_unmute: z
      .enum(MEDIA_ACTION_POSITIVE_CONDITIONS)
      .array()
      .default(viewerConfigDefault.auto_unmute),
    lazy_load: z.boolean().default(viewerConfigDefault.lazy_load),
    draggable: z.boolean().default(viewerConfigDefault.draggable),
    zoomable: z.boolean().default(viewerConfigDefault.zoomable),
    transition_effect: transitionEffectConfigSchema.default(
      viewerConfigDefault.transition_effect,
    ),
    snapshot_click_plays_clip: z
      .boolean()
      .default(viewerConfigDefault.snapshot_click_plays_clip),
    display: viewDisplaySchema,
    controls: z
      .object({
        builtin: z.boolean().default(viewerConfigDefault.controls.builtin),
        next_previous: viewerNextPreviousControlConfigSchema.default(
          viewerConfigDefault.controls.next_previous,
        ),
        thumbnails: thumbnailsControlSchema.default(
          viewerConfigDefault.controls.thumbnails,
        ),
        timeline: miniTimelineConfigSchema.default(
          viewerConfigDefault.controls.timeline,
        ),
        title: titleControlConfigSchema.optional(),
      })
      .default(viewerConfigDefault.controls),
    layout: mediaLayoutConfigSchema.optional(),
  })
  .merge(actionsSchema)
  .default(viewerConfigDefault);
export type ViewerConfig = z.infer<typeof viewerConfigSchema>;

// *************************************************************************
//                      Event Gallery Configuration
// *************************************************************************

const galleryThumbnailControlsDefaults = {
  ...thumbnailControlsDefaults,
  show_details: false,
};

const galleryConfigDefault = {
  controls: {
    thumbnails: galleryThumbnailControlsDefaults,
    filter: {
      mode: 'right' as const,
    },
  },
};

const gallerythumbnailsControlSchema = thumbnailsControlSchema.extend({
  show_details: z.boolean().default(galleryThumbnailControlsDefaults.show_details),
});

const galleryConfigSchema = z
  .object({
    controls: z
      .object({
        thumbnails: gallerythumbnailsControlSchema.default(
          galleryConfigDefault.controls.thumbnails,
        ),
        filter: z
          .object({
            mode: z
              .enum(['none', 'left', 'right'])
              .default(galleryConfigDefault.controls.filter.mode),
          })
          .default(galleryConfigDefault.controls.filter),
      })
      .default(galleryConfigDefault.controls),
  })
  .merge(actionsSchema)
  .default(galleryConfigDefault);
export type GalleryConfig = z.infer<typeof galleryConfigSchema>;

// *************************************************************************
//                      Dimensions Configuration
// *************************************************************************

const dimensionsConfigDefault = {
  aspect_ratio_mode: 'dynamic' as const,
  aspect_ratio: [16, 9],
  max_height: '100vh',
  min_height: '100px',
};

export const dimensionsConfigSchema = z
  .object({
    aspect_ratio_mode: z
      .enum(['dynamic', 'static', 'unconstrained'])
      .default(dimensionsConfigDefault.aspect_ratio_mode),
    aspect_ratio: z
      .number()
      .array()
      .length(2)
      .or(
        z
          .string()
          .regex(/^\s*\d+\s*[:/]\s*\d+\s*$/)
          .transform((input) => input.split(/[:\/]/).map((d) => Number(d))),
      )
      .default(dimensionsConfigDefault.aspect_ratio),
    max_height: z.string().default(dimensionsConfigDefault.max_height),
    min_height: z.string().default(dimensionsConfigDefault.min_height),
  })
  .default(dimensionsConfigDefault);

// *************************************************************************
//                       Override Configuration
// *************************************************************************

// Strip all defaults from the override schemas, to ensure values are only what
// the user has specified.
const overrideConfigurationSchema = z.object({
  cameras: deepRemoveDefaults(camerasConfigSchema).optional(),
  cameras_global: deepRemoveDefaults(cameraConfigSchema).optional(),
  live: deepRemoveDefaults(liveOverridableConfigSchema).optional(),
  menu: deepRemoveDefaults(menuConfigSchema).optional(),
  image: deepRemoveDefaults(imageConfigSchema).optional(),
  view: deepRemoveDefaults(viewConfigSchema).optional(),
  dimensions: deepRemoveDefaults(dimensionsConfigSchema).optional(),
});
export type OverrideConfigurationKey = keyof z.infer<typeof overrideConfigurationSchema>;

const overridesSchema = z
  .object({
    conditions: frigateCardConditionSchema,
    overrides: overrideConfigurationSchema,
  })
  .array()
  .optional();

// *************************************************************************
//                       Automation Configuration
// *************************************************************************

const automationActionSchema = actionSchema.array();
export type AutomationActions = z.infer<typeof automationActionSchema>;

const automationSchema = z.object({
  conditions: frigateCardConditionSchema,
  actions: automationActionSchema.optional(),
  actions_not: automationActionSchema.optional(),
});
export type Automation = z.infer<typeof automationSchema>;

const automationsSchema = automationSchema.array().optional();
export type Automations = z.infer<typeof automationsSchema>;

// *************************************************************************
//                       Performance Configuration
// *************************************************************************

const performanceConfigDefault = {
  profile: 'high' as const,
  features: {
    animated_progress_indicator: true,
    media_chunk_size: MEDIA_CHUNK_SIZE_DEFAULT,
  },
  style: {
    border_radius: true,
    box_shadow: true,
  },
};

export const performanceConfigSchema = z
  .object({
    profile: z.enum(['low', 'high']).default(performanceConfigDefault.profile),
    features: z
      .object({
        animated_progress_indicator: z
          .boolean()
          .default(performanceConfigDefault.features.animated_progress_indicator),
        media_chunk_size: z
          .number()
          .min(0)
          .max(MEDIA_CHUNK_SIZE_MAX)
          .default(performanceConfigDefault.features.media_chunk_size),
      })
      .default(performanceConfigDefault.features),
    style: z
      .object({
        border_radius: z.boolean().default(performanceConfigDefault.style.border_radius),
        box_shadow: z.boolean().default(performanceConfigDefault.style.box_shadow),
      })
      .default(performanceConfigDefault.style),
  })
  .default(performanceConfigDefault);
export type PerformanceConfig = z.infer<typeof performanceConfigSchema>;

const debugConfigDefault = {
  logging: false,
};

const debugConfigSchema = z
  .object({
    logging: z.boolean().default(debugConfigDefault.logging),
  })
  .default(debugConfigDefault);
type DebugConfig = z.infer<typeof debugConfigSchema>;

// *************************************************************************
//                       CardWideConfig Configuration
// *************************************************************************

export interface CardWideConfig {
  performance?: PerformanceConfig;
  debug?: DebugConfig;
}

// *************************************************************************
//                      *** Card Configuration ***
// *************************************************************************

export const frigateCardConfigSchema = z.object({
  // Defaults are stripped out of the individual cameras, since each camera will
  // be merged with `cameras_global` which *does* have defaults. If we didn't do
  // this, the default values of each individual camera would override the
  // intentionally specified values in `cameras_global` during camera
  // initialization when the two configs are merged.
  cameras: deepRemoveDefaults(camerasConfigSchema),
  cameras_global: cameraConfigSchema,

  view: viewConfigSchema,
  menu: menuConfigSchema,
  live: liveConfigSchema,
  media_gallery: galleryConfigSchema,
  media_viewer: viewerConfigSchema,
  image: imageConfigSchema,
  elements: pictureElementsSchema,
  dimensions: dimensionsConfigSchema,
  timeline: timelineConfigSchema,
  performance: performanceConfigSchema,
  debug: debugConfigSchema,
  automations: automationsSchema,

  // Configuration overrides.
  overrides: overridesSchema,

  // Support for card_mod (https://github.com/thomasloven/lovelace-card-mod).
  card_mod: z.unknown(),

  // Card ID (used for query string commands). Restrict contents to only values
  // that be easily used in a URL.
  card_id: z.string().regex(/^\w+$/).optional(),

  // Stock lovelace card config.
  type: z.string(),
});

export type FrigateCardConfig = z.infer<typeof frigateCardConfigSchema>;
export type RawFrigateCardConfig = Record<string, unknown>;
export type RawFrigateCardConfigArray = RawFrigateCardConfig[];

export const frigateCardConfigDefaults = {
  cameras: cameraConfigDefault,
  view: viewConfigDefault,
  menu: menuConfigDefault,
  live: liveConfigDefault,
  media_gallery: galleryConfigDefault,
  media_viewer: viewerConfigDefault,
  image: imageConfigDefault,
  timeline: timelineConfigDefault,
  performance: performanceConfigDefault,
  debug: debugConfigDefault,
};