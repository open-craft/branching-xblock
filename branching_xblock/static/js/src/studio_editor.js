function BranchingStudioEditor(runtime, element, data) {
  const Templates = {};
  ['settings-panel','node-block','choice-row'].forEach(name => {
    const src = document.getElementById(name+'-tpl').innerHTML;
    Templates[name] = Handlebars.compile(src);
  });
  Handlebars.registerHelper('inc', value => parseInt(value,10) + 1);
  Handlebars.registerHelper('eq', (a,b) => a === b);
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
        choices: [],
        hint: ''
      });
    }

    $editor.append(Templates['settings-panel'](state));

    nodes.forEach((node, idx) => {

      const options = nodes.map((n, j) => ({
        id: n.id,
        label: `Node ${j+1}`
      })).filter(opt => opt.id !== node.id);

      const html = Templates['node-block']({ node, idx });

      const $nodeEl = $(html);
      (node.choices||[]).forEach((choice,i) => {
        const ch = Templates['choice-row']({ choice, i, options });
        $nodeEl.find('.choices-container').append(ch);
      });
      $editor.append($nodeEl);
    });

    $editor.append(
      '<button type="button" class="btn-add-node">Add Node</button>'
    );

    bindInteractions();
    bindActions();
  }

  function bindInteractions() {
    $editor.find('.btn-delete-node').off('click').on('click', function() {
      $(this).closest('.node-block').remove();
      $editor.find('.node-block').each((i, el) => {
          $(el).attr('data-node-idx', i)
               .find('.node-title').text(`Node ${i+1}`);
      });
    });

    $editor.off('click', '.btn-add-choice').on('click', '.btn-add-choice', function() {
      const $container = $(this).closest('.choices-container');
      const currentNodeId = $(this).closest('.node-block').data('node-id');
      const options = $editor.find('.node-block').map((j, nb) => ({
        id:  $(nb).data('node-id'),
        label: `Node ${j+1}`
      })).get().filter(opt => opt.id !== currentNodeId);
      const newIndex = $container.find('.choice-row').length;
      const html = Templates['choice-row']({
        choice: { text: '', target_node_id: '' },
        i: newIndex,
        options
      });
      $container.append(html);
    });

  $editor.off('click', '.btn-delete-choice').on('click', '.btn-delete-choice', function() {
    $(this).closest('.choice-row').remove();
  });

    $editor.find('.btn-add-node').off('click').on('click', function() {
      const idx = $editor.find('.node-block').length;
      const nodeId = `temp-${idx}`;
      const nodeContext = {
        node: {
          id:      nodeId,
          content: '',
          media:   { type: '', url: '' },
          choices: [],
          hint:    ''
        },
        idx
      };
      const html = Templates['node-block'](nodeContext);
      const $newNode = $(html);
      $(this).before($newNode);
      bindInteractions();
    });
  }

  function bindActions() {

    const $settings = $editor.find('.settings');

    $saveBtn.off('click').on('click', function() {
      const payload = {
          nodes: [],
          enable_undo:    $settings.find('[name="enable_undo"]').is(':checked'),
          enable_scoring: $settings.find('[name="enable_scoring"]').is(':checked'),
          enable_hints:   $settings.find('[name="enable_hints"]').is(':checked'),
          max_score:      parseFloat($settings.find('[name="max_score"]').val()) || 0
      };

      $editor.find('.node-block').each(function() {
        const $n = $(this);
        const content = $n.find('.node-content').val().trim();
        const mediaUrl = $n.find('.media-url').val().trim();
        const mediaType = $n.find('.media-type').val();
        const choices = [];
        const nodeHint = $n.find('.node-hint').val()?.trim() || '';

        $n.find('.choice-row').each(function() {
          const $c = $(this);
          const text   = $c.find('.choice-text').val().trim();
          const target = $c.find('.choice-target').val().trim();
          if (text && target) {
              choices.push({ text: text, target_node_id: target });
          }
        });
        if (content || mediaUrl || choices.length) {
          payload.nodes.push({
              id:     $n.data('node-id'),
              content,
              media:  { type: mediaType, url: mediaUrl },
              choices,
              hint: nodeHint
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
            runtime.notify('save',  { state: 'end' });
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
