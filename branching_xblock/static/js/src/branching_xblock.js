function BranchingXBlock(runtime, element) {
    const $el = $(element);

    let currentHintNodeId = null;
    let isHintVisible = false;
    let selectedChoiceIndex = null;
    let isReportVisible = false;

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
            $summary.text(isHintVisible ? 'Hide' : 'Show hint');
        }
    }

    function renderGradeReport(reportData, showResetInReport) {
        const $report = $el.find('[data-role="grade-report"]');
        const score = Number(reportData?.score || 0);
        const maxScore = Number(reportData?.max_score || 0);
        const percentage = Number(reportData?.percentage || 0);
        const gradeLabel = String(reportData?.grade_label || '').trim();
        const isPassStyle = Boolean(reportData?.is_pass_style);
        const details = Array.isArray(reportData?.detailed_scores) ? reportData.detailed_scores : [];

        $report.find('[data-role="report-score"]').text(String(Math.round(score)));
        $report.find('[data-role="report-max-score"]').text(String(Math.round(maxScore)));
        $report.find('[data-role="report-percent"]').text(`${percentage}%`);
        $report.find('[data-role="report-grade-label"]').text(gradeLabel);
        const boundedPercentage = Math.max(0, Math.min(100, percentage));
        const $percentPill = $report.find('[data-role="report-percent-pill"]');
        $percentPill
            .toggleClass('is-fail', !isPassStyle);
        const $scoreMetric = $report.find('.grade-report__metric--score');
        $scoreMetric
            .toggleClass('is-fail', !isPassStyle);
        const $scoreIcon = $report.find('[data-role="report-score-icon"]');
        $scoreIcon
            .toggleClass('fa-trophy', isPassStyle)
            .toggleClass('fa-exclamation-triangle', !isPassStyle);
        const $percentCircle = $report.find('[data-role="report-percent-circle"]');
        if ($percentCircle.length) {
            const radius = Number($percentCircle.attr('r')) || 48;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference * (1 - (boundedPercentage / 100));
            $percentCircle.css({
                strokeDasharray: circumference,
                strokeDashoffset: offset,
            });
        }
        $report.find('[data-role="reset-activity-report"]').toggle(showResetInReport);

        const $details = $report.find('[data-role="report-details"]').empty();
        if (!details.length) {
            $details.append(
                $('<div class="grade-report__details-row grade-report__details-row--empty"></div>')
                    .text('No scored selections were recorded for this attempt.')
            );
            return;
        }

        details.forEach((entry) => {
            const text = String(entry.choice_text || '').trim();
            const points = Number(entry.awarded_points || 0);
            const $row = $('<div class="grade-report__details-row"></div>');
            $row.append($('<span class="grade-report__details-text"></span>').text(text || 'Untitled choice'));
            $row.append($('<span class="grade-report__details-score"></span>').text(String(points)));
            $details.append($row);
        });
    }

    function updateView(state) {
        const node = state.current_node || state.nodes[state.start_node_id] || {};

        // Active node
        $el.find('[data-role="active"]').show();

        const media = (node && node.media) || {};
        const mediaUrl = media.url || '';
        const contentHtml = (node && node.content) || '';
        const overlayEnabled = Boolean(node?.overlay_text && media.type === 'image');
        const backgroundImageUrl = state?.background_image_url || '';
        const leftImageUrl = (node?.left_image_url !== undefined && node?.left_image_url !== null)
            ? node.left_image_url
            : (mediaUrl || '');
        const rightImageUrl = node?.right_image_url || '';

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
            const $composite = $('<div>').addClass('bx-image-composite');
            if (backgroundImageUrl) {
                $composite.css('background-image', `url("${backgroundImageUrl}")`);
            }

            const hasForeground = Boolean(leftImageUrl || rightImageUrl);
            if (!hasForeground && backgroundImageUrl) {
                $composite.addClass('bx-image-composite--bg-only');
            } else if (hasForeground) {
                const $fg = $('<div>').addClass('bx-image-composite__fg');
                if (leftImageUrl) {
                    $fg.append(
                        $('<img>')
                            .addClass('bx-image-composite__img bx-image-composite__img--left')
                            .attr('src', leftImageUrl)
                            .attr('alt', '')
                    );
                }
                if (rightImageUrl) {
                    $fg.append(
                        $('<img>')
                            .addClass('bx-image-composite__img bx-image-composite__img--right')
                            .attr('src', rightImageUrl)
                            .attr('alt', '')
                    );
                }
                $composite.append($fg);
            }

            if (overlayEnabled) {
                $composite.append(
                    $('<div>')
                        .addClass('media-overlay__text bx-image-composite__overlay')
                        .html(contentHtml)
                );
            }

            $media.empty().append($composite);
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
        if (overlayEnabled && media.type === 'image') {
            $content.empty();
        } else {
            $content.html(contentHtml);
        }

        // Hint
        const nodeId = node?.id || null;
        if (nodeId !== currentHintNodeId) {
            currentHintNodeId = nodeId;
            isHintVisible = false;
            isReportVisible = false;
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
        const isAtStartNode = Boolean(
            state.current_node && state.current_node.id === state.start_node_id
        );
        const showReset = Boolean(state.enable_reset_activity && !isAtStartNode);
        const showReport = Boolean(isLeaf && state.enable_scoring);
        if (!showReport) {
            isReportVisible = false;
        }
        $el.find('[data-role="choice-heading"]').toggle(hasChoices);
        $submitButton.toggle(hasChoices);
        $submitButton.prop('disabled', !hasChoices || selectedChoiceIndex === null);
        $el.find('[data-role="show-report"]').toggle(showReport);
        $el.find('.choice-actions').toggle(hasChoices || canUndo || showReset || showReport);

        $el.find('.undo-button')
            .prop('disabled', !canUndo)
            .toggleClass('is-disabled', !canUndo);
        $el.find('[data-role="reset-activity"]').toggle(showReset);

        const $report = $el.find('[data-role="grade-report"]');
        const reportMode = Boolean(showReport && isReportVisible);
        $report.prop('hidden', !reportMode);
        if (reportMode) {
            renderGradeReport(state.grade_report || {}, showReset);
            $el.find('[data-role="content"]').hide();
            $el.find('[data-role="media"]').hide();
            $el.find('[data-role="transcript"]').hide();
            $el.find('[data-role="hint-container"]').hide();
            $el.find('[data-role="choices"]').hide();
            $el.find('[data-role="score"]').hide();
        } else {
            $el.find('[data-role="content"]').show();
            $el.find('[data-role="media"]').show();
            $el.find('[data-role="transcript"]').show();
            $el.find('[data-role="hint-container"]').show();
            $el.find('[data-role="choices"]').show();
        }

        const $score = $el.find('[data-role="score"]');
        if (!reportMode && isLeaf && state.enable_scoring) {
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
        isReportVisible = false;
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
            isReportVisible = false;
            refreshView();
        });
    });

    $el.on('click', '.undo-button', function() {
        isReportVisible = false;
        $.ajax({
          url: runtime.handlerUrl(element, 'undo_choice'),
          type: 'POST',
          data: JSON.stringify({}),
          contentType: 'application/json',
          dataType: 'json'
        }).done(refreshView);
    });

    $el.on('click', '[data-role="show-report"]', function() {
        isReportVisible = true;
        refreshView();
    });

    $el.on('click', '[data-role="reset-activity"], [data-role="reset-activity-report"]', function() {
        isReportVisible = false;
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
