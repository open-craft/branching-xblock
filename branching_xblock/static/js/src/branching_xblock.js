function BranchingXBlock(runtime, element) {
    const $el = $(element);

    let currentHintNodeId = null;
    let isHintVisible = false;
    let selectedChoiceIndex = null;

    function setHintVisibility(visible) {
        const $details = $el.find('[data-role="hint-collapsible"]');
        isHintVisible = Boolean(visible);
        if (!$details.length) {
            return;
        }
        const $summary = $details.find('[data-role="hint-summary"]');
        $details.prop('open', isHintVisible);
        if ($summary.length) {
            $summary.text(isHintVisible ? 'Hide hint' : 'Show hint');
        }
    }

    function updateView(state) {
        const node = state.current_node || state.nodes[state.start_node_id] || {};

        // Active node
        $el.find('[data-role="active"]').show();

        const media = (node && node.media) || {};
        const contentHtml = (node && node.content) || '';
        const overlayEnabled = Boolean(node?.overlay_text && media.type === 'image');

        const $media = $el.find('[data-role="media"]');
        if (media.type === 'image' && overlayEnabled) {
            $media.html(`
                <div class="media-overlay">
                    <img src="${media.url}" alt=""/>
                    <div class="media-overlay__text">
                        ${contentHtml}
                    </div>
                </div>
            `);
        } else if (media.type === 'image') {
            $media.html(`<img src="${media.url}" alt=""/>`);
        } else if (media.type === 'video') {
            $media.html(`<video src="${media.url}" controls />`);
        } else if (media.type === 'audio'){
            $media.html(`<audio src="${media.url}" controls />`);
        } else {
            $media.empty();
        }
        // Content
        const $content = $el.find('[data-role="content"]');
        if (overlayEnabled) {
            $content.empty();
        } else {
            $content.html(contentHtml);
        }

        // Hint
        const nodeId = node?.id || null;
        if (nodeId !== currentHintNodeId) {
            currentHintNodeId = nodeId;
            isHintVisible = false;
        }
        const $hintContainer = $el.find('[data-role="hint-container"]');
        const $hintDetails = $hintContainer.find('[data-role="hint-collapsible"]');
        const $hint = $hintDetails.find('[data-role="hint"]');
        if (state.enable_hints && node && node.hint) {
            $hint.html(`<strong>Hint:</strong> ${node.hint}`);
            $hintDetails.prop('hidden', false);
            setHintVisibility(isHintVisible);
        } else {
            setHintVisibility(false);
            $hint.empty();
            $hintDetails.prop('hidden', true);
        }

        // Choices
        const $choiceForm = $el.find('[data-role="choice-form"]');
        const $choiceList = $el.find('[data-role="choice-list"]').empty();
        const $submitButton = $el.find('[data-role="submit-choice"]').prop('disabled', true);
        const choices = node.choices || [];
        const canUndo = state.enable_undo && state.history.length > 0;
        selectedChoiceIndex = null;
        choices.forEach((choice, idx) => {
            const choiceId = `choice-${node.id || 'node'}-${idx}`;
            const $label = $('<label>')
                .addClass('choice-option')
                .attr('for', choiceId);
            const $input = $('<input>')
                .attr({
                    type: 'radio',
                    name: 'branching-choice',
                    id: choiceId,
                    value: idx,
                })
                .addClass('choice-option__input');
            const $text = $('<span>')
                .addClass('choice-option__text')
                .text(choice.text || `Choice ${idx + 1}`);
            $label.append($input).append($text);
            $choiceList.append($label);
        });
        const hasChoices = choices.length > 0;
        $el.find('[data-role="choice-heading"]').toggle(hasChoices);
        $submitButton.prop('disabled', selectedChoiceIndex === null && hasChoices);

        $el.find('.undo-button')
            .prop('disabled', !canUndo)
            .toggleClass('is-disabled', !canUndo);

        const $score = $el.find('[data-role="score"]');
        const isLeaf = choices.length === 0;
        if (isLeaf && state.enable_scoring) {
            $score.text(`Score: ${state.score}/${state.max_score}`).show();
        } else {
            $score.hide();
        }
    }

    function refreshView() {
      $.ajax({
        url: runtime.handlerUrl(element, 'get_current_state'),
        type: 'POST',
        data: JSON.stringify({}),
        contentType: 'application/json',
        dataType: 'json'
      }).done(updateView);
    }

    $el.find('[data-role="hint-collapsible"]').on('toggle', function() {
        setHintVisibility(this.open);
    });

    $el.on('change', 'input[name="branching-choice"]', function() {
        selectedChoiceIndex = Number(this.value);
        $el.find('[data-role="submit-choice"]').prop('disabled', false);
        $el.find('.choice-option').removeClass('is-selected');
        $(this).closest('.choice-option').addClass('is-selected');
    });

    $el.on('submit', '[data-role="choice-form"]', function(event) {
        event.preventDefault();
        if (selectedChoiceIndex === null) {
            return;
        }
        $.ajax({
            url: runtime.handlerUrl(element, 'select_choice'),
            type: 'POST',
            data: JSON.stringify({ choice_index: selectedChoiceIndex }),
            contentType: 'application/json'
        }).done(() => {
            selectedChoiceIndex = null;
            refreshView();
        });
    });

    $el.on('click', '.undo-button', function() {
        $.ajax({
          url: runtime.handlerUrl(element, 'undo_choice'),
          type: 'POST',
          data: JSON.stringify({}),
          contentType: 'application/json',
          dataType: 'json'
        }).done(refreshView);
    });

    // Initial load
    refreshView();

}
