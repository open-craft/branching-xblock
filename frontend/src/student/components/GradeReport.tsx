import React, { useEffect, useRef } from "react";
import Button from "@openedx/paragon/dist/Button";
import { useIntl } from "react-intl";
import { studentMessages } from "../../messages";
import { GradeReport as GradeReportData } from "../../apiTypes";

interface GradeReportProps {
  reportData: GradeReportData;
  showResetInReport: boolean;
  onReset: () => void;
  hidden: boolean;
}

const GradeReport: React.FC<GradeReportProps> = ({ reportData, showResetInReport, onReset, hidden }) => {
  const intl = useIntl();
  const circleRef = useRef<SVGCircleElement>(null);

  const score = reportData?.score || 0;
  const maxScore = reportData?.max_score || 0;
  const percentage = reportData?.percentage || 0;
  const gradeLabel = (reportData?.grade_label || "").trim();
  const isPassStyle = Boolean(reportData?.is_pass_style);
  const details = Array.isArray(reportData?.detailed_scores) ? reportData.detailed_scores : [];
  const boundedPercentage = Math.max(0, Math.min(100, percentage));

  useEffect(() => {
    if (circleRef.current) {
      const radius = Number(circleRef.current.getAttribute("r")) || 48;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference * (1 - boundedPercentage / 100);
      circleRef.current.style.strokeDasharray = String(circumference);
      circleRef.current.style.strokeDashoffset = String(offset);
    }
  }, [boundedPercentage]);

  if (hidden) {
    return <div className="grade-report" data-role="grade-report" hidden />;
  }

  return (
    <div className="grade-report" data-role="grade-report">
      <h3 className="grade-report__title">
        {intl.formatMessage(studentMessages.activityComplete)}
      </h3>
      <p className="grade-report__subtitle">
        {intl.formatMessage(studentMessages.reportSubtitle)}
      </p>

      <div className="grade-report__summary-card">
        <h4 className="grade-report__section-title">
          <span className="grade-report__section-icon" aria-hidden="true">
            <span className="fa fa-graduation-cap" aria-hidden="true" />
          </span>
          {intl.formatMessage(studentMessages.yourGrade)}
        </h4>
        <div className="grade-report__summary">
          <div className={`grade-report__metric grade-report__metric--score${!isPassStyle ? " is-fail" : ""}`}>
            <div className="grade-report__metric-label">
              <span className="grade-report__metric-label-icon" aria-hidden="true">
                <span className={`fa ${isPassStyle ? "fa-trophy" : "fa-exclamation-triangle"}`} data-role="report-score-icon" aria-hidden="true" />
              </span>
              {intl.formatMessage(studentMessages.yourScore)}
            </div>
            <div className="grade-report__metric-value" data-role="report-score">{Math.round(score)}</div>
          </div>
          <div className="grade-report__metric grade-report__metric--max">
            <div className="grade-report__metric-label">
              {intl.formatMessage(studentMessages.highestPossibleScore)}
            </div>
            <div className="grade-report__metric-value" data-role="report-max-score">{Math.round(maxScore)}</div>
          </div>
          <div className={`grade-report__percent${!isPassStyle ? " is-fail" : ""}`} data-role="report-percent-pill">
            <svg className="grade-report__percent-ring" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
              <circle className="grade-report__percent-track" cx="60" cy="60" r="48" />
              <circle className="grade-report__percent-progress" data-role="report-percent-circle" cx="60" cy="60" r="48" ref={circleRef} />
            </svg>
            <div className="grade-report__percent-content">
              <div className="grade-report__percent-value" data-role="report-percent">{percentage}%</div>
              <div className="grade-report__percent-label" data-role="report-grade-label">{gradeLabel}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grade-report__details">
        <h4 className="grade-report__details-title">
          <span className="grade-report__section-icon" aria-hidden="true">
            <span className="fa fa-line-chart" aria-hidden="true" />
          </span>
          {intl.formatMessage(studentMessages.detailedScore)}
        </h4>
        <div role="table" aria-label={intl.formatMessage(studentMessages.detailedScore)}>
          <div className="grade-report__details-header" role="row">
            <span role="columnheader">{intl.formatMessage(studentMessages.yourSelections)}</span>
            <span role="columnheader">{intl.formatMessage(studentMessages.scoreColumn)}</span>
          </div>
          <div className="grade-report__details-rows" data-role="report-details" role="rowgroup">
            {details.length === 0 ? (
              <div className="grade-report__details-row grade-report__details-row--empty" role="row">
                <span role="cell">{intl.formatMessage(studentMessages.noScoredSelections)}</span>
              </div>
            ) : (
              details.map((entry, idx) => {
                const text = (entry.choice_text || "").trim();
                const points = entry.awarded_points || 0;
                return (
                  <div className="grade-report__details-row" key={idx} role="row">
                    <span className="grade-report__details-text" role="cell">
                      {text || intl.formatMessage(studentMessages.untitledChoice)}
                    </span>
                    <span className="grade-report__details-score" role="cell">{String(points)}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {showResetInReport && (
        <Button
          type="button"
          variant="primary"
          className="action-primary btn-primary"
          data-role="reset-activity-report"
          onClick={onReset}
        >
          {intl.formatMessage(studentMessages.resetActivity)}
        </Button>
      )}
    </div>
  );
};

export default GradeReport;
