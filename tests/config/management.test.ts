import { describe, expect, it } from 'vitest';
import {
  copyConfig,
  createRangedTransform,
  deleteConfigValue,
  deleteTransform,
  deleteWithOverrides,
  getArrayConfigPath,
  getConfigValue,
  isConfigUpgradeable,
  moveConfigValue,
  setConfigValue,
  upgradeArrayOfObjects,
  upgradeConfig,
  upgradeMoveTo,
  upgradeMoveToWithOverrides,
  upgradeObjectRecursively,
  upgradeWithOverrides,
} from '../../src/config/management';
import { RawFrigateCardConfig } from '../../src/config/types';

describe('general functions', () => {
  it('should set value', () => {
    const target = {};
    setConfigValue(target, 'a', 10);
    expect(target).toEqual({
      a: 10,
    });
  });

  describe('should get value', () => {
    it('present', () => {
      expect(getConfigValue({ b: 11 }, 'b')).toEqual(11);
    });
    it('absent', () => {
      expect(getConfigValue({ b: 11 }, 'c')).toBeUndefined();
    });
    it('absent with default', () => {
      expect(getConfigValue({ b: 11 }, 'c', 12)).toBe(12);
    });
  });

  describe('should unset value', () => {
    it('nested', () => {
      const target = {
        moo: {
          foo: {
            a: 10,
          },
          bar: {
            b: 11,
          },
        },
      };
      deleteConfigValue(target, 'moo.foo');
      expect(target).toEqual({ moo: { bar: { b: 11 } } });
    });

    it('top-level', () => {
      const target = {
        a: 10,
        b: 11,
      };
      deleteConfigValue(target, 'a');
      expect(target).toEqual({ b: 11 });
    });
  });

  it('should copy config', () => {
    const target = {
      a: {
        b: {
          c: 10,
        },
      },
    };
    const copy = copyConfig(target);

    expect(copy).toEqual(target);
    expect(copy).not.toBe(target);
  });

  it('should get array config path', () => {
    expect(getArrayConfigPath('a.#.b', 10)).toBe('a.[10].b');
  });
});

describe('upgrade functions', () => {
  it('should determine if config is upgradeable', () => {
    expect(
      // Upgrade example: rename of service_data to data.
      isConfigUpgradeable({
        type: 'custom:frigate-card',
        cameras: [{ camera_entity: 'camera.office' }],
        elements: [
          {
            type: 'icon',
            icon: 'mdi:cow',
            style: {
              right: '20px',
              top: '20px',
              color: 'white',
            },
            tap_action: {
              action: 'call-service',
              service: 'notify.persistent_notification',
              service_data: {
                message: 'Hello 1',
              },
            },
          },
        ],
      }),
    ).toBeTruthy();
  });

  describe('should create ranged transform', () => {
    describe('with numbers', () => {
      it('inside range', () => {
        expect(createRangedTransform((val) => val, 10, 20)(11)).toBe(11);
      });
      it('outside range', () => {
        expect(createRangedTransform((val) => val, 10, 20)(1)).toBe(10);
      });
      it('with a range', () => {
        expect(createRangedTransform((val) => val)(100)).toBe(100);
      });
    });
    it('with non-number', () => {
      expect(createRangedTransform((_val) => 'foo')(1)).toBe('foo');
    });
  });

  it('should return null from delete property transform', () => {
    expect(deleteTransform(10)).toBeNull();
  });

  describe('should move config value', () => {
    it('simple', () => {
      const config = {
        foo: {
          c: 10,
        },
      };
      expect(moveConfigValue(config, 'foo', 'bar')).toBeTruthy();
      expect(config).toEqual({
        bar: {
          c: 10,
        },
      });
    });

    describe('in place', () => {
      it('non-transformed', () => {
        const config = {
          foo: {
            c: 10,
          },
        };
        expect(moveConfigValue(config, 'foo', 'foo')).toBeFalsy();
        expect(config).toEqual({
          foo: {
            c: 10,
          },
        });
      });

      it('transformed', () => {
        const config = {
          foo: {
            c: 10,
          },
        };
        expect(
          moveConfigValue(config, 'foo.c', 'foo.c', { transform: (val) => String(val) }),
        ).toBeTruthy();
        expect(config).toEqual({
          foo: {
            c: '10',
          },
        });
      });
    });

    describe('with transform result', () => {
      it('move', () => {
        const config = {
          c: 10,
        };
        expect(
          moveConfigValue(config, 'c', 'd', { transform: (val) => String(val) }),
        ).toBeTruthy();
        expect(config).toEqual({ d: '10' });
      });

      it('keep original', () => {
        const config = {
          c: 10,
        };
        expect(
          moveConfigValue(config, 'c', 'd', {
            transform: (val) => String(val),
            keepOriginal: true,
          }),
        ).toBeTruthy();
        expect(config).toEqual({ c: 10, d: '10' });
      });
    });

    describe('with transform null result', () => {
      it('remove', () => {
        const config = {
          c: 10,
        };
        expect(
          moveConfigValue(config, 'c', 'd', { transform: (_val) => null }),
        ).toBeTruthy();
        expect(config).toEqual({});
      });

      it('keep', () => {
        const config = {
          c: 10,
        };
        expect(
          moveConfigValue(config, 'c', 'd', {
            transform: (_val) => null,
            keepOriginal: true,
          }),
        ).toBeFalsy();
        expect(config).toEqual({ c: 10 });
      });
    });

    it('with transform undefined result', () => {
      const config = {
        c: 10,
      };
      expect(
        moveConfigValue(config, 'c', 'd', { transform: (_val) => undefined }),
      ).toBeFalsy();
      expect(config).toEqual({ c: 10 });
    });
  });

  it('should upgrade with a move', () => {
    const config = {
      c: 10,
    };

    expect(upgradeMoveTo('c', 'd')(config)).toBeTruthy();
    expect(config).toEqual({ d: 10 });
  });

  it('should upgrade config and overrides with a move', () => {
    const config = {
      c: 10,
      overrides: [
        {
          overrides: {
            c: 10,
          },
        },
      ],
    };

    expect(upgradeMoveToWithOverrides('c', 'd')(config)).toBeTruthy();
    expect(config).toEqual({ d: 10, overrides: [{ overrides: { d: 10 } }] });
  });

  it('should upgrade config and overrides in-place', () => {
    const config = {
      c: 10,
      overrides: [
        {
          overrides: {
            c: 10,
          },
        },
      ],
    };

    expect(upgradeWithOverrides('c', (val) => String(val))(config)).toBeTruthy();
    expect(config).toEqual({ c: '10', overrides: [{ overrides: { c: '10' } }] });
  });

  describe('should upgrade array', () => {
    it('in case of non-array', () => {
      const config = { c: 10 };
      expect(upgradeArrayOfObjects('c', (_val) => false)(config)).toBeFalsy();
    });

    it('in case of non-object items', () => {
      const config = { c: [10, 11] };
      expect(upgradeArrayOfObjects('c', (_val) => false)(config)).toBeFalsy();
    });

    it('in case of array', () => {
      const config = { c: [{ d: 10 }, { d: 11 }] };
      expect(
        upgradeArrayOfObjects('c', (val) => {
          val['e'] = 12;
          return true;
        })(config),
      ).toBeTruthy();
      expect(config).toEqual({
        c: [
          {
            d: 10,
            e: 12,
          },
          {
            d: 11,
            e: 12,
          },
        ],
      });
    });
  });

  describe('should recursively upgrade', () => {
    it('ignoring simple objects', () => {
      const config = { c: 10, d: 10 };
      expect(upgradeObjectRecursively((_val) => false)(config)).toBeFalsy();
      expect(config).toEqual({ c: 10, d: 10 });
    });
    it('iterating into arrays', () => {
      const config = { values: [{ c: 10 }, { d: 10 }, 'random'] };
      expect(
        upgradeObjectRecursively((val) => {
          if (!Array.isArray(val)) {
            val['e'] = 11;
          }
          return true;
        })(config),
      ).toBeTruthy();

      expect(config).toEqual({
        e: 11,
        values: [{ c: 10, e: 11 }, { d: 10, e: 11 }, 'random'],
      });
    });
  });

  it('should have upgrades with bad input data', () => {
    expect(upgradeConfig(3 as unknown as RawFrigateCardConfig)).toBeFalsy();
  });

  it('should delete properties', () => {
    const config = { c: 10, d: 10 };
    expect(deleteWithOverrides('c')(config)).toBeTruthy();
    expect(config).toEqual({ d: 10 });
  });
});

describe('should handle version specific upgrades', () => {
  describe('v4.1.0', () => {
    describe('should rename mediaLoaded to media_loaded', () => {
      it('elements', () => {
        const config = {
          type: 'custom:frigate-card',
          cameras: [{ camera_entity: 'camera.office' }],
          elements: [
            {
              conditions: {
                mediaLoaded: true,
              },
            },
            {
              conditions: 'not an object',
            },
          ],
        };
        expect(upgradeConfig(config)).toBeTruthy();
        expect(config).toEqual({
          type: 'custom:frigate-card',
          cameras: [{ camera_entity: 'camera.office' }],
          elements: [
            {
              conditions: [
                {
                  condition: 'media_loaded' as const,
                  media_loaded: true,
                },
              ],
            },
            {
              conditions: 'not an object',
            },
          ],
        });
      });

      it('overrides', () => {
        const config = {
          type: 'custom:frigate-card',
          cameras: [{ camera_entity: 'camera.office' }],
          overrides: [
            {
              conditions: {
                mediaLoaded: true,
              },
              overrides: {
                view: {
                  default: 'clips',
                },
              },
            },
          ],
        };
        expect(upgradeConfig(config)).toBeTruthy();
        expect(config).toEqual({
          type: 'custom:frigate-card',
          cameras: [{ camera_entity: 'camera.office' }],
          overrides: [
            {
              conditions: [
                {
                  condition: 'media_loaded' as const,
                  media_loaded: true,
                },
              ],
              merge: {
                view: {
                  default: 'clips',
                },
              },
            },
          ],
        });
      });
    });

    it('should rename event_gallery to media_gallery', () => {
      const config = {
        type: 'custom:frigate-card',
        cameras: [{ camera_entity: 'camera.office' }],
        event_gallery: {
          foo: 'bar',
        },
      };
      expect(upgradeConfig(config)).toBeTruthy();
      expect(config).toEqual({
        type: 'custom:frigate-card',
        cameras: [{ camera_entity: 'camera.office' }],
        media_gallery: {
          foo: 'bar',
        },
      });
    });

    it('should rename menu.buttons.frigate_ui to menu.buttons.camera_ui', () => {
      const config = {
        type: 'custom:frigate-card',
        cameras: [{ camera_entity: 'camera.office' }],
        menu: {
          buttons: {
            frigate_ui: {
              foo: 'bar',
            },
          },
        },
        overrides: [
          {
            conditions: {},
            overrides: {
              menu: {
                buttons: {
                  frigate_ui: {
                    foo: 'bar',
                  },
                },
              },
            },
          },
        ],
      };
      expect(upgradeConfig(config)).toBeTruthy();
      expect(config).toEqual({
        type: 'custom:frigate-card',
        cameras: [{ camera_entity: 'camera.office' }],
        menu: {
          buttons: {
            camera_ui: {
              foo: 'bar',
            },
          },
        },
        overrides: [
          {
            conditions: {},
            merge: {
              menu: {
                buttons: {
                  camera_ui: {
                    foo: 'bar',
                  },
                },
              },
            },
          },
        ],
      });
    });

    it('should rename frigate ui actions', () => {
      const config = {
        type: 'custom:frigate-card',
        cameras: [{ camera_entity: 'camera.office' }],
        elements: [
          {
            type: 'icon',
            icon: 'mdi:cow',
            tap_action: {
              action: 'custom:frigate-card-action',
              frigate_card_action: 'frigate_ui',
            },
          },
        ],
        view: {
          actions: {
            double_tap_action: {
              action: 'custom:frigate-card-action',
              frigate_card_action: 'frigate_ui',
            },
          },
        },
      };
      expect(upgradeConfig(config)).toBeTruthy();
      expect(config).toEqual({
        type: 'custom:frigate-card',
        cameras: [{ camera_entity: 'camera.office' }],
        elements: [
          {
            type: 'icon',
            icon: 'mdi:cow',
            tap_action: {
              action: 'custom:frigate-card-action',
              frigate_card_action: 'camera_ui',
            },
          },
        ],
        view: {
          actions: {
            double_tap_action: {
              action: 'custom:frigate-card-action',
              frigate_card_action: 'camera_ui',
            },
          },
        },
      });
    });

    describe('should rename frigate-jsmpeg provider to jsmpeg', () => {
      it('in cameras', () => {
        const config = {
          type: 'custom:frigate-card',
          cameras: [{ live_provider: 'ha' }, { live_provider: 'frigate-jsmpeg' }],
        };
        expect(upgradeConfig(config)).toBeTruthy();
        expect(config).toEqual({
          type: 'custom:frigate-card',
          cameras: [{ live_provider: 'ha' }, { live_provider: 'jsmpeg' }],
        });
      });
    });

    describe('should move live object into cameras_global', () => {
      it.each([['image' as const], ['jsmpeg' as const], ['webrtc_card' as const]])(
        '%s',
        (objName: string) => {
          const config = {
            type: 'custom:frigate-card',
            live: {
              [objName]: {
                foo: 'bar',
              },
            },
          };
          expect(upgradeConfig(config)).toBeTruthy();
          expect(config).toEqual({
            type: 'custom:frigate-card',
            cameras_global: {
              [objName]: {
                foo: 'bar',
              },
            },
            live: {},
          });
        },
      );
    });

    describe('should convert to array and rename', () => {
      it.each([['zone' as const], ['label' as const]])(`%s`, (objName: string) => {
        const config = {
          type: 'custom:frigate-card',
          cameras: [
            { live_provider: 'ha', frigate: { [objName]: 'foo' } },
            { live_provider: 'jsmpeg' },
          ],
        };
        expect(upgradeConfig(config)).toBeTruthy();
        expect(config).toEqual({
          type: 'custom:frigate-card',
          cameras: [
            { live_provider: 'ha', frigate: { [objName + 's']: ['foo'] } },
            { live_provider: 'jsmpeg' },
          ],
        });
      });
    });

    it('should convert and rename frigate.label to frigate.labels', () => {
      const config = {
        type: 'custom:frigate-card',
        cameras: [
          { live_provider: 'ha', frigate: { zone: 'foo' } },
          { live_provider: 'jsmpeg' },
        ],
      };
      expect(upgradeConfig(config)).toBeTruthy();
      expect(config).toEqual({
        type: 'custom:frigate-card',
        cameras: [
          { live_provider: 'ha', frigate: { zones: ['foo'] } },
          { live_provider: 'jsmpeg' },
        ],
      });
    });
  });

  describe('v5.2.0 -> v6.0.0', () => {
    describe('should rename service_data to data', () => {
      it('positive case', () => {
        const config = {
          type: 'custom:frigate-card',
          cameras: [{ camera_entity: 'camera.office' }],
          elements: [
            {
              type: 'icon',
              icon: 'mdi:cow',
              style: {
                right: '20px',
                top: '20px',
                color: 'white',
              },
              tap_action: {
                action: 'call-service',
                service: 'notify.persistent_notification',
                service_data: {
                  message: 'Hello 1',
                },
              },
            },
            {
              type: 'service-button',
              title: 'title',
              service: 'service',
              service_data: {
                message: "It's a trick",
              },
            },
          ],
          view: {
            actions: {
              double_tap_action: {
                action: 'call-service',
                service: 'notify.persistent_notification',
                service_data: {
                  message: 'Hello 2',
                },
              },
              hold_action: {
                action: 'call-service',
                service: 'notify.persistent_notification',
                data: {
                  message: 'Hello 3',
                },
              },
            },
          },
        };
        expect(upgradeConfig(config)).toBeTruthy();
        expect(config).toEqual({
          type: 'custom:frigate-card',
          cameras: [{ camera_entity: 'camera.office' }],
          elements: [
            {
              type: 'icon',
              icon: 'mdi:cow',
              style: {
                right: '20px',
                top: '20px',
                color: 'white',
              },
              tap_action: {
                action: 'call-service',
                service: 'notify.persistent_notification',
                data: {
                  message: 'Hello 1',
                },
              },
            },
            {
              type: 'service-button',
              title: 'title',
              service: 'service',
              // Trick: This *is* still called service_data in HA, so should not
              // be modified.
              service_data: {
                message: "It's a trick",
              },
            },
          ],
          view: {
            actions: {
              double_tap_action: {
                action: 'call-service',
                service: 'notify.persistent_notification',
                data: {
                  message: 'Hello 2',
                },
              },
              hold_action: {
                action: 'call-service',
                service: 'notify.persistent_notification',
                data: {
                  message: 'Hello 3',
                },
              },
            },
          },
        });
      });
      it('negative case', () => {
        const config = {
          type: 'custom:frigate-card',
          cameras: [{ camera_entity: 'camera.office' }],
          view: {
            default: 'live',
          },
        };
        expect(upgradeConfig(config)).toBeFalsy();
        expect(config).toEqual({
          type: 'custom:frigate-card',
          cameras: [{ camera_entity: 'camera.office' }],
          view: {
            default: 'live',
          },
        });
      });
    });

    describe('should move PTZ elements to live', () => {
      it('case with 1 element', () => {
        const config = {
          type: 'custom:frigate-card',
          cameras: [{ camera_entity: 'camera.office' }],
          elements: [
            {
              type: 'custom:frigate-card-ptz',
              orientation: 'vertical',
              style: {
                right: '20px',
                top: '20px',
                color: 'white',
              },
              actions_up: {
                tap_action: {
                  action: 'call-service',
                  service: 'notify.persistent_notification',
                  service_data: {
                    message: 'Hello 1',
                  },
                },
              },
            },
          ],
        };
        expect(upgradeConfig(config)).toBeTruthy();
        expect(config).toEqual({
          cameras: [{ camera_entity: 'camera.office' }],
          live: {
            controls: {
              ptz: {
                actions_up: {
                  tap_action: {
                    action: 'call-service',
                    data: {
                      message: 'Hello 1',
                    },
                    service: 'notify.persistent_notification',
                  },
                },
                orientation: 'vertical',
                style: {
                  color: 'white',
                  right: '20px',
                  top: '20px',
                },
              },
            },
          },
          type: 'custom:frigate-card',
        });
      });

      it('case with >1 element', () => {
        const config = {
          type: 'custom:frigate-card',
          cameras: [{ camera_entity: 'camera.office' }],
          elements: [
            {
              type: 'custom:frigate-card-ptz',
              orientation: 'vertical',
              style: {
                right: '20px',
                top: '20px',
                color: 'white',
              },
              actions_up: {
                tap_action: {
                  action: 'call-service',
                  service: 'notify.persistent_notification',
                  service_data: {
                    message: 'Hello 1',
                  },
                },
              },
            },
            {
              type: 'service-button',
              title: 'title',
              service: 'service',
              service_data: {
                message: "It's a trick",
              },
            },
          ],
        };
        expect(upgradeConfig(config)).toBeTruthy();
        expect(config).toEqual({
          cameras: [{ camera_entity: 'camera.office' }],
          elements: [
            {
              service: 'service',
              service_data: {
                message: "It's a trick",
              },
              title: 'title',
              type: 'service-button',
            },
          ],
          live: {
            controls: {
              ptz: {
                actions_up: {
                  tap_action: {
                    action: 'call-service',
                    data: {
                      message: 'Hello 1',
                    },
                    service: 'notify.persistent_notification',
                  },
                },
                orientation: 'vertical',
                style: {
                  color: 'white',
                  right: '20px',
                  top: '20px',
                },
              },
            },
          },
          type: 'custom:frigate-card',
        });
      });

      it('case with custom conditional element with 2 PTZ but nothing else', () => {
        const config = {
          type: 'custom:frigate-card',
          cameras: [{ camera_entity: 'camera.office' }],
          elements: [
            {
              type: 'custom:frigate-card-conditional',
              conditions: {
                fullscreen: true,
                media_loaded: true,
              },
              elements: [
                {
                  type: 'custom:frigate-card-ptz',
                  orientation: 'vertical',
                  style: {
                    right: '20px',
                    top: '20px',
                    color: 'white',
                  },
                  actions_up: {
                    tap_action: {
                      action: 'call-service',
                      service: 'notify.persistent_notification',
                      service_data: {
                        message: 'Hello 1',
                      },
                    },
                  },
                },
                {
                  type: 'custom:frigate-card-ptz',
                  orientation: 'vertical',
                  style: {
                    right: '20px',
                    top: '20px',
                    color: 'white',
                  },
                  actions_up: {
                    tap_action: {
                      action: 'call-service',
                      service: 'notify.persistent_notification',
                      service_data: {
                        message: 'Hello 2',
                      },
                    },
                  },
                },
              ],
            },
          ],
        };
        expect(upgradeConfig(config)).toBeTruthy();
        expect(config).toEqual({
          cameras: [{ camera_entity: 'camera.office' }],
          live: {
            controls: {
              ptz: {
                actions_up: {
                  tap_action: {
                    action: 'call-service',
                    data: {
                      message: 'Hello 1',
                    },
                    service: 'notify.persistent_notification',
                  },
                },
                orientation: 'vertical',
                style: {
                  color: 'white',
                  right: '20px',
                  top: '20px',
                },
              },
            },
          },
          type: 'custom:frigate-card',
        });
      });

      it('case with custom conditional element with 1 PTZ and another element', () => {
        const config = {
          type: 'custom:frigate-card',
          cameras: [{ camera_entity: 'camera.office' }],
          elements: [
            {
              type: 'custom:frigate-card-conditional',
              conditions: {
                fullscreen: true,
                media_loaded: true,
              },
              elements: [
                {
                  type: 'service-button',
                  title: 'title',
                  service: 'service',
                  service_data: {
                    message: "It's a trick",
                  },
                },
                {
                  type: 'custom:frigate-card-ptz',
                  orientation: 'vertical',
                  style: {
                    right: '20px',
                    top: '20px',
                    color: 'white',
                  },
                  actions_up: {
                    tap_action: {
                      action: 'call-service',
                      service: 'notify.persistent_notification',
                      service_data: {
                        message: 'Hello 1',
                      },
                    },
                  },
                },
              ],
            },
          ],
        };
        expect(upgradeConfig(config)).toBeTruthy();
        expect(config).toEqual({
          cameras: [{ camera_entity: 'camera.office' }],
          live: {
            controls: {
              ptz: {
                actions_up: {
                  tap_action: {
                    action: 'call-service',
                    data: {
                      message: 'Hello 1',
                    },
                    service: 'notify.persistent_notification',
                  },
                },
                orientation: 'vertical',
                style: {
                  color: 'white',
                  right: '20px',
                  top: '20px',
                },
              },
            },
          },
          elements: [
            {
              type: 'custom:frigate-card-conditional',
              conditions: [
                {
                  condition: 'fullscreen' as const,
                  fullscreen: true,
                },
                {
                  condition: 'media_loaded' as const,
                  media_loaded: true,
                },
              ],
              elements: [
                {
                  type: 'service-button',
                  title: 'title',
                  service: 'service',
                  service_data: {
                    message: "It's a trick",
                  },
                },
              ],
            },
          ],
          type: 'custom:frigate-card',
        });
      });

      it('case with stock conditional element with 1 PTZ', () => {
        const config = {
          type: 'custom:frigate-card',
          cameras: [{ camera_entity: 'camera.office' }],
          elements: [
            {
              type: 'conditional',
              conditions: [{ entity: 'light.office', state: 'on' }],
              elements: [
                {
                  type: 'custom:frigate-card-ptz',
                  orientation: 'vertical',
                  style: {
                    right: '20px',
                    top: '20px',
                    color: 'white',
                  },
                  actions_up: {
                    tap_action: {
                      action: 'call-service',
                      service: 'notify.persistent_notification',
                      service_data: {
                        message: 'Hello 1',
                      },
                    },
                  },
                },
              ],
            },
          ],
        };
        expect(upgradeConfig(config)).toBeTruthy();
        expect(config).toEqual({
          cameras: [{ camera_entity: 'camera.office' }],
          live: {
            controls: {
              ptz: {
                actions_up: {
                  tap_action: {
                    action: 'call-service',
                    data: {
                      message: 'Hello 1',
                    },
                    service: 'notify.persistent_notification',
                  },
                },
                orientation: 'vertical',
                style: {
                  color: 'white',
                  right: '20px',
                  top: '20px',
                },
              },
            },
          },
          type: 'custom:frigate-card',
        });
      });

      it('case when live.controls.ptz already exists', () => {
        const config = {
          type: 'custom:frigate-card',
          cameras: [{ camera_entity: 'camera.office' }],
          live: {
            controls: {
              ptz: {
                actions_up: {
                  tap_action: {
                    action: 'call-service',
                    data: {
                      message: 'Original',
                    },
                    service: 'notify.persistent_notification',
                  },
                },
                orientation: 'vertical',
                style: {
                  color: 'white',
                  right: '20px',
                  top: '20px',
                },
              },
            },
          },
          elements: [
            {
              type: 'custom:frigate-card-ptz',
              orientation: 'vertical',
              style: {
                right: '20px',
                top: '20px',
                color: 'white',
              },
              actions_up: {
                tap_action: {
                  action: 'call-service',
                  service: 'notify.persistent_notification',
                  service_data: {
                    message: 'Replacement that should be ignored',
                  },
                },
              },
            },
          ],
        };
        expect(upgradeConfig(config)).toBeTruthy();
        expect(config).toEqual({
          cameras: [{ camera_entity: 'camera.office' }],
          live: {
            controls: {
              ptz: {
                actions_up: {
                  tap_action: {
                    action: 'call-service',
                    data: {
                      message: 'Original',
                    },
                    service: 'notify.persistent_notification',
                  },
                },
                orientation: 'vertical',
                style: {
                  color: 'white',
                  right: '20px',
                  top: '20px',
                },
              },
            },
          },
          type: 'custom:frigate-card',
        });
      });
    });

    it('should move view.timeout_seconds', () => {
      const config = {
        type: 'custom:frigate-card',
        cameras: [{ camera_entity: 'camera.office' }],
        view: {
          timeout_seconds: 200,
        },
      };
      expect(upgradeConfig(config)).toBeTruthy();
      expect(config).toEqual({
        type: 'custom:frigate-card',
        cameras: [{ camera_entity: 'camera.office' }],
        view: {
          interaction_seconds: 200,
        },
      });
    });

    describe('should handle all and never action conditions', () => {
      describe('live', () => {
        describe('lazy_unload', () => {
          it('all', () => {
            const config = {
              live: {
                lazy_unload: 'all',
              },
            };
            expect(upgradeConfig(config)).toBeTruthy();
            expect(config).toEqual({
              live: {
                lazy_unload: ['unselected', 'hidden'],
              },
            });
          });
          it('never', () => {
            const config = {
              live: {
                lazy_unload: 'never',
              },
            };
            expect(upgradeConfig(config)).toBeTruthy();
            expect(config).toEqual({
              live: {},
            });
          });
          it('other value', () => {
            const config = {
              live: {
                lazy_unload: 'unselected',
              },
            };
            expect(upgradeConfig(config)).toBeTruthy();
            expect(config).toEqual({
              live: {
                lazy_unload: ['unselected'],
              },
            });
          });
        });

        describe('auto_play', () => {
          it('all', () => {
            const config = {
              live: {
                auto_play: 'all',
              },
            };
            expect(upgradeConfig(config)).toBeTruthy();
            expect(config).toEqual({
              live: {},
            });
          });
          it('never', () => {
            const config = {
              live: {
                auto_play: 'never',
              },
            };
            expect(upgradeConfig(config)).toBeTruthy();
            expect(config).toEqual({
              live: {
                auto_play: [],
              },
            });
          });
          it('other value', () => {
            const config = {
              live: {
                auto_play: 'selected',
              },
            };
            expect(upgradeConfig(config)).toBeTruthy();
            expect(config).toEqual({
              live: {
                auto_play: ['selected'],
              },
            });
          });
        });
        describe('auto_pause', () => {
          it('all', () => {
            const config = {
              live: {
                auto_pause: 'all',
              },
            };
            expect(upgradeConfig(config)).toBeTruthy();
            expect(config).toEqual({
              live: {
                auto_pause: ['unselected', 'hidden'],
              },
            });
          });
          it('never', () => {
            const config = {
              live: {
                auto_pause: 'never',
              },
            };
            expect(upgradeConfig(config)).toBeTruthy();
            expect(config).toEqual({
              live: {},
            });
          });
          it('other value', () => {
            const config = {
              live: {
                auto_pause: 'unselected',
              },
            };
            expect(upgradeConfig(config)).toBeTruthy();
            expect(config).toEqual({
              live: {
                auto_pause: ['unselected'],
              },
            });
          });
        });
        describe('auto_mute', () => {
          it('all', () => {
            const config = {
              live: {
                auto_mute: 'all',
              },
            };
            expect(upgradeConfig(config)).toBeTruthy();
            expect(config).toEqual({
              live: {},
            });
          });
          it('never', () => {
            const config = {
              live: {
                auto_mute: 'never',
              },
            };
            expect(upgradeConfig(config)).toBeTruthy();
            expect(config).toEqual({
              live: {
                auto_mute: [],
              },
            });
          });
          it('other value', () => {
            const config = {
              live: {
                auto_mute: 'unselected',
              },
            };
            expect(upgradeConfig(config)).toBeTruthy();
            expect(config).toEqual({
              live: {
                auto_mute: ['unselected'],
              },
            });
          });
        });
        describe('auto_unmute', () => {
          it('all', () => {
            const config = {
              live: {
                auto_unmute: 'all',
              },
            };
            expect(upgradeConfig(config)).toBeTruthy();
            expect(config).toEqual({
              live: {
                auto_unmute: ['selected', 'visible', 'microphone'],
              },
            });
          });
          it('never', () => {
            const config = {
              live: {
                auto_unmute: 'never',
              },
            };
            expect(upgradeConfig(config)).toBeTruthy();
            expect(config).toEqual({
              live: {},
            });
          });
          it('other value', () => {
            const config = {
              live: {
                auto_unmute: 'selected',
              },
            };
            expect(upgradeConfig(config)).toBeTruthy();
            expect(config).toEqual({
              live: {
                auto_unmute: ['selected'],
              },
            });
          });
        });
      });

      describe('media_viewer', () => {
        describe('auto_play', () => {
          it('all', () => {
            const config = {
              media_viewer: {
                auto_play: 'all',
              },
            };
            expect(upgradeConfig(config)).toBeTruthy();
            expect(config).toEqual({
              media_viewer: {},
            });
          });
          it('never', () => {
            const config = {
              media_viewer: {
                auto_play: 'never',
              },
            };
            expect(upgradeConfig(config)).toBeTruthy();
            expect(config).toEqual({
              media_viewer: {
                auto_play: [],
              },
            });
          });
          it('other value', () => {
            const config = {
              media_viewer: {
                auto_play: 'selected',
              },
            };
            expect(upgradeConfig(config)).toBeTruthy();
            expect(config).toEqual({
              media_viewer: {
                auto_play: ['selected'],
              },
            });
          });
        });
        describe('auto_pause', () => {
          it('all', () => {
            const config = {
              media_viewer: {
                auto_pause: 'all',
              },
            };
            expect(upgradeConfig(config)).toBeTruthy();
            expect(config).toEqual({
              media_viewer: {},
            });
          });
          it('never', () => {
            const config = {
              media_viewer: {
                auto_pause: 'never',
              },
            };
            expect(upgradeConfig(config)).toBeTruthy();
            expect(config).toEqual({
              media_viewer: {
                auto_pause: [],
              },
            });
          });
          it('other value', () => {
            const config = {
              media_viewer: {
                auto_pause: 'unselected',
              },
            };
            expect(upgradeConfig(config)).toBeTruthy();
            expect(config).toEqual({
              media_viewer: {
                auto_pause: ['unselected'],
              },
            });
          });
        });
        describe('auto_mute', () => {
          it('all', () => {
            const config = {
              media_viewer: {
                auto_mute: 'all',
              },
            };
            expect(upgradeConfig(config)).toBeTruthy();
            expect(config).toEqual({
              media_viewer: {},
            });
          });
          it('never', () => {
            const config = {
              media_viewer: {
                auto_mute: 'never',
              },
            };
            expect(upgradeConfig(config)).toBeTruthy();
            expect(config).toEqual({
              media_viewer: {
                auto_mute: [],
              },
            });
          });
          it('other value', () => {
            const config = {
              media_viewer: {
                auto_mute: 'unselected',
              },
            };
            expect(upgradeConfig(config)).toBeTruthy();
            expect(config).toEqual({
              media_viewer: {
                auto_mute: ['unselected'],
              },
            });
          });
        });
        describe('auto_unmute', () => {
          it('all', () => {
            const config = {
              media_viewer: {
                auto_unmute: 'all',
              },
            };
            expect(upgradeConfig(config)).toBeTruthy();
            expect(config).toEqual({
              media_viewer: {
                auto_unmute: ['selected', 'visible'],
              },
            });
          });
          it('never', () => {
            const config = {
              media_viewer: {
                auto_unmute: 'never',
              },
            };
            expect(upgradeConfig(config)).toBeTruthy();
            expect(config).toEqual({
              media_viewer: {},
            });
          });
          it('other value', () => {
            const config = {
              media_viewer: {
                auto_unmute: 'selected',
              },
            };
            expect(upgradeConfig(config)).toBeTruthy();
            expect(config).toEqual({
              media_viewer: {
                auto_unmute: ['selected'],
              },
            });
          });
        });
      });
    });

    describe('should rename thumbnails.media to thumbnails.events_media_type', () => {
      it.each([['all' as const], ['clips' as const], ['snapshots' as const]])(
        '%s',
        (mediaEventType: string) => {
          const config = {
            live: {
              controls: {
                thumbnails: {
                  media: mediaEventType,
                },
              },
            },
          };
          expect(upgradeConfig(config)).toBeTruthy();
          expect(config).toEqual({
            live: {
              controls: {
                thumbnails: {
                  events_media_type: mediaEventType,
                },
              },
            },
          });
        },
      );
    });

    describe('should rename timeline.media to timeline.events_media_type', () => {
      it.each([['all' as const], ['clips' as const], ['snapshots' as const]])(
        '%s',
        (mediaEventType: string) => {
          const config = {
            timeline: {
              media: mediaEventType,
            },
          };
          expect(upgradeConfig(config)).toBeTruthy();
          expect(config).toEqual({
            timeline: {
              events_media_type: mediaEventType,
            },
          });
        },
      );
    });

    describe('should rename live.controls.timeline.media to live.controls.timeline.events_media_type', () => {
      it.each([['all' as const], ['clips' as const], ['snapshots' as const]])(
        '%s',
        (mediaEventType: string) => {
          const config = {
            live: {
              controls: {
                timeline: {
                  media: mediaEventType,
                },
              },
            },
          };
          expect(upgradeConfig(config)).toBeTruthy();
          expect(config).toEqual({
            live: {
              controls: {
                timeline: {
                  events_media_type: mediaEventType,
                },
              },
            },
          });
        },
      );
    });

    describe('should rename media_viewer.controls.timeline.media to media_viewer.controls.timeline.events_media_type', () => {
      it.each([['all' as const], ['clips' as const], ['snapshots' as const]])(
        '%s',
        (mediaEventType: string) => {
          const config = {
            media_viewer: {
              controls: {
                timeline: {
                  media: mediaEventType,
                },
              },
            },
          };
          expect(upgradeConfig(config)).toBeTruthy();
          expect(config).toEqual({
            media_viewer: {
              controls: {
                timeline: {
                  events_media_type: mediaEventType,
                },
              },
            },
          });
        },
      );
    });

    describe('should transform scan mode', () => {
      describe('should move and transform untrigger_reset', () => {
        it('when true', () => {
          const config = {
            type: 'custom:frigate-card',
            cameras: [{ camera_entity: 'camera.office' }],
            view: {
              scan: {
                untrigger_reset: true,
              },
            },
          };
          expect(upgradeConfig(config)).toBeTruthy();
          expect(config).toEqual({
            type: 'custom:frigate-card',
            cameras: [{ camera_entity: 'camera.office' }],
            view: {
              triggers: {
                actions: {
                  untrigger: 'default',
                },
              },
            },
          });
        });

        it('when false', () => {
          const config = {
            type: 'custom:frigate-card',
            cameras: [{ camera_entity: 'camera.office' }],
            view: {
              scan: {
                untrigger_reset: false,
              },
            },
          };
          expect(upgradeConfig(config)).toBeTruthy();
          expect(config).toEqual({
            type: 'custom:frigate-card',
            cameras: [{ camera_entity: 'camera.office' }],
            view: {
              triggers: {},
            },
          });
        });
      });

      describe('should rename view.scan.enabled to a trigger action', () => {
        it('when true', () => {
          const config = {
            view: {
              scan: {
                enabled: true,
              },
            },
          };
          expect(upgradeConfig(config)).toBeTruthy();
          expect(config).toEqual({
            view: {
              triggers: {
                filter_selected_camera: false,
                actions: {
                  trigger: 'live',
                },
              },
            },
          });
        });

        it('when false', () => {
          const config = {
            view: {
              scan: {
                enabled: false,
              },
            },
          };
          expect(upgradeConfig(config)).toBeTruthy();
          expect(config).toEqual({
            view: {
              triggers: {},
            },
          });
        });
      });
    });

    describe('should handle media layout changes', () => {
      it('from live.layout to camera_global.dimensions', () => {
        const config = {
          live: {
            layout: {
              fit: 'cover',
              position: {
                x: 42,
                y: 43,
              },
            },
          },
        };
        expect(upgradeConfig(config)).toBeTruthy();
        expect(config).toEqual({
          live: {},
          cameras_global: {
            dimensions: {
              layout: {
                fit: 'cover',
                position: {
                  x: 42,
                  y: 43,
                },
              },
            },
          },
        });
      });

      describe('from delete old media layouts', () => {
        it.each([['media_viewer' as const], ['image' as const]])(
          '%s',
          (section: string) => {
            const config = {
              [section]: {
                layout: {
                  fit: 'cover',
                  position: {
                    x: 42,
                    y: 43,
                  },
                },
              },
            };
            expect(upgradeConfig(config)).toBeTruthy();
            expect(config).toEqual({
              [section]: {},
            });
          },
        );
      });
    });

    describe('from condition object to condition array', () => {
      describe('with view condition', () => {
        it('elements', () => {
          const config = {
            type: 'custom:frigate-card',
            cameras: [{ camera_entity: 'camera.office' }],
            elements: [
              {
                conditions: {
                  view: ['clips', 'snapshots'],
                },
              },
              {
                conditions: 'not an object',
              },
            ],
          };
          expect(upgradeConfig(config)).toBeTruthy();
          expect(config).toEqual({
            type: 'custom:frigate-card',
            cameras: [{ camera_entity: 'camera.office' }],
            elements: [
              {
                conditions: [
                  {
                    condition: 'view' as const,
                    views: ['clips', 'snapshots'],
                  },
                ],
              },
              {
                conditions: 'not an object',
              },
            ],
          });
        });

        it('overrides', () => {
          const config = {
            type: 'custom:frigate-card',
            cameras: [{ camera_entity: 'camera.office' }],
            overrides: [
              {
                conditions: {
                  view: ['clips', 'snapshots'],
                },
                overrides: {
                  view: {
                    default: 'clips',
                  },
                },
              },
            ],
          };

          expect(upgradeConfig(config)).toBeTruthy();
          expect(config).toEqual({
            type: 'custom:frigate-card',
            cameras: [{ camera_entity: 'camera.office' }],
            overrides: [
              {
                conditions: [
                  {
                    condition: 'view' as const,
                    views: ['clips', 'snapshots'],
                  },
                ],
                merge: {
                  view: {
                    default: 'clips',
                  },
                },
              },
            ],
          });
        });

        it('automations', () => {
          const config = {
            type: 'custom:frigate-card',
            cameras: [{ camera_entity: 'camera.office' }],
            automations: [
              {
                conditions: {
                  view: ['clips', 'snapshots'],
                },
                actions: {
                  action: 'custom:frigate-card-action' as const,
                  frigate_card_action: 'live_substream_on' as const,
                },
              },
            ],
          };

          expect(upgradeConfig(config)).toBeTruthy();
          expect(config).toEqual({
            type: 'custom:frigate-card',
            cameras: [{ camera_entity: 'camera.office' }],
            automations: [
              {
                conditions: [
                  {
                    condition: 'view' as const,
                    views: ['clips', 'snapshots'],
                  },
                ],
                actions: {
                  action: 'custom:frigate-card-action' as const,
                  frigate_card_action: 'live_substream_on' as const,
                },
              },
            ],
          });
        });
      });

      describe('with camera condition', () => {
        it('elements', () => {
          const config = {
            type: 'custom:frigate-card',
            cameras: [{ camera_entity: 'camera.office' }],
            elements: [
              {
                conditions: {
                  camera: ['camera_1', 'camera_2'],
                },
              },
              {
                conditions: 'not an object',
              },
            ],
          };
          expect(upgradeConfig(config)).toBeTruthy();
          expect(config).toEqual({
            type: 'custom:frigate-card',
            cameras: [{ camera_entity: 'camera.office' }],
            elements: [
              {
                conditions: [
                  {
                    condition: 'camera' as const,
                    cameras: ['camera_1', 'camera_2'],
                  },
                ],
              },
              {
                conditions: 'not an object',
              },
            ],
          });
        });

        it('overrides', () => {
          const config = {
            type: 'custom:frigate-card',
            cameras: [{ camera_entity: 'camera.office' }],
            overrides: [
              {
                conditions: {
                  camera: ['camera_1', 'camera_2'],
                },
                overrides: {
                  view: {
                    default: 'clips',
                  },
                },
              },
            ],
          };

          expect(upgradeConfig(config)).toBeTruthy();
          expect(config).toEqual({
            type: 'custom:frigate-card',
            cameras: [{ camera_entity: 'camera.office' }],
            overrides: [
              {
                conditions: [
                  {
                    condition: 'camera' as const,
                    cameras: ['camera_1', 'camera_2'],
                  },
                ],
                merge: {
                  view: {
                    default: 'clips',
                  },
                },
              },
            ],
          });
        });

        it('automations', () => {
          const config = {
            type: 'custom:frigate-card',
            cameras: [{ camera_entity: 'camera.office' }],
            automations: [
              {
                conditions: {
                  camera: ['camera_1', 'camera_2'],
                },
                actions: {
                  action: 'custom:frigate-card-action' as const,
                  frigate_card_action: 'live_substream_on' as const,
                },
              },
            ],
          };

          expect(upgradeConfig(config)).toBeTruthy();
          expect(config).toEqual({
            type: 'custom:frigate-card',
            cameras: [{ camera_entity: 'camera.office' }],
            automations: [
              {
                conditions: [
                  {
                    condition: 'camera' as const,
                    cameras: ['camera_1', 'camera_2'],
                  },
                ],
                actions: {
                  action: 'custom:frigate-card-action' as const,
                  frigate_card_action: 'live_substream_on' as const,
                },
              },
            ],
          });
        });
      });

      describe('with boolean conditions', () => {
        describe.each([
          ['fullscreen' as const],
          ['expand' as const],
          ['media_loaded' as const],
        ])('%s', (condition: string) => {
          it('elements', () => {
            const config = {
              type: 'custom:frigate-card',
              cameras: [{ camera_entity: 'camera.office' }],
              elements: [
                {
                  conditions: {
                    [condition]: true,
                  },
                },
                {
                  conditions: 'not an object',
                },
              ],
            };
            expect(upgradeConfig(config)).toBeTruthy();
            expect(config).toEqual({
              type: 'custom:frigate-card',
              cameras: [{ camera_entity: 'camera.office' }],
              elements: [
                {
                  conditions: [
                    {
                      condition: condition,
                      [condition]: true,
                    },
                  ],
                },
                {
                  conditions: 'not an object',
                },
              ],
            });
          });

          it('overrides', () => {
            const config = {
              type: 'custom:frigate-card',
              cameras: [{ camera_entity: 'camera.office' }],
              overrides: [
                {
                  conditions: {
                    [condition]: true,
                  },
                  overrides: {
                    view: {
                      default: 'clips',
                    },
                  },
                },
              ],
            };

            expect(upgradeConfig(config)).toBeTruthy();
            expect(config).toEqual({
              type: 'custom:frigate-card',
              cameras: [{ camera_entity: 'camera.office' }],
              overrides: [
                {
                  conditions: [
                    {
                      condition: condition,
                      [condition]: true,
                    },
                  ],
                  merge: {
                    view: {
                      default: 'clips',
                    },
                  },
                },
              ],
            });
          });

          it('automations', () => {
            const config = {
              type: 'custom:frigate-card',
              cameras: [{ camera_entity: 'camera.office' }],
              automations: [
                {
                  conditions: {
                    [condition]: true,
                  },
                  actions: {
                    action: 'custom:frigate-card-action' as const,
                    frigate_card_action: 'live_substream_on' as const,
                  },
                },
              ],
            };

            expect(upgradeConfig(config)).toBeTruthy();
            expect(config).toEqual({
              type: 'custom:frigate-card',
              cameras: [{ camera_entity: 'camera.office' }],
              automations: [
                {
                  conditions: [
                    {
                      condition: condition,
                      [condition]: true,
                    },
                  ],
                  actions: {
                    action: 'custom:frigate-card-action' as const,
                    frigate_card_action: 'live_substream_on' as const,
                  },
                },
              ],
            });
          });
        });
      });

      describe('with state condition', () => {
        it('elements', () => {
          const config = {
            type: 'custom:frigate-card',
            cameras: [{ camera_entity: 'camera.office' }],
            elements: [
              {
                conditions: {
                  state: [
                    {
                      entity: 'binary_sensor.first',
                      state: 'on',
                    },
                    {
                      entity: 'binary_sensor.second',
                      state_not: 'off',
                    },
                    {},
                  ],
                },
              },
              {
                conditions: 'not an object',
              },
            ],
          };
          expect(upgradeConfig(config)).toBeTruthy();
          expect(config).toEqual({
            type: 'custom:frigate-card',
            cameras: [{ camera_entity: 'camera.office' }],
            elements: [
              {
                conditions: [
                  {
                    condition: 'state' as const,
                    entity: 'binary_sensor.first',
                    state: 'on',
                  },
                  {
                    condition: 'state' as const,
                    entity: 'binary_sensor.second',
                    state_not: 'off',
                  },
                ],
              },
              {
                conditions: 'not an object',
              },
            ],
          });
        });

        it('overrides', () => {
          const config = {
            type: 'custom:frigate-card',
            cameras: [{ camera_entity: 'camera.office' }],
            overrides: [
              {
                conditions: {
                  state: [
                    {
                      entity: 'binary_sensor.first',
                      state: 'on',
                    },
                    {
                      entity: 'binary_sensor.second',
                      state_not: 'off',
                    },
                    {},
                  ],
                },
                overrides: {
                  view: {
                    default: 'clips',
                  },
                },
              },
            ],
          };

          expect(upgradeConfig(config)).toBeTruthy();
          expect(config).toEqual({
            type: 'custom:frigate-card',
            cameras: [{ camera_entity: 'camera.office' }],
            overrides: [
              {
                conditions: [
                  {
                    condition: 'state' as const,
                    entity: 'binary_sensor.first',
                    state: 'on',
                  },
                  {
                    condition: 'state' as const,
                    entity: 'binary_sensor.second',
                    state_not: 'off',
                  },
                ],
                merge: {
                  view: {
                    default: 'clips',
                  },
                },
              },
            ],
          });
        });

        it('automations', () => {
          const config = {
            type: 'custom:frigate-card',
            cameras: [{ camera_entity: 'camera.office' }],
            automations: [
              {
                conditions: {
                  state: [
                    {
                      entity: 'binary_sensor.first',
                      state: 'on',
                    },
                    {
                      entity: 'binary_sensor.second',
                      state_not: 'off',
                    },
                    {},
                  ],
                },

                actions: {
                  action: 'custom:frigate-card-action' as const,
                  frigate_card_action: 'live_substream_on' as const,
                },
              },
            ],
          };

          expect(upgradeConfig(config)).toBeTruthy();
          expect(config).toEqual({
            type: 'custom:frigate-card',
            cameras: [{ camera_entity: 'camera.office' }],
            automations: [
              {
                conditions: [
                  {
                    condition: 'state' as const,
                    entity: 'binary_sensor.first',
                    state: 'on',
                  },
                  {
                    condition: 'state' as const,
                    entity: 'binary_sensor.second',
                    state_not: 'off',
                  },
                ],
                actions: {
                  action: 'custom:frigate-card-action' as const,
                  frigate_card_action: 'live_substream_on' as const,
                },
              },
            ],
          });
        });
      });

      describe('with media query condition', () => {
        it('elements', () => {
          const config = {
            type: 'custom:frigate-card',
            cameras: [{ camera_entity: 'camera.office' }],
            elements: [
              {
                conditions: {
                  media_query: 'query',
                },
              },
              {
                conditions: 'not an object',
              },
            ],
          };
          expect(upgradeConfig(config)).toBeTruthy();
          expect(config).toEqual({
            type: 'custom:frigate-card',
            cameras: [{ camera_entity: 'camera.office' }],
            elements: [
              {
                conditions: [
                  {
                    condition: 'screen' as const,
                    media_query: 'query',
                  },
                ],
              },
              {
                conditions: 'not an object',
              },
            ],
          });
        });

        it('overrides', () => {
          const config = {
            type: 'custom:frigate-card',
            cameras: [{ camera_entity: 'camera.office' }],
            overrides: [
              {
                conditions: {
                  media_query: 'query',
                },
                overrides: {
                  view: {
                    default: 'clips',
                  },
                },
              },
            ],
          };

          expect(upgradeConfig(config)).toBeTruthy();
          expect(config).toEqual({
            type: 'custom:frigate-card',
            cameras: [{ camera_entity: 'camera.office' }],
            overrides: [
              {
                conditions: [
                  {
                    condition: 'screen' as const,
                    media_query: 'query',
                  },
                ],
                merge: {
                  view: {
                    default: 'clips',
                  },
                },
              },
            ],
          });
        });

        it('automations', () => {
          const config = {
            type: 'custom:frigate-card',
            cameras: [{ camera_entity: 'camera.office' }],
            automations: [
              {
                conditions: {
                  media_query: 'query',
                },
                actions: {
                  action: 'custom:frigate-card-action' as const,
                  frigate_card_action: 'live_substream_on' as const,
                },
              },
            ],
          };

          expect(upgradeConfig(config)).toBeTruthy();
          expect(config).toEqual({
            type: 'custom:frigate-card',
            cameras: [{ camera_entity: 'camera.office' }],
            automations: [
              {
                conditions: [
                  {
                    condition: 'screen' as const,
                    media_query: 'query',
                  },
                ],
                actions: {
                  action: 'custom:frigate-card-action' as const,
                  frigate_card_action: 'live_substream_on' as const,
                },
              },
            ],
          });
        });
      });
    });

    describe('from hide to substream capability disable', () => {
      it('overrides', () => {
        const config = {
          type: 'custom:frigate-card',
          cameras: [
            { camera_entity: 'camera.office', hide: true },
            { camera_entity: 'camera.sitting_room', hide: false },
          ],
        };

        expect(upgradeConfig(config)).toBeTruthy();
        expect(config).toEqual({
          type: 'custom:frigate-card',
          cameras: [
            {
              camera_entity: 'camera.office',
              capabilities: { disable_except: 'substream' },
            },
            { camera_entity: 'camera.sitting_room' },
          ],
        });
      });

      describe('from performance profile to generic profile', () => {
        it('low performance', () => {
          const config = {
            type: 'custom:frigate-card',
            cameras: [],
            performance: {
              profile: 'low',
            },
          };

          expect(upgradeConfig(config)).toBeTruthy();
          expect(config).toEqual({
            type: 'custom:frigate-card',
            cameras: [],
            profiles: ['low-performance'],
            performance: {},
          });
        });

        it('high performance', () => {
          const config = {
            type: 'custom:frigate-card',
            cameras: [],
            performance: {
              profile: 'high',
            },
          };

          expect(upgradeConfig(config)).toBeTruthy();
          expect(config).toEqual({
            type: 'custom:frigate-card',
            cameras: [],
            performance: {},
          });
        });
      });
    });

    it('from overrides to merge', () => {
      const config = {
        type: 'custom:frigate-card',
        cameras: [],
        overrides: [
          {
            conditions: [
              {
                condition: 'view',
                view: ['clips'],
              },
            ],
            overrides: {
              menu: {
                style: 'hidden',
              },
            },
          },
        ],
      };

      expect(upgradeConfig(config)).toBeTruthy();
      expect(config).toEqual({
        type: 'custom:frigate-card',
        cameras: [],
        overrides: [
          {
            conditions: [
              {
                condition: 'view',
                view: ['clips'],
              },
            ],
            merge: {
              menu: {
                style: 'hidden',
              },
            },
          },
        ],
      });
    });
  });
});
