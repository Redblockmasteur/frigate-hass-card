# `view`

The `view` configuration options control how the default view of the card behaves.

 ```yaml
view:
   [...]
```

| Option | Default | Description |
| - | - | - |
| `actions` | | [Actions](actions.md) to use for all views, individual actions may be overriden by view-specific actions. |
| `camera_select` | `current` | The [view](view.md?id=supported-views) to show when a new camera is selected (e.g. in the camera menu). If `current` the view is unchanged when a new camera is selected. |
| `dark_mode` | `off` | Whether or not to turn dark mode `on`, `off` or `auto` to automatically turn on if the card `interaction_seconds` has expired (i.e. card has been left unattended for that period of time) or if dark mode is enabled in the HA profile theme setting. Dark mode dims the brightness by `25%`.|
| `default` | `live` | The view to show in the card by default. The default camera is the first one listed. See [Supported Views](view.md?id=supported-views) below. |
| `interaction_seconds` | `300` | After a mouse/touch interaction with the card, it will be considered "interacted with" until this number of seconds elapses without further interaction. May be used as part of an [interaction condition](conditions.md?id=interaction) or with `reset_after_interaction` to reset the view after the interaction is complete. `0` means no interactions are reported / acted upon. |
| `render_entities` | | **YAML only**: A list of entity ids that should cause the card to re-render 'in-place'. The view/camera is not changed. `update_*` flags do not pertain/relate to the behavior of this flag. This should **very** rarely be needed, but could be useful if the card is both setting and changing HA state of the same object as could be the case for some complex `card_mod` scenarios ([example](https://github.com/dermotduffy/frigate-hass-card/issues/343)). |
| `reset_after_interaction` | `true` | If `true` the card will reset to the default configured view (i.e. 'screensaver' functionality) after `interaction_seconds` has elapsed after user interaction. |
| `triggers` | | How to react when a camera is [triggered](cameras/README.md?id=triggers). |
| `update_cycle_camera` | `false` | When set to `true` the selected camera is cycled on each default view change. |
| `update_entities` | | **YAML only**: A card-wide list of entities that should cause the view to reset to the default (if the entity only pertains to a particular camera use [`triggers`](cameras/README.md?id=triggers) for the selected camera instead. |
| `update_force` | `false` | Whether automated card updates should ignore user interaction. |
| `update_seconds` | `0` | A number of seconds after which to automatically update/refresh the default view. If the default view occurs sooner (e.g. manually) the timer will start over. `0` disables this functionality.|

## `triggers`

The `triggers` block controls how the card reacts when a camera is triggered (note that _what_ triggers the camera is controlled by the [`triggers`](cameras/README.md?id=triggers) block within the config for a given camera). This can be used for a variety of purposes, such as allowing the card to automatically change to `live` for a camera that triggers.

All configuration is under:

```yaml
view:
  triggers:
     [...]
```

When a camera untriggers (e.g. an entity state returning to something other than
`on` or `open`), an action can also be taken with an optional number of seconds
to wait prior to the acting (see `untrigger_seconds`). By default, triggering is
only allowed when there is no ongoing human interaction with the card. This
behavior can be controlled by the `interaction_mode` parameter.

Triggers based on Home Assistant entities require state *changes* -- when the
card is first started, it takes an active change in state to trigger (i.e. an
already occupied room will not trigger, but a newly occupied room will).

| Option | Default | Description |
| - | - | - |
| `actions` | | The actions to take when a camera is triggered. See below. |
| `filter_selected_camera` | `false` | If set to `true` will only trigger on the currently selected camera.|
| `show_trigger_status` | `false` | Whether or not the `live` view should show a visual indication that it is triggered (a pulsing border around the camera edge). |
| `untrigger_seconds` | `0` | The number of seconds to wait after a camera untriggers before considering the card untriggered and taking the `untrigger` action. |

### Trigger action configuration

| Option | Default | Description |
| - | - | - |
| `interaction_mode` | `inactive` | Whether actions should be taken when the card is being interacted with. If `all`, actions will always left be taken regardless. If `inactive` actions will only be taken if the card has *not* had human interaction recently (as defined by `view.interaction_seconds`). If `active` actions will only be taken if the card *has* had human interaction recently. This does not stop triggering itself (i.e. border will still pulse if `show_trigger_status` is true) but rather just prevents the actions being performed. |
| `trigger` | `default` | If set to `default` the default view of the card will be reloaded. If set to `live` the triggered camera will be selected in `live` view. If set to `media` the appropriate media view (e.g. `clip` or `snapshot`) will be chosen to match a newly available media item (please note that only some [camera engines](cameras/engine.md) support new media detection, e.g. `frigate`). If set to `none` no action is taken. |
| `untrigger` | `none` | If set to `default` the the default view of the card will be reloaded. If set to `none` no action will be taken. |

## Supported views

This card supports several different views.

| Key | Description |
| - | - |
|`clip`|Shows a viewer for the most recent clip for this camera. Can also be accessed by holding down the `clips` menu icon.|
|`clips`|Shows a gallery of clips for this camera.|
|`image`|Shows a static image specified by the `image` parameter, can be used as a discrete default view or a screensaver (via `view.interaction_seconds`).|
|`live`| Shows the live camera view with the configured [live provider]().|
|`recording`|Shows a viewer for the most recent recording for this camera. Can also be accessed by holding down the `recordings` menu icon.|
|`recordings`|Shows a gallery of recent (last day) recordings for this camera and its dependents.|
|`snapshot`|Shows a viewer for the most recent snapshot for this camera. Can also be accessed by holding down the `snapshots` menu icon.|
|`snapshots`|Shows a gallery of snapshots for this camera.|
|`timeline`|Shows an event timeline.|

The default view is `live`, but can be configured by the `view.default` parameter.

## Fully expanded reference

[](common/expanded-warning.md ':include')

```yaml
view:
  default: live
  camera_select: current
  interaction_seconds: 300
  update_seconds: 0
  update_force: false
  update_cycle_camera: false
  update_entities:
    - binary_sensor.my_motion_sensor
  render_entities:
    - switch.render_card
  dark_mode: 'off'
  triggers:
    show_trigger_status: false
    filter_selected_camera: true
    untrigger_seconds: 0
    actions:
      interaction_mode: inactive
      trigger: default
      untrigger: none
  actions:
    entity: light.office_main_lights
    tap_action:
      action: none
    hold_action:
      action: none
    double_tap_action:
      action: none
    start_tap_action:
      action: none
    end_tap_action:
      action: none
```