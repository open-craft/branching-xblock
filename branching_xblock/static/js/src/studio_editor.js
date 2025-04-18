function BranchingStudioEditor(runtime, element) {
    const $element = $(element);

    function saveScenario() {
        const nodes = [];
        $element.find('.node').each(function() {
            const $node = $(this);
            const choices = [];
            $node.find('.choice').each(function() {
                choices.push({
                    text: $(this).find('.choice-text').val(),
                    target_node_id: $(this).find('.choice-target').val()
                });
            });
            nodes.push({
                id: $node.data('node-id'),
                type: $node.find('.node-type').val(),
                content: $node.find('.node-content').val(),
                media: { url: $node.find('.media-url').val() },
                choices: choices
            });
        });
        runtime.notify('save', { state: 'saving' });
        $.ajax({
            type: 'POST',
            url: runtime.handlerUrl(element, 'save_scenario'),
            data: JSON.stringify({ nodes: nodes }),
            success: (response) => {
              if (response.success) {
                runtime.notify('save', { state: 'saved' });
              } else {
                showErrors(response.errors);
              }
            }
        });
    }

    function handleAddChoice(evt) {
        const $choiceList = $(evt.target).closest('.choices-list');
        $choiceList.append(`
          <div class="choice">
            <input type="text" class="choice-text" placeholder="Choice text">
            <input type="text" class="choice-target" placeholder="Target Node ID">
            <button class="delete-choice">x</button>
          </div>
        `);
        saveScenario();
    }
      
    function handleDeleteChoice(evt) {
        $(evt.target).closest('.choice').remove();
        saveScenario();
    }

    function showErrors(errors) {
        const $errorDiv = $element.find('.errors');
        $errorDiv.empty();
        errors.forEach(err => $errorDiv.append(`<div>${err}</div>`));
    }

    function deleteNode(evt) {
        evt.preventDefault();
        const $node = $(evt.target).closest('.node');
        const nodeId = $node.data('node-id');
      
        runtime.notify('save', { state: 'saving' });
        $.ajax({
          type: 'POST',
          url: runtime.handlerUrl(element, 'delete_node'),
          data: JSON.stringify({ node_id: nodeId }),
          success: () => {
            $node.remove();
            saveScenario();
          },
          error: (error) => {
            showErrors([error.responseText]);
          }
        });
    }
    
    // Add these to your event listeners:
    $element.on('click', '.add-choice', handleAddChoice);
    $element.on('click', '.delete-choice', handleDeleteChoice);
    $element.on('change', '.node-type, .node-content, .media-url, .choice-text, .choice-target', saveScenario);
    $element.on('click', '.delete-node', deleteNode);

    // Save settings
    $element.find('[name="enable_undo"], [name="enable_scoring"], [name="max_score"]').on('change', function() {
        runtime.notify('save', {state: 'saving'});
        const data = {
            enable_undo: $element.find('[name="enable_undo"]').prop('checked'),
            enable_scoring: $element.find('[name="enable_scoring"]').prop('checked'),
            max_score: parseFloat($element.find('[name="max_score"]').val())
        };
        $.ajax({
            type: 'POST',
            url: runtime.handlerUrl(element, 'save_settings'),
            data: JSON.stringify(data),
            success: () => runtime.notify('save', {state: 'saved'})
        });
    });

    // Add node
    $element.find('.add-node').click(function() {
        runtime.notify('save', {state: 'saving'});
        $.ajax({
            type: 'POST',
            url: runtime.handlerUrl(element, 'add_node'),
            success: (data) => {
                runtime.notify('reload');
                runtime.notify('save', {state: 'saved'});
            }
        });
    });
}
