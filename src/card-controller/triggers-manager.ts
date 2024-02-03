import { HomeAssistant } from '@dermotduffy/custom-card-helpers';
import orderBy from 'lodash-es/orderBy';
import { getHassDifferences, isTriggeredState } from '../utils/ha';
import { Timer } from '../utils/timer';
import { View } from '../view/view';
import { CardTriggersAPI } from './types';

export class TriggersManager {
  protected _api: CardTriggersAPI;

  protected _triggeredCameras: Map<string, Date> = new Map();
  protected _triggeredCameraTimers: Map<string, Timer> = new Map();
  protected _triggeredState: Set<string> = new Set();

  constructor(api: CardTriggersAPI) {
    this._api = api;
  }

  public getTriggeredCameraIDs(): Set<string> {
    return new Set(this._triggeredCameras.keys());
  }

  public isTriggered(): boolean {
    return !!this._triggeredCameras.size;
  }

  public getMostRecentlyTriggeredCameraID(): string | null {
    const sorted = orderBy(
      [...this._triggeredCameras.entries()],
      (entry) => entry[1].getTime(),
      'desc',
    );
    return sorted.length ? sorted[0][0] : null;
  }

  public updateTriggerHAState(oldHass?: HomeAssistant | null): void {
    const scanConfig = this._api.getConfigManager().getConfig()?.view.scan;
    if (!scanConfig || !scanConfig.enabled) {
      return;
    }

    const hass = this._api.getHASSManager().getHASS();
    let triggerChanges = false;

    const visibleCameraIDs = this._api
      .getCameraManager()
      .getStore()
      .getVisibleCameraIDs();
    for (const [cameraID, config] of this._api
      .getCameraManager()
      .getStore()
      .getCameraConfigEntries(visibleCameraIDs)) {
      const triggerEntities = config.triggers.entities;
      const diffs = getHassDifferences(hass, oldHass, triggerEntities, {
        stateOnly: true,
      });
      const shouldTrigger = diffs.some((diff) => isTriggeredState(diff.newState));
      const shouldUntrigger = triggerEntities.every(
        (entity) => !isTriggeredState(hass?.states[entity]),
      );
      if (shouldTrigger) {
        this._triggeredState.add(cameraID);
        triggerChanges = true;
      } else if (shouldUntrigger && this._triggeredState.has(cameraID)) {
        this._triggeredState.delete(cameraID);
        triggerChanges = true;
      }
    }

    if (triggerChanges) {
      this._evaluateTriggers();
    }
  }

  public updateView(oldView?: View | null): void {
    if (oldView?.camera !== this._api.getViewManager().getView()?.camera) {
      // If the view changes, a new camera may have been selected, which may
      // mean a trigger is required (in the case that `filter_selected_camera`
      // is true).
      this._evaluateTriggers();
    }
  }

  protected _evaluateTriggers(): void {
    const scanConfig = this._api.getConfigManager().getConfig()?.view.scan;
    if (!scanConfig) {
      return;
    }

    const now = new Date();
    for (const cameraID of this._triggeredState.keys()) {
      if (
        !this._triggeredCameras.has(cameraID) &&
        (!scanConfig.filter_selected_camera ||
          cameraID === this._api.getViewManager().getView()?.camera)
      ) {
        this._triggeredCameras.set(cameraID, now);
        this._setConditionState();
        this._triggerAction(cameraID);
      }
    }

    for (const cameraID of this._triggeredCameras.keys()) {
      if (!this._triggeredState.has(cameraID)) {
        this._startUntriggerTimer(cameraID);
      }
    }
  }

  protected _hasAllowableInteractionStateForAction(): boolean {
    const scanConfig = this._api.getConfigManager().getConfig()?.view.scan;
    const hasInteraction = this._api.getInteractionManager().hasInteraction();

    return (
      !!scanConfig &&
      (scanConfig.actions.interaction_mode === 'all' ||
        (scanConfig.actions.interaction_mode === 'active' && hasInteraction) ||
        (scanConfig.actions.interaction_mode === 'inactive' && !hasInteraction))
    );
  }

  protected _triggerAction(cameraID: string): void {
    const action = this._api.getConfigManager().getConfig()?.view.scan.actions.trigger;

    if (action === 'live' && this._hasAllowableInteractionStateForAction()) {
      this._api.getViewManager().setViewByParameters({
        viewName: 'live',
        cameraID: cameraID,
      });
    }

    // Must update master element to add border pulsing.
    this._api.getCardElementManager().update();
  }

  protected _setConditionState(): void {
    this._api.getConditionsManager().setState({
      triggered: this._triggeredCameras.size
        ? new Set(this._triggeredCameras.keys())
        : undefined,
    });
  }

  protected _untriggerAction(cameraID: string): void {
    const action = this._api.getConfigManager().getConfig()?.view.scan.actions.untrigger;

    if (action === 'default' && this._hasAllowableInteractionStateForAction()) {
      this._api.getViewManager().setViewDefault();
    }
    this._triggeredCameras.delete(cameraID);
    this._deleteTimer(cameraID);
    this._setConditionState();

    // Must update master element to remove border pulsing.
    this._api.getCardElementManager().update();
  }

  protected _startUntriggerTimer(cameraID: string): void {
    this._deleteTimer(cameraID);

    const timer = new Timer();
    this._triggeredCameraTimers.set(cameraID, timer);
    timer.start(
      /* istanbul ignore next: the case of config being null here cannot be
         reached, as there's no way to have the untrigger call happen without
         a config. -- @preserve */
      this._api.getConfigManager().getConfig()?.view.scan.untrigger_seconds ?? 0,
      () => {
        this._untriggerAction(cameraID);
      },
    );
  }

  protected _deleteTimer(cameraID: string): void {
    this._triggeredCameraTimers.get(cameraID)?.stop();
    this._triggeredCameraTimers.delete(cameraID);
  }
}