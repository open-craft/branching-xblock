function BranchingStudioEditor(runtime, element, data) {
    const $element = $(element);
    const $editorEl  = $element.find("#branching-editor");
    const { nodes, enable_undo, enable_scoring, max_score } = data;

    // Render settings
    const settings = document.createElement("div");
    settings.className = "settings";
    settings.innerHTML = `
        <label>
        <input type="checkbox" ${enable_undo ? "checked" : ""} name="enable_undo"/>
        Allow undo
        </label>
        <label>
        <input type="checkbox" ${enable_scoring ? "checked" : ""} name="enable_scoring"/>
        Enable scoring
        </label>
        <label>
        Max Score:
        <input type="number" name="max_score" value="${max_score}"/>
        </label>
    `;
    $editorEl.appendChild(settings);

    // Render nodes
    const list = document.createElement("div");
    list.className = "node-list";
    nodes.forEach(node => {
        const nodeEl = document.createElement("div");
        nodeEl.className = "node";
        nodeEl.dataset.nodeId = node.id;
        nodeEl.innerHTML = `
        <div class="node-header">
            <h3>${node.id} (${node.type})</h3>
            <button class="delete-node">Delete</button>
        </div>
        <textarea class="node-content">${node.content||""}</textarea>
        <input class="media-url" value="${node.media?.url||""}" placeholder="Media URL"/>
        <select class="media-type">
            <option value="">None</option>
            <option value="image"${node.media?.type==="image"?" selected":""}>Image</option>
            <option value="video"${node.media?.type==="video"?" selected":""}>Video</option>
        </select>
        <div class="choices-list"${node.type==="end"?" hidden":""}>
            ${node.choices.map(choice=>`
            <div class="choice">
                <input class="choice-text" value="${choice.text}" placeholder="Choice text"/>
                <input class="choice-target" value="${choice.target_node_id}" placeholder="Target Node ID"/>
                <button class="delete-choice">x</button>
            </div>
            `).join("")}
            <button class="add-choice">Add Choice</button>
        </div>
        `;
        list.appendChild(nodeEl);
    });
    list.insertAdjacentHTML("beforeend","<button class='add-node'>Add Node</button>");
    $editorEl.appendChild(list);


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
