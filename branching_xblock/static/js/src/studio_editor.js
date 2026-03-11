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

  // Keep editor state in a draft model, then sync to/from DOM on transitions.
  // This prevents partial DOM edits from immediately mutating persisted data.
  const editorState = {
    currentStep: 'settings',
    selectedNodeId: null,
    draftSettings: {},
    draftNodes: [],
    settingsFieldErrors: {},
    validationErrors: [],
    validationNodeErrorIds: new Set(),
    validationNodeErrorDetailsById: new Map(),
    validationNodeErrorTitlesById: new Map(),
    validationFieldErrorsByNodeId: new Map(),
  };

  // ---------------------------
  // Grade range slider helpers
  // ---------------------------
  function boundaryBounds(boundaryIndex, gradeRanges) {
    const lower = boundaryIndex === 0 ? 0 : gradeRanges[boundaryIndex - 1].end + 1;
    const upper = boundaryIndex === (gradeRanges.length - 2)
      ? 99
      : gradeRanges[boundaryIndex + 1].end - 1;
    return { lower, upper };
  }

  function setBoundaryValue(boundaryIndex, requestedValue) {
    const gradeRanges = editorState.draftSettings.grade_ranges;
    if (!Array.isArray(gradeRanges) || gradeRanges.length < 2) {
      return;
    }
    const current = gradeRanges[boundaryIndex];
    const next = gradeRanges[boundaryIndex + 1];
    if (!current || !next) {
      return;
    }
    const { lower, upper } = boundaryBounds(boundaryIndex, gradeRanges);
    const clamped = Math.max(lower, Math.min(upper, requestedValue));
    current.end = clamped;
    next.start = clamped + 1;
    editorState.draftSettings.grade_ranges = gradeRanges;
  }

  function renderGradeRangeSlider() {
    const $section = $stepSettings.find('[data-role="grade-range-section"]');
    if (!$section.length) {
      return;
    }
    const show = Boolean(editorState.draftSettings.enable_scoring);
    $section.toggleClass('is-hidden', !show);
    if (!show) {
      return;
    }

    const gradeRanges = editorState.draftSettings.grade_ranges;
    if (!Array.isArray(gradeRanges) || gradeRanges.length < 2) {
      return;
    }
    const percentPerPoint = 100 / 101;
    const $slider = $section.find('[data-role="grade-range-slider"]').empty();
    const $trackWrap = $('<div class="bx-grade-range__track-wrap"></div>');
    const $ticks = $('<div class="bx-grade-range__ticks"></div>');
    for (let value = 0; value <= 100; value += 10) {
      $ticks.append($('<span class="bx-grade-range__tick"></span>').text(String(value)));
    }

    const $track = $('<div class="bx-grade-range__track" data-role="grade-track"></div>');
    gradeRanges.forEach((gradeRange, index) => {
      const width = gradeRange.end - gradeRange.start + 1;
      const isFail = index === 0;
      const $segment = $('<div class="bx-grade-range__segment"></div>')
        .toggleClass('bx-grade-range__segment--fail', isFail)
        .toggleClass('bx-grade-range__segment--pass', !isFail)
        .css({
          left: `${gradeRange.start * percentPerPoint}%`,
          width: `${width * percentPerPoint}%`,
        });
      $segment.append($('<div class="bx-grade-range__segment-label"></div>').text(gradeRange.label));
      $segment.append(
        $('<div class="bx-grade-range__segment-range"></div>').text(`${gradeRange.start}-${gradeRange.end}`)
      );
      $track.append($segment);
    });

    for (let boundaryIndex = 0; boundaryIndex < gradeRanges.length - 1; boundaryIndex += 1) {
      const boundaryValue = gradeRanges[boundaryIndex].end;
      const $handle = $('<button type="button" class="bx-grade-range__handle" data-role="grade-boundary-handle"></button>')
        .attr('data-boundary-index', boundaryIndex)
        .attr('role', 'slider')
        .attr('aria-label', `Grade boundary ${boundaryIndex + 1}`)
        .attr('aria-valuemin', boundaryBounds(boundaryIndex, gradeRanges).lower)
        .attr('aria-valuemax', boundaryBounds(boundaryIndex, gradeRanges).upper)
        .attr('aria-valuenow', boundaryValue)
        .css('left', `${(boundaryValue + 1) * percentPerPoint}%`);
      $track.append($handle);
    }

    $trackWrap.append($track).append($ticks);
    $slider.append($trackWrap);
  }

  // ---------------------------
  // Initial state hydration
  // ---------------------------
  function loadState() {
      return $.ajax({
        type: 'POST',
        url: runtime.handlerUrl(element, 'get_current_state'),
        data: '{}',
        contentType: 'application/json; charset=utf-8',
        dataType: 'json'
      });
  }

  function buildDraftNode(raw) {
    const buildDraftChoice = (choice) => ({
      text: choice?.text || '',
      target_node_id: choice?.target_node_id || '',
      score: choice?.score,
    });

    return {
      id: raw?.id || uniqueId(),
      content: raw?.content || '',
      media: {
        type: raw?.media?.type || '',
        url: raw?.media?.url || '',
      },
      choices: Array.isArray(raw?.choices) ? raw.choices.map(buildDraftChoice) : [],
      no_branches: Boolean(raw?.no_branches),
      pending_delete: false,
      hint: raw?.hint || '',
      overlay_text: Boolean(raw?.overlay_text),
      transcript_url: raw?.transcript_url || '',
      left_image_url: raw?.left_image_url ?? null,
      right_image_url: raw?.right_image_url ?? null,
    };
  }

  function hydrateInitialState(state) {
    const nodes = Object.values(state?.nodes || {}).map(buildDraftNode);
    if (!nodes.length) {
      nodes.push(buildDraftNode({}));
    }
    editorState.draftNodes = nodes;
    editorState.selectedNodeId = nodes[0].id;
    editorState.draftSettings = {
      display_name: state?.display_name || '',
      enable_undo: Boolean(state?.enable_undo),
      enable_scoring: Boolean(state?.enable_scoring),
      enable_reset_activity: Boolean(state?.enable_reset_activity),
      background_image_url: state?.background_image_url || '',
      background_image_alt_text: state?.background_image_alt_text || '',
      background_image_is_decorative: Boolean(state?.background_image_is_decorative),
      grade_ranges: state?.grade_ranges,
    };
  }

  // ---------------------------
  // Step navigation + selectors
  // ---------------------------
  function showStep(step) {
    editorState.currentStep = step;
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
    return editorState.draftNodes.findIndex(n => n.id === nodeId);
  }

  function currentNode() {
    const idx = nodeIndexById(editorState.selectedNodeId);
    return idx >= 0 ? editorState.draftNodes[idx] : null;
  }

  function nodeOptions(excludeNodeId) {
    return editorState.draftNodes
      .map((n, idx) => ({ id: n.id, label: `Node ${idx + 1}` }))
      .filter(opt => opt.id !== excludeNodeId);
  }

  function activeNodes() {
    return editorState.draftNodes.filter(node => !node.pending_delete);
  }

  function pendingDeleteNodes() {
    return editorState.draftNodes.filter(node => node.pending_delete);
  }

  // Reset all rendered validation state before a fresh server response is applied.
  function clearValidationState() {
    editorState.settingsFieldErrors = {};
    editorState.validationErrors = [];
    editorState.validationNodeErrorIds = new Set();
    editorState.validationNodeErrorDetailsById = new Map();
    editorState.validationNodeErrorTitlesById = new Map();
    editorState.validationFieldErrorsByNodeId = new Map();
  }

  function updateFooterUi() {
    const pendingCount = pendingDeleteNodes().length;
    if (editorState.currentStep !== 'nodes' || pendingCount === 0 || editorState.validationErrors.length > 0) {
      $pendingDeleteSummary.attr('hidden', true).text('');
      return;
    }
    const nodeWord = pendingCount === 1 ? 'node' : 'nodes';
    $pendingDeleteSummary
      .attr('hidden', false)
      .text(`${pendingCount} ${nodeWord} will be deleted when you save.`);
  }

  function firstErroredNodeId() {
    return editorState.draftNodes.find(
      (node) => editorState.validationNodeErrorIds?.has(node.id)
    )?.id || null;
  }

  // Map backend structured errors into the editor's view model. This is the
  // canonical validation bridge from API contract -> per-field/per-node UI state.
  function applyServerValidation(res) {
    clearValidationState();

    const fieldErrors = (res && res.field_errors) || {};
    const nodeFieldErrors = fieldErrors.node_input_errors || fieldErrors.node_field_errors || {};
    const nodeErrors = fieldErrors.node_action_errors || fieldErrors.node_errors || {};
    const settingsFieldErrors = fieldErrors.settings_field_errors || {};
    const globalErrors = Array.isArray(fieldErrors.global_errors) ? fieldErrors.global_errors : [];

    Object.entries(nodeFieldErrors).forEach(([nodeId, nodeFieldError]) => {
      if (!nodeFieldError || typeof nodeFieldError !== 'object') {
        return;
      }
      editorState.validationFieldErrorsByNodeId.set(nodeId, nodeFieldError);
      editorState.validationNodeErrorIds.add(nodeId);
    });

    Object.entries(nodeErrors).forEach(([nodeId, nodeError]) => {
      if (!nodeError || typeof nodeError !== 'object') {
        return;
      }
      if (nodeError.title) {
        editorState.validationNodeErrorTitlesById.set(nodeId, nodeError.title);
      }
      if (nodeError.detail) {
        editorState.validationNodeErrorDetailsById.set(nodeId, nodeError.detail);
      }
      editorState.validationNodeErrorIds.add(nodeId);
    });

    editorState.settingsFieldErrors = settingsFieldErrors;
    editorState.validationErrors = globalErrors.slice();
  }

  // Render top-level summary area when any backend validation errors exist.
  function updateClientValidationUi() {
    const hasInlineFieldErrors =
      Object.keys(editorState.settingsFieldErrors || {}).length > 0
      || (editorState.validationFieldErrorsByNodeId && editorState.validationFieldErrorsByNodeId.size > 0)
      || (editorState.validationNodeErrorIds && editorState.validationNodeErrorIds.size > 0);

    if (editorState.validationErrors.length > 0 || hasInlineFieldErrors) {
      $errors.empty();
      editorState.validationErrors.forEach(msg => $errors.append($('<div>').text(msg)));
      $saveValidationSummary
        .attr('hidden', false)
        .text("We weren't able to save your selections. Please fix the errors shown and try again.");
    } else {
      $saveValidationSummary.attr('hidden', true).text('');
      $errors.empty();
    }
    $saveBtn.prop('disabled', false);
    updateFooterUi();
  }

  // ---------------------------
  // Render functions
  // ---------------------------
  function renderSettings() {
    $stepSettings.html(Templates['settings-step']({
      ...editorState.draftSettings,
      background_image_url_error: editorState.settingsFieldErrors.background_image_url || '',
      background_image_alt_text_error: editorState.settingsFieldErrors.background_image_alt_text || '',
      grade_ranges_error: editorState.settingsFieldErrors.grade_ranges || '',
    }));
    renderGradeRangeSlider();
  }

  function renderNodeList() {
    const incomingReferenceCounts = new Map();
    editorState.draftNodes.forEach(node => incomingReferenceCounts.set(node.id, 0));

    activeNodes().forEach((sourceNode) => {
      (sourceNode.choices || []).forEach((choice) => {
        const targetNodeId = (choice?.target_node_id || '').trim();
        if (!targetNodeId || !incomingReferenceCounts.has(targetNodeId)) {
          return;
        }
        incomingReferenceCounts.set(
          targetNodeId,
          (incomingReferenceCounts.get(targetNodeId) || 0) + 1
        );
      });
    });

    const $list = $stepNodes.find('[data-role="node-list"]').empty();
    editorState.draftNodes.forEach((n, idx) => {
      const isUnlinked = !n.pending_delete && idx > 0 && (incomingReferenceCounts.get(n.id) || 0) === 0;
      $list.append(Templates['node-list-item']({
        id: n.id,
        number: idx + 1,
        is_selected: n.id === editorState.selectedNodeId,
        is_pending_delete: Boolean(n.pending_delete),
        has_errors: editorState.validationNodeErrorIds?.has(n.id),
        is_unlinked: isUnlinked,
      }));
    });

    const atLimit = activeNodes().length >= 30;
    $stepNodes.find('[data-role="add-node"]').prop('disabled', atLimit);
  }

  function renderNodeEditor() {
    const node = currentNode();
    const idx = nodeIndexById(editorState.selectedNodeId);
    if (!node || idx < 0) {
      $stepNodes.find('[data-role="node-editor"]').empty();
      return;
    }

    const mediaType = node.media?.type || '';
    const isImage = mediaType === 'image';
    const showMediaUrl = Boolean(mediaType) && !isImage;
    const showTranscript = mediaType === 'audio' || mediaType === 'video';
    const showOverlay = mediaType === 'image';
    const hasChoices = Array.isArray(node.choices) && node.choices.length > 0;
    const noBranches = Boolean(node.no_branches) && !hasChoices;

    const leftImageUrl = isImage
      ? (node.left_image_url ?? node.media?.url ?? '')
      : '';
    const rightImageUrl = isImage
      ? (node.right_image_url ?? '')
      : '';
    const currentNodeFieldErrors = editorState.validationFieldErrorsByNodeId?.get(node.id) || {};

    const html = Templates['node-editor']({
      ...node,
      number: idx + 1,
      is_image: isImage,
      show_media_url: showMediaUrl,
      show_transcript: showTranscript,
      show_overlay: showOverlay,
      has_choices: hasChoices,
      no_branches: noBranches,
      is_pending_delete: Boolean(node.pending_delete),
      node_error_title: editorState.validationNodeErrorTitlesById?.get(node.id) || '',
      node_error_detail: editorState.validationNodeErrorDetailsById?.get(node.id) || '',
      left_image_url_error: currentNodeFieldErrors.left_image_url || '',
      left_image_url: leftImageUrl,
      right_image_url: rightImageUrl,
    });
    const $editor = $stepNodes.find('[data-role="node-editor"]').html(html);
    const $choices = $editor.find('[data-role="choices-container"]').empty();
    const options = nodeOptions(node.id);
    const choiceDestinationErrors = currentNodeFieldErrors.choiceDestinationByIndex || {};
    const choiceScoreErrors = currentNodeFieldErrors.choiceScoreByIndex || {};
    (node.choices || []).forEach((choice, i) => {
      $choices.append(Templates['choice-row']({
        choice,
        i,
        options,
        destination_error: choiceDestinationErrors[i] || '',
        score_error: choiceScoreErrors[i] || '',
      }));
    });
  }

  function renderNodesStep() {
    $stepNodes.html(Templates['nodes-step']({}));
    renderNodeList();
    renderNodeEditor();
  }

  // Full rerender used on initial load and after major state transitions.
  function renderAll() {
    $errors.empty();
    renderSettings();
    renderNodesStep();
    showStep(editorState.currentStep);
    updateFooterUi();
    updateClientValidationUi();
  }

  // ---------------------------
  // DOM -> draft synchronization
  // ---------------------------
  function syncSettingsFromDom() {
    // Pull settings fields into draft state before navigation/save.
    const $s = $stepSettings;
    editorState.draftSettings.display_name = $s.find('[name="display_name"]').val()?.trim() || '';
    editorState.draftSettings.enable_undo = $s.find('[name="enable_undo"]').is(':checked');
    editorState.draftSettings.enable_reset_activity = $s.find('[name="enable_reset_activity"]').is(':checked');
    editorState.draftSettings.enable_scoring = $s.find('[name="enable_scoring"]').is(':checked');
    editorState.draftSettings.background_image_url = $s.find('[name="background_image_url"]').val()?.trim() || '';
    editorState.draftSettings.background_image_is_decorative = $s.find('[name="background_image_is_decorative"]').is(':checked');
    editorState.draftSettings.background_image_alt_text = $s.find('[name="background_image_alt_text"]').val()?.trim() || '';
  }

  function syncCurrentNodeFromDom() {
    // Pull the currently open node editor inputs into draft state.
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
      const rawScore = $row.find('.choice-score').val();
      const score = rawScore;
      if (text || target) {
        choices.push({ text, target_node_id: target, score });
      }
    });
    node.choices = choices;
  }

  // Apply backend validation and move user to the most relevant step.
  function showErrors(res) {
    applyServerValidation(res);
    const erroredNodeId = firstErroredNodeId();
    if (erroredNodeId && !editorState.validationNodeErrorIds?.has(editorState.selectedNodeId)) {
      editorState.selectedNodeId = erroredNodeId;
    }
    renderSettings();
    renderNodeList();
    renderNodeEditor();
    if (Object.keys(editorState.settingsFieldErrors).length > 0) {
      showStep('settings');
    } else {
      showStep('nodes');
    }
  }

  // ---------------------------
  // Button actions
  // ---------------------------
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
      // Save pipeline: sync draft state and submit full payload for backend-
      // only validation. Frontend renders structured field errors from server.
      syncSettingsFromDom();
      syncCurrentNodeFromDom();
      clearValidationState();
      updateClientValidationUi();

      const payload = {
        nodes: editorState.draftNodes.map(n => ({
          id: n.id,
          content: (n.content || '').trim(),
          media: {
            type: n.media?.type || '',
            url: (n.media?.type === 'image') ? '' : (n.media?.url || '').trim(),
          },
          choices: Array.isArray(n.choices)
                ? n.choices
                  // Keep partially filled choices so backend can return field-level validation.
                  .filter(c => (c?.text || '').trim() || (c?.target_node_id || '').trim())
                  .map(c => ({
                    text: c.text,
                    target_node_id: c.target_node_id,
                    score: c.score,
                  }))
                : [],
          hint: (n.hint || '').trim(),
          overlay_text: Boolean(n.overlay_text),
          left_image_url: (n.left_image_url || '').trim(),
          right_image_url: (n.right_image_url || '').trim(),
          transcript_url: (n.transcript_url || '').trim(),
        })),
        deleted_node_ids: editorState.draftNodes
          .filter(node => node.pending_delete)
          .map(node => node.id),
        enable_undo: Boolean(editorState.draftSettings.enable_undo),
        enable_scoring: Boolean(editorState.draftSettings.enable_scoring),
        enable_reset_activity: Boolean(editorState.draftSettings.enable_reset_activity),
        display_name: editorState.draftSettings.display_name || '',
        background_image_url: editorState.draftSettings.background_image_url || '',
        background_image_alt_text: editorState.draftSettings.background_image_alt_text || '',
        background_image_is_decorative: Boolean(editorState.draftSettings.background_image_is_decorative),
        grade_ranges: (editorState.draftSettings.grade_ranges || []).map((gradeRange) => ({
          label: gradeRange.label,
          start: gradeRange.start,
          end: gradeRange.end,
        })),
      };

      $saveBtn.prop('disabled', true);
      $.ajax({
        type: 'POST',
        url: runtime.handlerUrl(element, 'studio_submit'),
        data: JSON.stringify(payload),
        contentType: 'application/json; charset=utf-8'
      }).done(function(res) {
        if (res.result === 'success') {
          // Trigger Studio's global saving animation only for successful saves.
          runtime.notify('save', { state: 'start' });
          runtime.notify('save', { state: 'end' });
          runtime.notify('cancel', {});
        } else {
          // Keep Studio editor open for backend validation errors so
          // structured field errors can be shown inline.
          showErrors(res);
          $saveBtn.prop('disabled', false);
        }
      }).fail(function() {
        // Keep editor open on transport/server failures and surface a
        // top-level message for retry.
        $errors.text('Error saving scenario');
        $saveValidationSummary
          .attr('hidden', false)
          .text("We weren't able to save your selections. Please try again.");
        $saveBtn.prop('disabled', false);
      });
    });

    $cancelBtn.off('click').on('click', function(e) {
      e.preventDefault();
      runtime.notify('cancel', {});
    });
  }

  // ---------------------------
  // Fine-grained interactions
  // ---------------------------
  function bindInteractions() {
    // Settings inputs update draft settings live and clear stale server errors.
    $root.off('change.bx-settings input.bx-settings', '[data-role="step-settings"] input, [data-role="step-settings"] textarea');
    $root.on('change.bx-settings input.bx-settings', '[data-role="step-settings"] input, [data-role="step-settings"] textarea', function() {
      syncSettingsFromDom();
      clearValidationState();
      updateClientValidationUi();
      const decorative = editorState.draftSettings.background_image_is_decorative;
      const $alt = $stepSettings.find('[name="background_image_alt_text"]');
      $alt.prop('disabled', decorative);
      if (decorative) {
        $alt.val('');
        editorState.draftSettings.background_image_alt_text = '';
      }
      renderGradeRangeSlider();
    });

    $root.off('mousedown.bx-grade-range', '[data-role="grade-boundary-handle"]');
    $root.on('mousedown.bx-grade-range', '[data-role="grade-boundary-handle"]', function(event) {
      event.preventDefault();
      const boundaryIndex = Number($(this).attr('data-boundary-index'));
      if (Number.isNaN(boundaryIndex)) {
        return;
      }

      function applyDrag(clientX) {
        const $track = $stepSettings.find('[data-role="grade-track"]');
        if (!$track.length) {
          return;
        }
        const bounds = $track[0].getBoundingClientRect();
        if (bounds.width <= 0) {
          return;
        }
        const ratio = Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width));
        const requestedValue = Math.round(ratio * 100);
        setBoundaryValue(boundaryIndex, requestedValue);
        renderGradeRangeSlider();
      }

      function stopDrag() {
        $(document).off('mousemove.bx-grade-range-drag');
        $(document).off('mouseup.bx-grade-range-drag');
      }

      applyDrag(event.clientX);
      $(document).on('mousemove.bx-grade-range-drag', function(moveEvent) {
        applyDrag(moveEvent.clientX);
      });
      $(document).on('mouseup.bx-grade-range-drag', function() {
        stopDrag();
      });
    });

    $root.off('keydown.bx-grade-range', '[data-role="grade-boundary-handle"]');
    $root.on('keydown.bx-grade-range', '[data-role="grade-boundary-handle"]', function(event) {
      const boundaryIndex = Number($(this).attr('data-boundary-index'));
      if (Number.isNaN(boundaryIndex)) {
        return;
      }
      const gradeRanges = editorState.draftSettings.grade_ranges;
      if (!Array.isArray(gradeRanges) || gradeRanges.length < 2) {
        return;
      }
      const currentBoundary = gradeRanges[boundaryIndex]?.end;
      if (typeof currentBoundary !== 'number') {
        return;
      }
      const bounds = boundaryBounds(boundaryIndex, gradeRanges);
      let nextValue = currentBoundary;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
        nextValue = currentBoundary - 1;
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        nextValue = currentBoundary + 1;
      } else if (event.key === 'Home') {
        nextValue = bounds.lower;
      } else if (event.key === 'End') {
        nextValue = bounds.upper;
      } else {
        return;
      }
      event.preventDefault();
      setBoundaryValue(boundaryIndex, nextValue);
      renderGradeRangeSlider();
    });

    // Node list actions.
    $root.off('click.bx-nodes', '[data-role="add-node"]');
    $root.on('click.bx-nodes', '[data-role="add-node"]', function() {
      if (activeNodes().length >= 30) {
        return;
      }
      syncCurrentNodeFromDom();
      const node = buildDraftNode({});
      editorState.draftNodes.push(node);
      editorState.selectedNodeId = node.id;
      clearValidationState();
      renderNodeList();
      renderNodeEditor();
      updateFooterUi();
      updateClientValidationUi();
    });

    $root.off('click.bx-nodes', '[data-role="select-node"]');
    $root.on('click.bx-nodes', '[data-role="select-node"]', function() {
      const nodeId = $(this).data('node-id');
      if (!nodeId || nodeId === editorState.selectedNodeId) {
        return;
      }
      const node = editorState.draftNodes.find(n => n.id === nodeId);
      if (!node) {
        return;
      }
      syncCurrentNodeFromDom();
      editorState.selectedNodeId = nodeId;
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
      const node = editorState.draftNodes.find(n => n.id === nodeId);
      if (!node) {
        return;
      }
      node.pending_delete = !node.pending_delete;
      clearValidationState();
      updateClientValidationUi();
      renderNodeList();
      renderNodeEditor();
      updateFooterUi();
    });

    // Node editor actions.
    $root.off('change.bx-node', '[data-role="media-type"]');
    $root.on('change.bx-node', '[data-role="media-type"]', function() {
      syncCurrentNodeFromDom();
      clearValidationState();
      renderNodeEditor();
      updateClientValidationUi();
    });

    $root.off('change.bx-node', '[data-role="no-branches"]');
    $root.on('change.bx-node', '[data-role="no-branches"]', function() {
      syncCurrentNodeFromDom();
      clearValidationState();
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
      clearValidationState();
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
      clearValidationState();
      renderNodeEditor();
      updateClientValidationUi();
    });
  }

  // Bootstrap flow: wire handlers first, then hydrate + render.
  function init() {
    bindActions();
    bindInteractions();
    loadState().then(function(state) {
      hydrateInitialState(state || {});
      renderAll();
    });
  }

  init();
}
