import { FieldProcessor, FieldSchema, ValueType } from '@ephox/boulder';
import { Optional } from '@ephox/katamari';

import * as Boxes from '../../alien/Boxes';
import * as Fields from '../../data/Fields';
import { ScrollableBounds } from './DockingTypes';

export default [
  FieldSchema.optionObjOf('contextual', [
    FieldSchema.requiredString('fadeInClass'),
    FieldSchema.requiredString('fadeOutClass'),
    FieldSchema.requiredString('transitionClass'),
    FieldSchema.requiredFunction('lazyContext'),
    Fields.onHandler('onShow'),
    Fields.onHandler('onShown'),
    Fields.onHandler('onHide'),
    Fields.onHandler('onHidden')
  ]),
  FieldSchema.defaultedFunction('lazyViewport', (): ScrollableBounds => {
    return {
      bounds: Boxes.win(),
      scroll: Optional.none()
    };
  }),
  FieldSchema.defaultedArrayOf('modes', [ 'top', 'bottom' ], ValueType.string),
  Fields.onHandler('onDocked'),
  Fields.onHandler('onUndocked')
] as FieldProcessor[];
