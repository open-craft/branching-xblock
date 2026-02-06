function BranchingXBlock(runtime, element) {
    const $el = $(element);

    let currentHintNodeId = null;
    let isHintVisible = false;

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
        const $media = $el.find('[data-role="media"]');
        const $transcript = $el.find('[data-role="transcript"]');
        const setTranscript = (href) => {
            if (href) {
                $transcript.html(transcriptLink(href)).prop('hidden', false);
            } else {
                $transcript.prop('hidden', true).empty();
            }
        };
        if (media.type === 'image') {
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
        const nodeContent = (node && node.content) || '';
        $el.find('[data-role="content"]').html(nodeContent);

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
        const $choices = $el.find('[data-role="choices"]').empty();
        const choices = node.choices || [];
        choices.forEach((choice, idx) => {
            $('<button>')
            .addClass('choice-button bg-primary')
            .text(choice.text)
            .attr('data-choice-index', idx)
            .appendTo($choices);
        });

        $choices.addClass('choices-inline');

        const canUndo = state.enable_undo && state.history.length > 0;
        $el.find('.undo-button').toggle(canUndo);

        const showReset = Boolean(state.enable_reset_activity);
        $el.find('[data-role="reset-activity"]').toggle(showReset);

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
