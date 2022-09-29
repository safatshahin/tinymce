import { AlloyComponent, Attachment, Boxes, Disabling, Gui } from '@ephox/alloy';
import { Arr, Cell, Singleton } from '@ephox/katamari';
import { DomEvent, SugarElement } from '@ephox/sugar';

import Editor from 'tinymce/core/api/Editor';
import { NodeChangeEvent } from 'tinymce/core/api/EventTypes';
import { EditorUiApi } from 'tinymce/core/api/ui/Ui';

import * as Events from '../api/Events';
import { getScrollableContainer, getUiContainer, isToolbarPersist } from '../api/Options';
import { UiFactoryBackstage } from '../backstage/Backstage';
import * as ReadOnly from '../ReadOnly';
import { ModeRenderInfo, RenderArgs, RenderUiConfig } from '../Render';
import OuterContainer from '../ui/general/OuterContainer';
import { InlineHeader } from '../ui/header/InlineHeader';
import { identifyMenus } from '../ui/menus/menubar/Integration';
import { inline as loadInlineSkin } from '../ui/skin/Loader';
import { setToolbar } from './Toolbars';

const getTargetPosAndBounds = (targetElm: SugarElement, isToolbarTop: boolean) => {
  const bounds = Boxes.box(targetElm);
  return {
    pos: isToolbarTop ? bounds.y : bounds.bottom,
    bounds
  };
};

const setupEvents = (editor: Editor, targetElm: SugarElement, ui: InlineHeader, toolbarPersist: boolean) => {
  const prevPosAndBounds = Cell(getTargetPosAndBounds(targetElm, ui.isPositionedAtTop()));

  const resizeContent = (e: NodeChangeEvent | KeyboardEvent | Event) => {
    const { pos, bounds } = getTargetPosAndBounds(targetElm, ui.isPositionedAtTop());
    const { pos: prevPos, bounds: prevBounds } = prevPosAndBounds.get();

    const hasResized = bounds.height !== prevBounds.height || bounds.width !== prevBounds.width;
    prevPosAndBounds.set({ pos, bounds });

    if (hasResized) {
      Events.fireResizeContent(editor, e);
    }

    if (ui.isVisible()) {
      if (prevPos !== pos) {
        ui.update(true);
      } else if (hasResized) {
        ui.updateMode();
        ui.repositionPopups();
      }
    }
  };

  if (!toolbarPersist) {
    editor.on('activate', ui.show);
    editor.on('deactivate', ui.hide);
  }

  editor.on('SkinLoaded ResizeWindow', () => ui.update(true));

  editor.on('NodeChange keydown', (e) => {
    requestAnimationFrame(() => resizeContent(e));
  });

  editor.on('ScrollWindow', () => ui.updateMode());

  // Bind to async load events and trigger a content resize event if the size has changed
  const elementLoad = Singleton.unbindable();
  elementLoad.set(DomEvent.capture(SugarElement.fromDom(editor.getBody()), 'load', (e) => resizeContent(e.raw)));

  editor.on('remove', () => {
    elementLoad.clear();
  });
};

export interface InlineUiReferences {
  readonly mainUi: {
    outerContainer: AlloyComponent;
    mothership: Gui.GuiSystem;
  };
  readonly popupUi: {
    mothership: Gui.GuiSystem;
  };
  readonly dialogUi: {
    mothership: Gui.GuiSystem;
  };
  uiMotherships: Gui.GuiSystem[];
}

const render = (editor: Editor, uiRefs: InlineUiReferences, rawUiConfig: RenderUiConfig, backstage: UiFactoryBackstage, args: RenderArgs): ModeRenderInfo => {
  const outerContainer = uiRefs.mainUi.outerContainer;

  const floatContainer = Singleton.value<AlloyComponent>();
  const targetElm = SugarElement.fromDom(args.targetNode);
  const ui = InlineHeader(editor, targetElm, uiRefs, backstage, floatContainer);
  const toolbarPersist = isToolbarPersist(editor);

  loadInlineSkin(editor);

  const render = () => {
    if (floatContainer.isSet()) {
      ui.show();
      return;
    }

    floatContainer.set(outerContainer);

    const uiContainer = getUiContainer(editor);
    const optScroller = getScrollableContainer(editor);
    optScroller.fold(
      () => {
        Arr.each([ uiRefs.mainUi.mothership, ...uiRefs.uiMotherships ], (m) => {
          Attachment.attachSystem(uiContainer, m);
        });
      },
      (scroller) => {
        Arr.each([ uiRefs.mainUi.mothership, uiRefs.popupUi.mothership ], (m) => {
          Attachment.attachSystem(scroller, m);
        });
        Attachment.attachSystem(uiContainer, uiRefs.dialogUi.mothership);
      }
    );

    setToolbar(editor, uiRefs, rawUiConfig, backstage);

    OuterContainer.setMenubar(
      outerContainer,
      identifyMenus(editor, rawUiConfig)
    );

    // Initialise the toolbar - set initial positioning then show
    ui.show();

    setupEvents(editor, targetElm, ui, toolbarPersist);

    editor.nodeChanged();
  };

  editor.on('show', render);
  editor.on('hide', ui.hide);

  if (!toolbarPersist) {
    editor.on('focus', render);
    editor.on('blur', ui.hide);
  }

  editor.on('init', () => {
    if (editor.hasFocus() || toolbarPersist) {
      render();
    }
  });

  ReadOnly.setupReadonlyModeSwitch(editor, uiRefs);

  const api: Partial<EditorUiApi> = {
    show: render,
    hide: ui.hide,
    setEnabled: (state) => {
      ReadOnly.broadcastReadonly(uiRefs, !state);
    },
    isEnabled: () => !Disabling.isDisabled(outerContainer)
  };

  return {
    editorContainer: outerContainer.element.dom,
    api
  };
};

export {
  render
};
