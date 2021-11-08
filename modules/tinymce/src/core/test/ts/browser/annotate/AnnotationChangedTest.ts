import { Waiter } from '@ephox/agar';
import { describe, it } from '@ephox/bedrock-client';
import { Cell } from '@ephox/katamari';
import { TinyHooks, TinySelections } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import Editor from 'tinymce/core/api/Editor';

import { annotate, assertHtmlContent, assertMarker } from '../../module/test/AnnotationAsserts';

describe('browser.tinymce.core.annotate.AnnotationChangedTest', () => {
  const hook = TinyHooks.bddSetupLight<Editor>({
    base_url: '/project/tinymce/js/tinymce',
    setup: (ed: Editor) => {
      ed.on('init', () => {
        ed.annotator.register('alpha', {
          decorate: (uid, data) => ({
            attributes: {
              'data-test-anything': data.anything
            },
            classes: [ ]
          })
        });

        ed.annotator.register('beta', {
          decorate: (uid, data) => ({
            attributes: {
              'data-test-something': data.something
            },
            classes: [ ]
          })
        });

        ed.annotator.register('gamma', {
          decorate: (uid, data) => ({
            attributes: {
              'data-test-something': data.something
            },
            classes: [ ]
          })
        });

        ed.annotator.register('delta', {
          decorate: (uid, data) => ({
            attributes: {
              'data-test-something': data.something
            },
            classes: [ 'delta-test' ]
          })
        });

        // NOTE: Have to use old function syntax here when accessing "arguments"
        // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
        const listener = function (state, name, obj) {
          // NOTE: These failures won't stop the tests, but they will stop it before it updates
          // the changes in changes.set
          if (state === false) {
            assert.lengthOf(arguments, 2, 'Argument count must be "2" (state, name) if state is false');
          } else {
            const { uid, nodes } = obj;
            // In this test, gamma markers span multiple nodes
            if (name === 'gamma') {
              assert.lengthOf(nodes, 2, 'Gamma annotations must have 2 nodes');
            }
            assertMarker(ed, { uid, name }, nodes);
          }

          changes.set(
            changes.get().concat([
              { uid: state ? obj.uid : null, name, state }
            ])
          );
        };

        ed.annotator.annotationChanged('alpha', listener);
        ed.annotator.annotationChanged('beta', listener);
        ed.annotator.annotationChanged('gamma', listener);
        ed.annotator.annotationChanged('delta', listener);
      });
    }
  }, [], true);

  const changes: Cell<Array<{state: boolean; name: string; uid: string}>> = Cell([ ]);

  const assertChanges = (message: string, expected: Array<{uid: string; state: boolean; name: string}>) => {
    const cs = changes.get();
    assert.deepEqual(cs, expected, `Checking changes: ${message}`);
  };

  const clearChanges = () => {
    changes.set([ ]);
  };

  const pTestAnnotationEvents = async (label: string, editor: Editor, start: number[], soffset: number, expected: Array<{ uid: string; name: string; state: boolean}>) => {
    TinySelections.setSelection(editor, start, soffset, start, soffset);
    await Waiter.pTryUntil(label, () => assertChanges('sTestAnnotationEvents.sAssertChanges', expected));
  };

  it('annotation change', async () => {
    const editor = hook.editor();
    // '<p>This |is the first paragraph</p><p>This is the second.</p><p>This is| the third.</p><p>Spanning |multiple</p><p>par||ag||raphs| now</p>'
    editor.setContent([
      '<p>This is the first paragraph</p>',
      '<p>This is the second.</p>',
      '<p>This is the third.</p>',
      '<p>Spanning multiple</p>',
      '<p>paragraphs now</p>'
    ].join(''));
    TinySelections.setSelection(editor, [ 0, 0 ], 'This '.length, [ 0, 0 ], 'This is'.length);
    annotate(editor, 'alpha', 'id-one', { anything: 'comment-1' });

    TinySelections.setSelection(editor, [ 1, 0 ], 'T'.length, [ 1, 0 ], 'This is'.length);
    annotate(editor, 'alpha', 'id-two', { anything: 'comment-two' });

    TinySelections.setSelection(editor, [ 2, 0 ], 'This is the th'.length, [ 2, 0 ], 'This is the thir'.length);
    annotate(editor, 'beta', 'id-three', { something: 'comment-three' });

    TinySelections.setSelection(editor, [ 3, 0 ], 'Spanning '.length, [ 4, 0 ], 'paragraphs'.length);
    annotate(editor, 'gamma', 'id-four', { something: 'comment-four' });

    TinySelections.setSelection(editor, [ 4, 0, 0 ], 'par'.length, [ 4, 0, 0 ], 'parag'.length);
    annotate(editor, 'delta', 'id-five', { something: 'comment-five' });

    await Waiter.pWait(500);
    clearChanges();

    assertHtmlContent(editor, [
      '<p>This <span data-mce-annotation="alpha" data-test-anything="comment-1" data-mce-annotation-uid="id-one" class="mce-annotation">is</span> the first paragraph</p>',

      '<p>T<span data-mce-annotation="alpha" data-test-anything="comment-two" data-mce-annotation-uid="id-two" class="mce-annotation">his is</span> the second.</p>',

      '<p>This is the th<span data-mce-annotation="beta" data-test-something="comment-three" data-mce-annotation-uid="id-three" class="mce-annotation">ir</span>d.</p>',

      '<p>Spanning <span data-mce-annotation="gamma" data-test-something="comment-four" data-mce-annotation-uid="id-four" class="mce-annotation">multiple</span></p>',

      '<p><span data-mce-annotation="gamma" data-test-something="comment-four" data-mce-annotation-uid="id-four" class="mce-annotation">par' +
      '<span data-mce-annotation="delta" data-test-something="comment-five" data-mce-annotation-uid="id-five" class="mce-annotation delta-test">ag</span>' +
      'raphs</span> now</p>'
    ]);

    // Outside: p(0) > text(0) > "Th".length
    // Inside: p(0) > span(1) > text(0) > 'i'.length
    // Inside: p(1) > span(1) > text(0), 'hi'.length
    // Outside: p(1) > text(2) > ' the '.length

    await Waiter.pTryUntil(
      'Waiting for no changes',
      () => assertChanges('Should be no changes', [])
    );

    await pTestAnnotationEvents(
      'No annotation at cursor',
      editor,
      [ 0, 0 ], 'Th'.length,
      [
        { state: false, name: 'delta', uid: null },
        { state: false, name: 'gamma', uid: null }
      ]
    );

    await pTestAnnotationEvents(
      'At annotation alpha, id = id-one',
      editor,
      [ 0, 1, 0 ], 'i'.length,
      [
        { state: false, name: 'delta', uid: null },
        { state: false, name: 'gamma', uid: null },
        { state: true, name: 'alpha', uid: 'id-one' }
      ]
    );

    await pTestAnnotationEvents(
      'At annotation alpha, id = id-two',
      editor,
      [ 1, 1, 0 ], 'hi'.length,
      [
        { state: false, name: 'delta', uid: null },
        { state: false, name: 'gamma', uid: null },
        { state: true, name: 'alpha', uid: 'id-one' },
        { state: true, name: 'alpha', uid: 'id-two' }
      ]
    );

    TinySelections.setSelection(editor, [ 1, 1, 0 ], 'his'.length, [ 1, 1, 0 ], 'his'.length);
    // Give it time to throttle a node change.
    await Waiter.pWait(400);
    await Waiter.pTryUntil(
      'Moving selection within the same marker (alpha id-two) ... shoud not fire change',
      () => assertChanges('checking changes',
        [
          { state: false, name: 'delta', uid: null },
          { state: false, name: 'gamma', uid: null },
          { state: true, name: 'alpha', uid: 'id-one' },
          { state: true, name: 'alpha', uid: 'id-two' }
        ]
      )
    );

    await pTestAnnotationEvents(
      'Outside annotations again',
      editor,
      [ 1, 2 ], ' the '.length,
      [
        { state: false, name: 'delta', uid: null },
        { state: false, name: 'gamma', uid: null },
        { state: true, name: 'alpha', uid: 'id-one' },
        { state: true, name: 'alpha', uid: 'id-two' },
        { state: false, name: 'alpha', uid: null }
      ]
    );

    await pTestAnnotationEvents(
      'Inside annotation beta, id = id-three',
      editor,
      [ 2, 1, 0 ], 'i'.length,
      [
        { state: false, name: 'delta', uid: null },
        { state: false, name: 'gamma', uid: null },
        { state: true, name: 'alpha', uid: 'id-one' },
        { state: true, name: 'alpha', uid: 'id-two' },
        { state: false, name: 'alpha', uid: null },
        { state: true, name: 'beta', uid: 'id-three' }
      ]
    );

    TinySelections.setSelection(editor, [ 2, 0 ], 'T'.length, [ 2, 0 ], 'T'.length);
    await Waiter.pTryUntil(
      'Moving selection outside all annotations. Should fire null',
      () => assertChanges('checking changes',
        [
          { state: false, name: 'delta', uid: null },
          { state: false, name: 'gamma', uid: null },
          { state: true, name: 'alpha', uid: 'id-one' },
          { state: true, name: 'alpha', uid: 'id-two' },
          { state: false, name: 'alpha', uid: null },
          { state: true, name: 'beta', uid: 'id-three' },
          { state: false, name: 'beta', uid: null }
        ]
      )
    );

    TinySelections.setSelection(editor, [ 2, 2 ], 'd'.length, [ 2, 2 ], 'd'.length);
    // Give it time to throttle a node change.
    await Waiter.pWait(400);
    await Waiter.pTryUntil(
      'Moving selection outside all annotations (again). Should NOT fire null because it already has',
      () => assertChanges('checking changes',
        [
          { state: false, name: 'delta', uid: null },
          { state: false, name: 'gamma', uid: null },
          { state: true, name: 'alpha', uid: 'id-one' },
          { state: true, name: 'alpha', uid: 'id-two' },
          { state: false, name: 'alpha', uid: null },
          { state: true, name: 'beta', uid: 'id-three' },
          { state: false, name: 'beta', uid: null }
        ]
      )
    );
    clearChanges();

    TinySelections.setSelection(editor, [ 4, 0, 1, 0 ], 'a'.length, [ 4, 0, 1, 0 ], 'a'.length);
    // Give it time to throttle a node change.
    await Waiter.pWait(400);
    await Waiter.pTryUntil(
      'Moving selection inside delta (which is inside gamma)',
      () => assertChanges('checking changes',
        [
          { state: true, name: 'delta', uid: 'id-five' },
          { state: true, name: 'gamma', uid: 'id-four' }
        ]
      )
    );

    TinySelections.setSelection(editor, [ 4, 0, 0 ], 'p'.length, [ 4, 0, 0 ], 'p'.length);
    // Give it time to throttle a node change.
    await Waiter.pWait(400);
    await Waiter.pTryUntil(
      'Moving selection inside just gamma (but not delta)',
      () => assertChanges('checking changes',
        [
          { state: true, name: 'delta', uid: 'id-five' },
          { state: true, name: 'gamma', uid: 'id-four' },
          { state: false, name: 'delta', uid: null }
        ]
      )
    );
  });
});
