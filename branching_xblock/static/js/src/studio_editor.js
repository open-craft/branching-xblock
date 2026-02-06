function BranchingStudioEditor(runtime, element, data) {
  const Templates = {};
  ['settings-step', 'nodes-step', 'node-list-item', 'node-editor', 'choice-row'].forEach(name => {
    const src = document.getElementById(name+'-tpl').innerHTML;
    Templates[name] = Handlebars.compile(src);
  });
  Handlebars.registerHelper('inc', value => parseInt(value,10) + 1);
  Handlebars.registerHelper('eq', (a,b) => a === b);
  const $root       = $(element);
  const $stepSettings = $root.find('[data-role="step-settings"]');
  const $stepNodes = $root.find('[data-role="step-nodes"]');
  const $errors     = $root.find('.errors');
  const $continueBtn = $root.find('[data-role="continue"]');
  const $saveBtn = $root.find('[data-role="save"]');
  const $backBtn = $root.find('[data-role="back"]');
  const $cancelBtn  = $root.find('[data-role="cancel"]');

  this.uniqueIdCount = 0;

  const uniqueId = () => {
    const i = this.uniqueIdCount++;
    return `temp-${i}`;
  };

  const wizard = {
    currentStep: 'settings',
    selectedNodeId: null,
    draftSettings: {},
    draftNodes: [],
  };

  function loadState() {
      return $.ajax({
        type: 'POST',
        url: runtime.handlerUrl(element, 'get_current_state'),
        data: '{}',
        contentType: 'application/json; charset=utf-8',
        dataType: 'json'
      });
  }

  function normalizeNode(raw) {
    const normalizeChoice = (choice) => {
      const parsedScore = Number.parseInt(choice?.score, 10);
      return {
        text: choice?.text || '',
        target_node_id: choice?.target_node_id || '',
        score: Number.isNaN(parsedScore) ? 0 : parsedScore,
      };
    };

    return {
      id: raw?.id || uniqueId(),
      content: raw?.content || '',
      media: {
        type: raw?.media?.type || '',
        url: raw?.media?.url || '',
      },
      choices: Array.isArray(raw?.choices) ? raw.choices.map(normalizeChoice) : [],
      hint: raw?.hint || '',
      overlay_text: Boolean(raw?.overlay_text),
      transcript_url: raw?.transcript_url || '',
      left_image_url: raw?.left_image_url ?? null,
      right_image_url: raw?.right_image_url ?? null,
    };
  }

  function normalizeInitialState(state) {
    const nodes = Object.values(state?.nodes || {}).map(normalizeNode);
    if (!nodes.length) {
      nodes.push(normalizeNode({}));
    }
    wizard.draftNodes = nodes;
    wizard.selectedNodeId = nodes[0].id;
    wizard.draftSettings = {
      display_name: state?.display_name || '',
      enable_undo: Boolean(state?.enable_undo),
      enable_scoring: Boolean(state?.enable_scoring),
      enable_reset_activity: Boolean(state?.enable_reset_activity),
      background_image_url: state?.background_image_url || '',
      background_image_alt_text: state?.background_image_alt_text || '',
      background_image_is_decorative: Boolean(state?.background_image_is_decorative),
    };
  }

  function showStep(step) {
    wizard.currentStep = step;
    const showSettings = step === 'settings';
    $stepSettings.attr('hidden', !showSettings);
    $stepNodes.attr('hidden', showSettings);
    $continueBtn.attr('hidden', !showSettings);
    $saveBtn.attr('hidden', showSettings);
    $backBtn.attr('hidden', showSettings);
  }

  function nodeIndexById(nodeId) {
    return wizard.draftNodes.findIndex(n => n.id === nodeId);
  }

  function currentNode() {
    const idx = nodeIndexById(wizard.selectedNodeId);
    return idx >= 0 ? wizard.draftNodes[idx] : null;
  }

  function nodeOptions(excludeNodeId) {
    return wizard.draftNodes
      .map((n, idx) => ({ id: n.id, label: `Node ${idx + 1}` }))
      .filter(opt => opt.id !== excludeNodeId);
  }

  function renderSettings() {
    $stepSettings.html(Templates['settings-step'](wizard.draftSettings));
  }

  function renderNodeList() {
    const $list = $stepNodes.find('[data-role="node-list"]').empty();
    wizard.draftNodes.forEach((n, idx) => {
      $list.append(Templates['node-list-item']({
        id: n.id,
        number: idx + 1,
        is_selected: n.id === wizard.selectedNodeId,
      }));
    });

    const atLimit = wizard.draftNodes.length >= 30;
    $stepNodes.find('[data-role="add-node"]').prop('disabled', atLimit);
  }

  function renderNodeEditor() {
    const node = currentNode();
    const idx = nodeIndexById(wizard.selectedNodeId);
    if (!node || idx < 0) {
      $stepNodes.find('[data-role="node-editor"]').empty();
      return;
    }

    const mediaType = node.media?.type || '';
    const isImage = mediaType === 'image';
    const showMediaUrl = Boolean(mediaType) && !isImage;
    const showTranscript = mediaType === 'audio' || mediaType === 'video';
    const showOverlay = mediaType === 'image';
    const noBranches = !Array.isArray(node.choices) || node.choices.length === 0;

    const leftImageUrl = isImage
      ? (node.left_image_url ?? node.media?.url ?? '')
      : '';
    const rightImageUrl = isImage
      ? (node.right_image_url ?? '')
      : '';

    const html = Templates['node-editor']({
      ...node,
      number: idx + 1,
      is_image: isImage,
      show_media_url: showMediaUrl,
      show_transcript: showTranscript,
      show_overlay: showOverlay,
      no_branches: noBranches,
      left_image_url: leftImageUrl,
      right_image_url: rightImageUrl,
    });
    const $editor = $stepNodes.find('[data-role="node-editor"]').html(html);
    const $choices = $editor.find('[data-role="choices-container"]').empty();
    const options = nodeOptions(node.id);
    (node.choices || []).forEach((choice, i) => {
      $choices.append(Templates['choice-row']({ choice, i, options }));
    });
  }

  function renderNodesStep() {
    $stepNodes.html(Templates['nodes-step']({}));
    renderNodeList();
    renderNodeEditor();
  }

  function renderAll() {
    $errors.empty();
    renderSettings();
    renderNodesStep();
    showStep(wizard.currentStep);
  }

  function syncSettingsFromDom() {
    const $s = $stepSettings;
    wizard.draftSettings.display_name = $s.find('[name="display_name"]').val()?.trim() || '';
    wizard.draftSettings.enable_undo = $s.find('[name="enable_undo"]').is(':checked');
    wizard.draftSettings.enable_reset_activity = $s.find('[name="enable_reset_activity"]').is(':checked');
    wizard.draftSettings.enable_scoring = $s.find('[name="enable_scoring"]').is(':checked');
    wizard.draftSettings.background_image_url = $s.find('[name="background_image_url"]').val()?.trim() || '';
    wizard.draftSettings.background_image_is_decorative = $s.find('[name="background_image_is_decorative"]').is(':checked');
    wizard.draftSettings.background_image_alt_text = $s.find('[name="background_image_alt_text"]').val()?.trim() || '';
  }

  function syncCurrentNodeFromDom() {
    const node = currentNode();
    if (!node) {
      return;
    }
    const $e = $stepNodes.find('.bx-node-editor-inner');
    node.content = $e.find('[data-role="node-content"]').val() || '';
    node.hint = $e.find('[data-role="node-hint"]').val() || '';

    const mediaType = $e.find('[data-role="media-type"]').val() || '';
    const mediaUrl = $e.find('[data-role="media-url"]').val()?.trim() || '';
    const transcriptUrl = $e.find('[data-role="transcript-url"]').val()?.trim() || '';
    node.media.type = mediaType;
    node.media.url = (mediaType && mediaType !== 'image') ? mediaUrl : '';
    node.transcript_url = (mediaType === 'audio' || mediaType === 'video') ? transcriptUrl : '';
    node.overlay_text = mediaType === 'image' ? $e.find('[data-role="overlay-text"]').is(':checked') : false;

    if (mediaType === 'image') {
      node.left_image_url = $e.find('[data-role="left-image-url"]').val()?.trim() || '';
      node.right_image_url = $e.find('[data-role="right-image-url"]').val()?.trim() || '';
    } else {
      node.left_image_url = '';
      node.right_image_url = '';
    }

    const noBranches = $e.find('[data-role="no-branches"]').is(':checked');
    if (noBranches) {
      node.choices = [];
      return;
    }

    const choices = [];
    $e.find('.choice-row').each(function() {
      const $row = $(this);
      const text = $row.find('.choice-text').val()?.trim() || '';
      const target = $row.find('.choice-target').val()?.trim() || '';
      const parsedScore = Number.parseInt($row.find('.choice-score').val(), 10);
      const score = Number.isNaN(parsedScore) ? 0 : parsedScore;
      if (text || target) {
        choices.push({ text, target_node_id: target, score });
      }
    });
    node.choices = choices;
  }

  function showErrors(res) {
    const errs = (res.field_errors || {}).nodes_json || [res.message];
    $errors.empty();
    errs.forEach(msg => $errors.append($('<div>').text(msg)));
  }

  function bindActions() {
    $continueBtn.off('click').on('click', function() {
      syncSettingsFromDom();
      showStep('nodes');
    });

    $backBtn.off('click').on('click', function() {
      syncCurrentNodeFromDom();
      showStep('settings');
    });

    $saveBtn.off('click').on('click', function() {
      syncSettingsFromDom();
      syncCurrentNodeFromDom();

      const payload = {
        nodes: wizard.draftNodes.map(n => ({
          id: n.id,
          content: (n.content || '').trim(),
          media: {
            type: n.media?.type || '',
            url: (n.media?.type === 'image') ? '' : (n.media?.url || '').trim(),
          },
          choices: Array.isArray(n.choices)
            ? n.choices
              .filter(c => c?.text && c?.target_node_id)
              .map(c => ({
                text: c.text,
                target_node_id: c.target_node_id,
                score: Number.isNaN(Number.parseInt(c.score, 10)) ? 0 : Number.parseInt(c.score, 10),
              }))
            : [],
          hint: (n.hint || '').trim(),
          overlay_text: Boolean(n.overlay_text),
          left_image_url: (n.left_image_url || '').trim(),
          right_image_url: (n.right_image_url || '').trim(),
          transcript_url: (n.transcript_url || '').trim(),
        })),
        enable_undo: Boolean(wizard.draftSettings.enable_undo),
        enable_scoring: Boolean(wizard.draftSettings.enable_scoring),
        enable_reset_activity: Boolean(wizard.draftSettings.enable_reset_activity),
        display_name: wizard.draftSettings.display_name || '',
        background_image_url: wizard.draftSettings.background_image_url || '',
        background_image_alt_text: wizard.draftSettings.background_image_alt_text || '',
        background_image_is_decorative: Boolean(wizard.draftSettings.background_image_is_decorative),
      };

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
          showErrors(res);
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

  function bindInteractions() {
    $root.off('change.bx-settings input.bx-settings', '[data-role="step-settings"] input, [data-role="step-settings"] textarea');
    $root.on('change.bx-settings input.bx-settings', '[data-role="step-settings"] input, [data-role="step-settings"] textarea', function() {
      syncSettingsFromDom();
      const decorative = wizard.draftSettings.background_image_is_decorative;
      const $alt = $stepSettings.find('[name="background_image_alt_text"]');
      $alt.prop('disabled', decorative);
      if (decorative) {
        $alt.val('');
        wizard.draftSettings.background_image_alt_text = '';
      }
    });

    $root.off('click.bx-nodes', '[data-role="add-node"]');
    $root.on('click.bx-nodes', '[data-role="add-node"]', function() {
      if (wizard.draftNodes.length >= 30) {
        return;
      }
      syncCurrentNodeFromDom();
      const node = normalizeNode({});
      wizard.draftNodes.push(node);
      wizard.selectedNodeId = node.id;
      renderNodeList();
      renderNodeEditor();
    });

    $root.off('click.bx-nodes', '[data-role="select-node"]');
    $root.on('click.bx-nodes', '[data-role="select-node"]', function() {
      const nodeId = $(this).data('node-id');
      if (!nodeId || nodeId === wizard.selectedNodeId) {
        return;
      }
      syncCurrentNodeFromDom();
      wizard.selectedNodeId = nodeId;
      renderNodeList();
      renderNodeEditor();
    });

    $root.off('click.bx-nodes', '[data-role="delete-node"]');
    $root.on('click.bx-nodes', '[data-role="delete-node"]', function() {
      const nodeId = $(this).data('node-id');
      if (!nodeId) {
        return;
      }
      syncCurrentNodeFromDom();

      wizard.draftNodes = wizard.draftNodes.filter(n => n.id !== nodeId);
      wizard.draftNodes.forEach(n => {
        n.choices = (n.choices || []).filter(c => c.target_node_id !== nodeId);
      });

      if (!wizard.draftNodes.length) {
        const node = normalizeNode({});
        wizard.draftNodes = [node];
        wizard.selectedNodeId = node.id;
      } else if (wizard.selectedNodeId === nodeId) {
        wizard.selectedNodeId = wizard.draftNodes[0].id;
      }

      renderNodeList();
      renderNodeEditor();
    });

    $root.off('change.bx-node', '[data-role="media-type"]');
    $root.on('change.bx-node', '[data-role="media-type"]', function() {
      syncCurrentNodeFromDom();
      renderNodeEditor();
    });

    $root.off('change.bx-node', '[data-role="no-branches"]');
    $root.on('change.bx-node', '[data-role="no-branches"]', function() {
      syncCurrentNodeFromDom();
      renderNodeEditor();
    });

    $root.off('click.bx-node', '[data-role="add-choice"]');
    $root.on('click.bx-node', '[data-role="add-choice"]', function() {
      const node = currentNode();
      if (!node) {
        return;
      }
      syncCurrentNodeFromDom();
      node.choices = Array.isArray(node.choices) ? node.choices : [];
      node.choices.push({ text: '', target_node_id: '', score: 0 });
      renderNodeEditor();
    });

    $root.off('click.bx-node', '.btn-delete-choice');
    $root.on('click.bx-node', '.btn-delete-choice', function() {
      const node = currentNode();
      if (!node) {
        return;
      }
      const idx = Number($(this).closest('.choice-row').data('choice-idx'));
      syncCurrentNodeFromDom();
      if (!Number.isNaN(idx)) {
        node.choices.splice(idx, 1);
      }
      renderNodeEditor();
    });
  }

  function init() {
    bindActions();
    bindInteractions();
    loadState().then(function(state) {
      normalizeInitialState(state || {});
      renderAll();
    });
  }

  init();
}
