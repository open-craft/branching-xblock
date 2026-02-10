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
  const $pendingDeleteSummary = $root.find('[data-role="pending-delete-summary"]');
  const $saveValidationSummary = $root.find('[data-role="save-validation-summary"]');

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
    showDeleteValidationErrors: false,
    showFieldValidationErrors: false,
    validationFieldErrorsByNodeId: new Map(),
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
      no_branches: Boolean(raw?.no_branches),
      pending_delete: false,
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
    updateFooterUi();
    updateClientValidationUi();
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

  function activeNodes() {
    return wizard.draftNodes.filter(node => !node.pending_delete);
  }

  function pendingDeleteNodes() {
    return wizard.draftNodes.filter(node => node.pending_delete);
  }

  function nodeNumberById(nodeId) {
    const idx = wizard.draftNodes.findIndex(node => node.id === nodeId);
    return idx >= 0 ? idx + 1 : null;
  }

  function buildClientValidation() {
    const errors = [];
    const seenErrors = new Set();
    const nodeErrorDetailsById = new Map();
    const nodeErrorIds = new Set();
    const fieldErrorsByNodeId = new Map();
    const pendingDeleteIds = new Set(pendingDeleteNodes().map(node => node.id));
    const active = activeNodes();

    if (!active.length) {
      errors.push('At least one active node is required.');
    }

    active.forEach((sourceNode) => {
      (sourceNode.choices || []).forEach((choice) => {
        const targetNodeId = (choice?.target_node_id || '').trim();
        if (!targetNodeId || !pendingDeleteIds.has(targetNodeId)) {
          return;
        }
        const sourceNumber = nodeNumberById(sourceNode.id);
        const targetNumber = nodeNumberById(targetNodeId);
        let message;
        if (sourceNumber && targetNumber) {
          message = `Cannot delete Node ${targetNumber} because it is referenced by Node ${sourceNumber}.`;
          if (!seenErrors.has(message)) {
            seenErrors.add(message);
            errors.push(message);
          }
        } else {
          message = 'Cannot delete a node that is still referenced by another node.';
          if (!seenErrors.has(message)) {
            seenErrors.add(message);
            errors.push(message);
          }
        }
        nodeErrorIds.add(sourceNode.id);
        nodeErrorIds.add(targetNodeId);
        if (!nodeErrorDetailsById.has(targetNodeId)) {
          if (sourceNumber && targetNumber) {
            nodeErrorDetailsById.set(
              targetNodeId,
              `Node ${targetNumber} is referenced by Node ${sourceNumber}.`
            );
          } else {
            nodeErrorDetailsById.set(
              targetNodeId,
              'This node is still referenced by another node in this scenario.'
            );
          }
        }
      });
    });

    active.forEach((node) => {
      const nodeFieldErrors = {};

      if (node.media?.type === 'image') {
        const leftImageUrl = (node.left_image_url || '').trim();
        const rightImageUrl = (node.right_image_url || '').trim();
        if (!leftImageUrl && !rightImageUrl) {
          nodeFieldErrors.left_image_url = 'Please enter a valid URL';
        }
      }

      const choiceDestinationByIndex = {};
      (node.choices || []).forEach((choice, index) => {
        const choiceText = (choice?.text || '').trim();
        const choiceTarget = (choice?.target_node_id || '').trim();
        if (choiceText && !choiceTarget) {
          choiceDestinationByIndex[index] = 'Required field';
        }
      });

      if (Object.keys(choiceDestinationByIndex).length > 0) {
        nodeFieldErrors.choiceDestinationByIndex = choiceDestinationByIndex;
      }

      if (Object.keys(nodeFieldErrors).length > 0) {
        fieldErrorsByNodeId.set(node.id, nodeFieldErrors);
        nodeErrorIds.add(node.id);
        errors.push(`Node ${nodeNumberById(node.id)} has required fields missing.`);
      }
    });

    return { errors, nodeErrorIds, nodeErrorDetailsById, fieldErrorsByNodeId };
  }

  function updateFooterUi() {
    if (!wizard.showFieldValidationErrors) {
      $saveValidationSummary.attr('hidden', true).text('');
    }
    const pendingCount = pendingDeleteNodes().length;
    if (wizard.currentStep !== 'nodes' || pendingCount === 0 || wizard.showFieldValidationErrors) {
      $pendingDeleteSummary.attr('hidden', true).text('');
      return;
    }
    const nodeWord = pendingCount === 1 ? 'node' : 'nodes';
    $pendingDeleteSummary
      .attr('hidden', false)
      .text(`${pendingCount} ${nodeWord} will be deleted when you save.`);
  }

  function updateClientValidationUi() {
    const validation = buildClientValidation();
    if (wizard.showDeleteValidationErrors || wizard.showFieldValidationErrors) {
      wizard.validationErrors = validation.errors;
      wizard.validationNodeErrorIds = validation.nodeErrorIds;
      wizard.validationNodeErrorDetailsById = validation.nodeErrorDetailsById;
      wizard.validationFieldErrorsByNodeId = validation.fieldErrorsByNodeId;
      const generalErrors = validation.errors.filter(msg => msg === 'At least one active node is required.');
      if (wizard.currentStep === 'nodes' && generalErrors.length) {
        $errors.empty();
        generalErrors.forEach(msg => $errors.append($('<div>').text(msg)));
      } else {
        $errors.empty();
      }
      if (wizard.currentStep === 'nodes' && validation.errors.length > 0) {
        $saveValidationSummary
          .attr('hidden', false)
          .text("We weren't able to save your selections. Please fix the errors shown and try again.");
      } else {
        $saveValidationSummary.attr('hidden', true).text('');
      }
    } else {
      wizard.validationErrors = [];
      wizard.validationNodeErrorIds = new Set();
      wizard.validationNodeErrorDetailsById = new Map();
      wizard.validationFieldErrorsByNodeId = new Map();
      $saveValidationSummary.attr('hidden', true).text('');
      $errors.empty();
    }
    $saveBtn.prop('disabled', false);
    updateFooterUi();
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
        is_pending_delete: Boolean(n.pending_delete),
        has_errors: wizard.validationNodeErrorIds?.has(n.id),
      }));
    });

    const atLimit = activeNodes().length >= 30;
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
    const noBranches = Boolean(node.no_branches);

    const leftImageUrl = isImage
      ? (node.left_image_url ?? node.media?.url ?? '')
      : '';
    const rightImageUrl = isImage
      ? (node.right_image_url ?? '')
      : '';
    const currentNodeFieldErrors = wizard.validationFieldErrorsByNodeId?.get(node.id) || {};

    const html = Templates['node-editor']({
      ...node,
      number: idx + 1,
      is_image: isImage,
      show_media_url: showMediaUrl,
      show_transcript: showTranscript,
      show_overlay: showOverlay,
      no_branches: noBranches,
      is_pending_delete: Boolean(node.pending_delete),
      node_error_detail: wizard.validationNodeErrorDetailsById?.get(node.id) || '',
      left_image_url_error: currentNodeFieldErrors.left_image_url || '',
      left_image_url: leftImageUrl,
      right_image_url: rightImageUrl,
    });
    const $editor = $stepNodes.find('[data-role="node-editor"]').html(html);
    const $choices = $editor.find('[data-role="choices-container"]').empty();
    const options = nodeOptions(node.id);
    const choiceDestinationErrors = currentNodeFieldErrors.choiceDestinationByIndex || {};
    (node.choices || []).forEach((choice, i) => {
      $choices.append(Templates['choice-row']({
        choice,
        i,
        options,
        destination_error: choiceDestinationErrors[i] || '',
      }));
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
    updateFooterUi();
    updateClientValidationUi();
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
    node.no_branches = noBranches;
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
      const validation = buildClientValidation();
      if (validation.errors.length) {
        wizard.showDeleteValidationErrors = true;
        wizard.showFieldValidationErrors = true;
        updateClientValidationUi();
        renderNodeList();
        renderNodeEditor();
        return;
      }
      wizard.showDeleteValidationErrors = false;
      wizard.showFieldValidationErrors = false;

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
        deleted_node_ids: wizard.draftNodes
          .filter(node => node.pending_delete)
          .map(node => node.id),
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
          $saveBtn.prop('disabled', false);
        }
      }).fail(function() {
        $errors.text('Error saving scenario');
        $saveBtn.prop('disabled', false);
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
      if (activeNodes().length >= 30) {
        return;
      }
      syncCurrentNodeFromDom();
      const node = normalizeNode({});
      wizard.draftNodes.push(node);
      wizard.selectedNodeId = node.id;
      renderNodeList();
      renderNodeEditor();
      updateFooterUi();
      updateClientValidationUi();
    });

    $root.off('click.bx-nodes', '[data-role="select-node"]');
    $root.on('click.bx-nodes', '[data-role="select-node"]', function() {
      const nodeId = $(this).data('node-id');
      if (!nodeId || nodeId === wizard.selectedNodeId) {
        return;
      }
      const node = wizard.draftNodes.find(n => n.id === nodeId);
      if (!node) {
        return;
      }
      syncCurrentNodeFromDom();
      wizard.selectedNodeId = nodeId;
      renderNodeList();
      renderNodeEditor();
      updateFooterUi();
      updateClientValidationUi();
    });

    $root.off('click.bx-nodes', '[data-role="toggle-delete-node"]');
    $root.on('click.bx-nodes', '[data-role="toggle-delete-node"]', function() {
      const nodeId = $(this).data('node-id');
      if (!nodeId) {
        return;
      }
      syncCurrentNodeFromDom();
      const node = wizard.draftNodes.find(n => n.id === nodeId);
      if (!node) {
        return;
      }
      node.pending_delete = !node.pending_delete;
      wizard.showDeleteValidationErrors = false;
      wizard.showFieldValidationErrors = false;
      updateClientValidationUi();
      renderNodeList();
      renderNodeEditor();
      updateFooterUi();
    });

    $root.off('change.bx-node', '[data-role="media-type"]');
    $root.on('change.bx-node', '[data-role="media-type"]', function() {
      syncCurrentNodeFromDom();
      wizard.showFieldValidationErrors = false;
      renderNodeEditor();
      updateClientValidationUi();
    });

    $root.off('change.bx-node', '[data-role="no-branches"]');
    $root.on('change.bx-node', '[data-role="no-branches"]', function() {
      syncCurrentNodeFromDom();
      wizard.showFieldValidationErrors = false;
      renderNodeEditor();
      updateClientValidationUi();
    });

    $root.off('click.bx-node', '[data-role="add-choice"]');
    $root.on('click.bx-node', '[data-role="add-choice"]', function() {
      const node = currentNode();
      if (!node) {
        return;
      }
      syncCurrentNodeFromDom();
      node.no_branches = false;
      node.choices = Array.isArray(node.choices) ? node.choices : [];
      node.choices.push({ text: '', target_node_id: '', score: 0 });
      wizard.showFieldValidationErrors = false;
      renderNodeEditor();
      updateClientValidationUi();
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
      wizard.showFieldValidationErrors = false;
      renderNodeEditor();
      updateClientValidationUi();
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
