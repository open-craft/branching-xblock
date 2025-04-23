function BranchingStudioEditor(runtime, element, data) {
    const $el = $(element);

    function loadState() {
        return $.ajax({
          type: 'POST',
          url: runtime.handlerUrl(element, 'get_current_state'),
          data: '{}',
          contentType: 'application/json; charset=utf-8',
          dataType: 'json'
        });
    }

    function showErrors(errors) {
        // Clear any old errors
        $el.find('.errors').remove();
        const $err = $('<div class="errors" style="color:red;"></div>');
        errors.forEach(msg => $err.append($('<div>').text(msg)));
        $el.append($err);
    }

    function render(state) {
        $el.empty();
        const settings = $(`
            <div class="settings">
              <label>
                <input type="checkbox" name="enable_undo" ${state.enable_undo ? 'checked' : ''}/>
                Allow undo
              </label>
              <label>
                <input type="checkbox" name="enable_scoring" ${state.enable_scoring ? 'checked' : ''}/>
                Enable scoring
              </label>
              <label>
                Max Score:
                <input type="number" name="max_score" value="${state.max_score}"/>
              </label>
            </div>
          `);
        $el.append(settings);

        settings.find('input, select').on('change', () => {
            runtime.notify('save', {state: 'saving'});
            const payload = {
              enable_undo:    settings.find('[name="enable_undo"]').prop('checked'),
              enable_scoring: settings.find('[name="enable_scoring"]').prop('checked'),
              max_score:      parseFloat(settings.find('[name="max_score"]').val()) || 0
            };
            $.ajax({
              type: 'POST',
              url: runtime.handlerUrl(element, 'save_settings'),
              data: JSON.stringify(payload),
              contentType: 'application/json; charset=utf-8',
              dataType: 'json'
            })
            .always(() => runtime.notify('save', {state: 'saved'}))
            .fail(xhr => showErrors([xhr.responseText]));
        });

        const $list = $('<div class="node-list"></div>');
        state.nodes.forEach((node, idx) => {
            const $node = $(`
              <div class="node" data-node-idx="${idx}">
                <div class="node-header">
                  <h3>${node.id} (${node.type})</h3>
                  <button class="delete-node">Delete</button>
                </div>
                <label>
                  Text Content (optional):
                  <textarea class="node-content">${node.content || ''}</textarea>
                </label>
                <label>
                  Media type:
                  <select class="media-type">
                    <option value="">None</option>
                    <option value="image" ${node.media?.type==='image'?'selected':''}>Image</option>
                    <option value="video" ${node.media?.type==='video'?'selected':''}>Video</option>
                  </select>
                </label>
                <label>
                  Media URL:
                  <input type="text" class="media-url" value="${node.media?.url || ''}"/>
                </label>
                <div class="choices-list" ${node.type==='end'?'hidden':''}>
                  ${node.choices.map((c,i) => `
                    <div class="choice" data-choice-idx="${i}">
                      <input class="choice-text" value="${c.text}" placeholder="Choice text"/>
                      <input class="choice-target" value="${c.target_node_id}" placeholder="Target Node ID"/>
                      <button class="delete-choice">x</button>
                    </div>
                  `).join('')}
                  <button class="add-choice">Add Choice</button>
                </div>
              </div>
            `);

            $node.find('.delete-node').on('click', () => {
                runtime.notify('save', {state: 'saving'});
                $.ajax({
                  type: 'POST',
                  url: runtime.handlerUrl(element, 'delete_node'),
                  data: JSON.stringify({node_id: node.id}),
                  contentType: 'application/json; charset=utf-8',
                  dataType: 'json'
                })
                .then(res => {
                  if (!res.success) throw (res.errors || res.error);
                  return loadState();
                })
                .then(r => render(r))
                .fail(err => showErrors(Array.isArray(err) ? err : [err]));
            });

            $node.find('.node-content, .media-type, .media-url').on('change', () => {
                const updatedNodes = state.nodes.map((n,i) => {
                  if (i !== idx) return n;
                  return {
                    ...n,
                    content: $node.find('.node-content').val(),
                    media: {
                      type: $node.find('.media-type').val(),
                      url:  $node.find('.media-url').val()
                    }
                  };
                });
                runtime.notify('save', {state: 'saving'});
                $.ajax({
                  type: 'POST',
                  url: runtime.handlerUrl(element, 'save_scenario'),
                  data: JSON.stringify({nodes: updatedNodes}),
                  contentType: 'application/json; charset=utf-8',
                  dataType: 'json'
                })
                .then(res => {
                  if (!res.success) throw (res.errors || res.error);
                  return loadState();
                })
                .then(r => render(r))
                .fail(err => showErrors(Array.isArray(err) ? err : [err]));
            });

            $node.find('.add-choice').on('click', () => {
                runtime.notify('save', {state: 'saving'});
                $.ajax({
                  type: 'POST',
                  url: runtime.handlerUrl(element, 'add_choice'),
                  data: JSON.stringify({node_index: idx}),
                  contentType: 'application/json; charset=utf-8',
                  dataType: 'json'
                })
                .then(res => {
                  if (!res.success) throw (res.errors || res.error);
                  return loadState();
                })
                .then(r => render(r))
                .fail(err => showErrors(Array.isArray(err) ? err : [err]));
            });

            $node.find('.choice-text, .choice-target').on('change', () => {
                const updatedNodes = state.nodes.map((n, i) => {
                  if (i !== idx) return n;
                  const newChoices = $node.find('.choice').map((j, choiceEl) => {
                    const $c = $(choiceEl);
                    return {
                      text:   $c.find('.choice-text').val(),
                      target_node_id: $c.find('.choice-target').val()
                    };
                  }).get();
                  return {
                    ...n,
                    choices: newChoices
                  };
                });
                runtime.notify('save', {state: 'saving'});
                $.ajax({
                  type: 'POST',
                  url: runtime.handlerUrl(element, 'save_scenario'),
                  data: JSON.stringify({nodes: updatedNodes}),
                  contentType: 'application/json; charset=utf-8',
                  dataType: 'json'
                })
                .then(res => {
                  if (!res.success) throw(res.errors || res.error);
                  return loadState();
                })
                .then(r => render(r))
                .fail(err => showErrors(Array.isArray(err) ? err : [err]));
            });

            $node.find('.delete-choice').on('click', e => {
                const ci = +$(e.target).closest('.choice').data('choice-idx');
                runtime.notify('save', {state: 'saving'});
                $.ajax({
                  type: 'POST',
                  url: runtime.handlerUrl(element, 'delete_choice'),
                  data: JSON.stringify({node_index: idx, choice_index: ci}),
                  contentType: 'application/json; charset=utf-8',
                  dataType: 'json'
                })
                .then(res => {
                  if (!res.success) throw (res.errors || res.error);
                  return loadState();
                })
                .then(r => render(r))
                .fail(err => showErrors(Array.isArray(err) ? err : [err]));
            });

            $list.append($node);
        });

        $list.append('<button class="add-node">Add Node</button>');
        $list.find('.add-node').on('click', () => {
            runtime.notify('save', {state: 'saving'});
            $.ajax({
              type: 'POST',
              url: runtime.handlerUrl(element, 'add_node'),
              data: '{}',
              contentType: 'application/json; charset=utf-8',
              dataType: 'json'
            })
            .then(res => {
              if (!res.success) throw (res.errors || res.error);
              return loadState();
            })
            .then(r => render(r))
            .fail(err => showErrors(Array.isArray(err) ? err : [err]));
        });

        $el.append($list);

    }

    render(data);
    loadState().then(r => render(r));
}
