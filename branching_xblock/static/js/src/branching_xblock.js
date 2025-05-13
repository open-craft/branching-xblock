function BranchingXBlock(runtime, element) {
    const $el = $(element);

    function updateView(state) {
        const node = state.current_node || state.nodes[state.start_node_id] || {};

        // Active node
        $el.find('[data-role="active"]').show();

        const media = (node && node.media) || {};
        const $media = $el.find('[data-role="media"]');
        if (media.type === 'image') {
            $media.html(`<img src="${media.url}" alt=""/>`);
        } else if (media.type === 'video') {
            $media.html(`<video src="${media.url}" controls />`);
        } else if (media.type === 'audio'){
            $media.html(`<audio src="${media.url}" controls />`);
        } else {
            $media.empty();
        }
        // Content
        $el.find('[data-role="content"]').html(
            (node && node.content) || ''
        );

        // Hint
        const $hint = $el.find('[data-role="hint"]');
        if (state.enable_hints && node.hint) {
          $hint.text(node.hint).show();
        } else {
          $hint.hide().empty();
        }

        // Choices
        const $choices = $el.find('[data-role="choices"]').empty();
        const choices = node.choices || [];
        choices.forEach((choice, idx) => {
            $('<button>')
            .addClass('choice-button')
            .text(choice.text)
            .attr('data-choice-index', idx)
            .appendTo($choices);
        });

        const canUndo = state.enable_undo && state.history.length > 0;
        $el.find('.undo-button').toggle(canUndo);

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

    // Handle a choice click
    $el.on('click', '.choice-button', function() {
      const idx = +$(this).attr('data-choice-index');
      $.ajax({
        url: runtime.handlerUrl(element, 'select_choice'),
        type: 'POST',
        data: JSON.stringify({ choice_index: idx }),
        contentType: 'application/json'
      }).done(refreshView);
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
