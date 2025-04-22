/* Javascript for BranchingXBlock. */
function BranchingXBlock(runtime, element) {

    function updateView(data) {
        const $element = $(element);

        if (data.has_completed) {
            // Show completion screen
            $element.find('.completion-screen').show();
            $element.find('.active-scenario').hide();
            $element.find('.end-feedback').html(data.current_node.end_consequences || '');
            $element.find('.score-display').text(`Score: ${data.score}/${data.max_score}`);
        } else {
            // Show active scenario
            $element.find('.completion-screen').hide();
            $element.find('.active-scenario').show();

            // Update media
            const media = data.current_node.media || {};
            const $mediaContainer = $element.find('.node-media');
            if (media.type === 'image') {
                $mediaContainer.html(`<img src="${media.url}" />`);
            } else if (media.type === 'video') {
                $mediaContainer.html(`<video src="${media.url}" controls />`);
            } else {
                $mediaContainer.empty();
            }

            // Update content
            $element.find('.node-content').html(data.current_node.content || '');

            // Update choices
            const $choicesList = $element.find('.choices-list');
            $choicesList.empty();
            (data.current_node.choices || []).forEach((choice, index) => {
                $choicesList.append(`
                    <button class="choice" data-choice-index="${index}">
                        ${choice.text}
                        ${choice.hint ? `<div class="hint">${choice.hint}</div>` : ''}
                    </button>
                `);
            });

            // Show/hide undo button
            $element.find('.undo-button').toggle(data.enable_undo && data.history.length > 0);
        }
    }

    // Fetch initial data from server
    function refreshView() {
        runtime.notify('load', {state: 'loading'});
        $.ajax({
            url: runtime.handlerUrl(element, 'get_current_state'),
            type: 'POST',
            data: JSON.stringify({}),
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            success: (data) => {
                updateView(data);
                runtime.notify('load', {state: 'loaded'});
            }
        });
    }

    // Choice selection handler
    $(element).on('click', '.choice', function() {
        const choiceIndex = $(this).data('choice-index');
        runtime.notify('save', {state: 'saving'});
        $.ajax({
            type: 'POST',
            url: runtime.handlerUrl(element, 'select_choice'),
            data: JSON.stringify({choice_index: choiceIndex}),
            success: () => {
                refreshView();  // Refresh after choice
                runtime.notify('save', {state: 'saved'});
            }
        });
    });

    // Undo handler
    $(element).on('click', '.undo-button', function() {
        runtime.notify('save', {state: 'saving'});
        $.ajax({
            type: 'POST',
            url: runtime.handlerUrl(element, 'undo_choice'),
            success: () => {
                refreshView();  // Refresh after undo
                runtime.notify('save', {state: 'saved'});
            }
        });
    });

    // Initial load
    refreshView();
}
