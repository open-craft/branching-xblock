function BranchingXBlock(runtime, element) {
    const $el = $(element);

    let currentHintNodeId = null;
    let isHintVisible = false;
    let selectedChoiceIndex = null;

    const MEDIA_FILE_REGEX = /\.(mp4|webm|ogg|mp3|wav)(\?|#|$)/i;

    function isMediaFile(url) {
        return MEDIA_FILE_REGEX.test(url || '');
    }

    function normalizeYouTube(u, host) {
        if (!host.includes('youtube.com') && !host.includes('youtu.be')) {
            return null;
        }
        let videoId = u.searchParams.get('v');
        if (!videoId && host.includes('youtu.be')) {
            videoId = u.pathname.split('/').filter(Boolean)[0];
        }
        if (!videoId && u.pathname.includes('/embed/')) {
            videoId = u.pathname.split('/').filter(Boolean).pop();
        }
        if (!videoId && u.pathname.includes('/shorts/')) {
            videoId = u.pathname.split('/').filter(Boolean).pop();
        }
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    function normalizeVimeo(u, host) {
        if (!host.includes('vimeo.com')) {
            return null;
        }
        const parts = u.pathname.split('/').filter(Boolean);
        const last = parts.pop();
        if (last && /^\d+$/.test(last)) {
            return `https://player.vimeo.com/video/${last}`;
        }
        return null;
    }

    function normalizePanopto(u, host) {
        if (!host.includes('panopto')) {
            return null;
        }
        const id = u.searchParams.get('id');
        if (!id) {
            return null;
        }
        return `${u.origin}/Panopto/Pages/Embed.aspx?id=${id}&autoplay=false`;
    }

    function normalizeEmbedUrl(url) {
        try {
            const u = new URL(url);
            const host = u.hostname.toLowerCase();
            return normalizeYouTube(u, host) || normalizeVimeo(u, host) || normalizePanopto(u, host);
        } catch (e) {
            return null;
        }
    }

    function iframeHtml(src) {
        return `<div class="bx-media-embed"><iframe src="${src}" title="Embedded media" allow="autoplay; fullscreen" allowfullscreen sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe></div>`;
    }

    function transcriptLink(href) {
        return `<a href="${href}" target="_blank" rel="noopener noreferrer">Download transcript</a>`;
    }

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
        const mediaUrl = media.url || '';
        const contentHtml = (node && node.content) || '';
        const overlayEnabled = Boolean(node?.overlay_text && media.type === 'image');

        const $media = $el.find('[data-role="media"]');
        const $transcript = $el.find('[data-role="transcript"]');
        const setTranscript = (href) => {
            if (href) {
                $transcript.html(transcriptLink(href)).prop('hidden', false);
            } else {
                $transcript.prop('hidden', true).empty();
            }
        };
        if (media.type === 'image' && overlayEnabled) {
            $media.html(`
                <div class="media-overlay">
                    <img src="${media.url}" alt=""/>
                    <div class="media-overlay__text">
                        ${contentHtml}
                    </div>
                </div>
            `);
            setTranscript(null);
        } else if (media.type === 'image') {
            $media.html(`<img src="${mediaUrl}" alt=""/>`);
            setTranscript(null);
        } else if (media.type === 'audio') {
            $media.html(`<audio src="${mediaUrl}" controls />`);
            setTranscript(node && node.transcript_url);
        } else if (media.type === 'video') {
            if (!mediaUrl) {
                $media.empty();
                setTranscript(null);
            } else if (isMediaFile(mediaUrl)) {
                $media.html(`<video src="${mediaUrl}" controls />`);
                setTranscript(node && node.transcript_url);
            } else {
                const embedUrl = normalizeEmbedUrl(mediaUrl) || mediaUrl;
                $media.html(iframeHtml(embedUrl));
                setTranscript(node && node.transcript_url);
            }
        } else {
            $media.empty();
            setTranscript(null);
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
        const hintText = (node && node.hint ? String(node.hint) : '').trim();
        if (node && hintText) {
            $hint.html(`<strong>Hint:</strong> ${hintText}`);
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
        const isLeaf = !hasChoices;
        const showReset = Boolean(state.enable_reset_activity && isLeaf);
        $el.find('[data-role="choice-heading"]').toggle(hasChoices);
        $submitButton.toggle(hasChoices);
        $submitButton.prop('disabled', !hasChoices || selectedChoiceIndex === null);
        $el.find('.choice-actions').toggle(hasChoices || canUndo || showReset);

        $el.find('.undo-button')
            .prop('disabled', !canUndo)
            .toggleClass('is-disabled', !canUndo);

        const $score = $el.find('[data-role="score"]');
        $el.find('[data-role="reset-activity"]').toggle(showReset);
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

    $el.on('click', '[data-role="reset-activity"]', function() {
        $.ajax({
          url: runtime.handlerUrl(element, 'reset_activity'),
          type: 'POST',
          data: JSON.stringify({}),
          contentType: 'application/json',
          dataType: 'json'
        }).done(refreshView);
    });

    // Initial load
    refreshView();

}
