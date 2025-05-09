function BranchingStudioEditor(runtime, element, data) {
  const $root       = $(element);
  const $editor     = $root.find('.branching-scenario-editor');
  const $errors     = $root.find('.errors');
  const $saveBtn    = $root.find('.save-button');
  const $cancelBtn  = $root.find('.cancel-button');

  function loadState() {
      return $.ajax({
        type: 'POST',
        url: runtime.handlerUrl(element, 'get_current_state'),
        data: '{}',
        contentType: 'application/json; charset=utf-8',
        dataType: 'json'
      });
  }

  function render(state) {
    $editor.empty();
    $errors.empty();

    const nodes = Object.values(state.nodes || {});
    if (!nodes.length) {
      nodes.push({
        id: 'temp',
        content: '',
        media: {type: '', url: ''},
        choices: []
      });
    }

    const $settings = $(`
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
    $editor.append($settings);

    nodes.forEach((node, idx) => {

      const nodeOptions = nodes.map((n, j) => ({
        id: n.id,
        label: `Node ${j+1}`
      })).filter(opt => opt.id !== node.id);;

      const renderOptions = selectedId => nodeOptions.map(opt =>
        `<option value="${opt.id}" ${opt.id===selectedId?'selected':''}>${opt.label}</option>`
      ).join('');

      const choiceHtml = (node.choices||[]).map((c,i) => `
        <div class="choice-row" data-choice-idx="${i}">
          <input class="choice-text" value="${c.text}" placeholder="Choice text"/>
          <select class="choice-target">
            ${ renderOptions(c.target_node_id||'') }
          </select>
          <button type="button" class="btn-delete-choice">x</button>
        </div>
      `).join('');

      const $nodeEl = $(`
        <div class="node-block" data-node-idx="${idx}" data-node-id="${node.id}">
          <div class="node-header">
            <span class="node-title">Node ${idx+1}</span>
            <button type="button" class="btn-delete-node">Delete</button>
          </div>
          <label>Content:
            <textarea class="node-content">${node.content||''}</textarea>
          </label>
          <label>Media:
            <select class="media-type">
              <option value="">None</option>
              <option value="image" ${node.media?.type==='image'?'selected':''}>Image</option>
              <option value="video" ${node.media?.type==='video'?'selected':''}>Video</option>
            </select>
            <input type="text" class="media-url" placeholder="URL"
                   value="${node.media?.url||''}"/>
          </label>
          <div class="choices-container">
            ${choiceHtml}
            <button type="button" class="btn-add-choice">Add Choice</button>
          </div>
        </div>
      `);
      $editor.append($nodeEl);
    });

    $editor.append(
      '<button type="button" class="btn-add-node">Add Node</button>'
    );

    bindInteractions();
    bindActions($settings);
  }

  function bindInteractions() {
    $editor.find('.btn-delete-node').off('click').on('click', function() {
      $(this).closest('.node-block').remove();
      $editor.find('.node-block').each((i, el) => {
          $(el).attr('data-node-idx', i)
               .find('.node-title').text(`Node ${i+1}`);
      });
    });

    $editor.find('.btn-add-choice').off('click').on('click', function() {
      const $container = $(this).closest('.choices-container');
      const currentNodeId = $(this).closest('.node-block').data('node-id');
      const nodeOptions = $editor.find('.node-block').map((j, nb) => ({
        id:  $(nb).data('node-id'),
        label: `Node ${j+1}`
      })).get().filter(opt => opt.id !== currentNodeId);
      const renderOpts = sel => nodeOptions.map(opt =>
        `<option value="${opt.id}" ${opt.id===sel?'selected':''}>${opt.label}</option>`
      ).join('');
      $container.append(`
        <div class="choice-row">
          <input class="choice-text" placeholder="Choice text"/>
          <select class="choice-target">
            ${ renderOpts('') }
          </select>
          <button type="button" class="btn-delete-choice">x</button>
        </div>
      `);
      bindInteractions();
    });

    $editor.find('.btn-delete-choice').off('click').on('click', function() {
      $(this).closest('.choice-row').remove();
    });

    $editor.find('.btn-add-node').off('click').on('click', function() {
      const idx = $editor.find('.node-block').length;
      const $newNode = $(`
        <div class="node-block" data-node-idx="${idx}" data-node-id="temp-${idx}">
          <div class="node-header">
            <span class="node-title">Node ${idx+1}</span>
            <button type="button" class="btn-delete-node">Delete</button>
          </div>
          <label>
            Content:
            <textarea class="node-content"></textarea>
          </label>
          <label>
            Media:
            <select class="media-type">
              <option value="">None</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
            <input type="text" class="media-url" placeholder="URL"/>
          </label>
          <div class="choices-container">
            <button type="button" class="btn-add-choice">Add Choice</button>
          </div>
        </div>
      `);
      $(this).before($newNode);
      bindInteractions();
    });
  }

  function bindActions($settings) {
    $saveBtn.off('click').on('click', function() {
      const payload = {
          nodes: [],
          enable_undo:    $settings.find('[name="enable_undo"]').is(':checked'),
          enable_scoring: $settings.find('[name="enable_scoring"]').is(':checked'),
          max_score:      parseFloat($settings.find('[name="max_score"]').val()) || 0
      };

      $editor.find('.node-block').each(function() {
        const $n = $(this);
        const content = $n.find('.node-content').val().trim();
        const mediaUrl = $n.find('.media-url').val().trim();
        const mediaType = $n.find('.media-type').val();
        const choices = [];

        $n.find('.choice-row').each(function() {
          const $c = $(this);
          const text   = $c.find('.choice-text').val().trim();
          const target = $c.find('.choice-target').val().trim();
          if (text || target) {
              choices.push({ text: text, target_node_id: target });
          }
        });
        if (content || mediaUrl || choices.length) {
          payload.nodes.push({
              id:     $n.data('node-id'),
              content,
              media:  { type: mediaType, url: mediaUrl },
              choices
          });
        }
      });
      runtime.notify('save', { state: 'start' });

      $.ajax({
        type: 'POST',
        url: runtime.handlerUrl(element, 'studio_submit'),
        data: JSON.stringify(payload),
        contentType: 'application/json; charset=utf-8'
      }).done(function(res) {
        if (res.result === 'success') {
            runtime.notify('save',  { state: 'saved' });
            runtime.notify('cancel', {});
        } else {
            const errs = (res.field_errors || {}).nodes_json || [res.message];
            $errors.empty();
            errs.forEach(msg => $errors.append($('<div>').text(msg)));
        }
      }).fail(function() {
          $errors.text('Error saving scenario');
      });
    });

    $cancelBtn.off('click').on('click', function(e) {
      e.preventDefault();
      runtime.notify('cancel', {});
    });
  }

  loadState().then(render);
}
