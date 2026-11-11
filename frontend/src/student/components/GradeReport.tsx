import React, { useId } from "react";
import Badge from "@openedx/paragon/dist/Badge";
import Button from "@openedx/paragon/dist/Button";
import Card from "@openedx/paragon/dist/Card";
import Icon from "@openedx/paragon/dist/Icon";
import Stack from "@openedx/paragon/dist/Stack";
// Deep imports, not the icons barrel: each es5 module is a default export.
import AccountTree from "@openedx/paragon/icons/es5/AccountTree";
import AutoGraph from "@openedx/paragon/icons/es5/AutoGraph";
import Replay from "@openedx/paragon/icons/es5/Replay";
import { useIntl } from "react-intl";
import { studentMessages } from "../../messages";
import { GradeReport as GradeReportData } from "../../apiTypes";

interface GradeReportProps {
  reportData: GradeReportData;
  showResetInReport: boolean;
  onReset: () => void;
  hidden: boolean;
}

// Scroll starts only from a 9th detail row, so up to 8 rows wrap freely on phones.
const SCROLL_ROW_THRESHOLD = 8;

// Server points, signed: +2, +0, -1 (never "+-1").
const signedPoints = (points: number) => `${points < 0 ? "-" : "+"}${Math.abs(points)}`;

const GradeReport: React.FC<GradeReportProps> = ({ reportData, showResetInReport, onReset, hidden }) => {
  const intl = useIntl();
  const detailsHeadingId = useId();

  if (hidden) {
    return <div className="grade-report" data-role="grade-report" hidden />;
  }

  // Shown verbatim: the server owns score, max_score and percentage.
  const score = reportData?.score ?? 0;
  const maxScore = reportData?.max_score ?? 0;
  const percentage = reportData?.percentage ?? 0;
  const gradeLabel = (reportData?.grade_label ?? "").trim();
  const isPassStyle = Boolean(reportData?.is_pass_style);
  const details = Array.isArray(reportData?.detailed_scores) ? reportData.detailed_scores : [];
  const detailsLabel = intl.formatMessage(studentMessages.detailedScore);
  const scrollable = details.length > SCROLL_ROW_THRESHOLD;
  const scrollProps = scrollable
    ? { role: "region" as const, "aria-label": detailsLabel, tabIndex: 0 }
    : {};

  return (
    <Card className="grade-report" data-role="grade-report">
      {/* Same header as the scenario card, so the report reads as the same activity. */}
      <Card.Header
        title={
          <Stack direction="horizontal" gap={3} className="branching-scenario__title">
            <Icon src={AccountTree} className="branching-scenario__title-icon flex-shrink-0" />
            <span className="branching-scenario__title-divider" aria-hidden="true" />
            <h2 className="branching-scenario__title-text">
              {intl.formatMessage(studentMessages.scenarioTitle)}
            </h2>
          </Stack>
        }
      />
      <Card.Section>
        <div className="grade-report__layout">
          <section className="grade-report__summary">
            <Icon src={AutoGraph} className="grade-report__sparkle" />
            <div className="grade-report__result">
              <p className="grade-report__percentage" data-role="report-percent">
                {percentage}%
              </p>
              <Badge
                pill
                variant={isPassStyle ? "success" : "danger"}
                className="grade-report__badge"
                data-role="report-grade-label"
              >
                {gradeLabel}
              </Badge>
            </div>
            <h3 className="grade-report__heading">
              {intl.formatMessage(studentMessages.activityComplete)}
            </h3>
            <p className="grade-report__subtitle">
              {intl.formatMessage(studentMessages.reportSubtitle)}
            </p>
            <dl className="grade-report__metrics">
              <div className={`grade-report__metric ${isPassStyle ? "is-pass" : "is-fail"}`}>
                {/* Colon lives here: the message default has none. */}
                <dt className="grade-report__metric-label">
                  {intl.formatMessage(studentMessages.yourScore)}:
                </dt>
                <dd className="grade-report__metric-value" data-role="report-score">{score}</dd>
              </div>
              <div className="grade-report__metric is-max">
                <dt className="grade-report__metric-label">
                  {intl.formatMessage(studentMessages.highestPossibleScore)}:
                </dt>
                <dd className="grade-report__metric-value" data-role="report-max-score">{maxScore}</dd>
              </div>
            </dl>
          </section>

          <section className="grade-report__details align-self-center">
            <h3 className="grade-report__details-heading" id={detailsHeadingId}>{detailsLabel}</h3>
            <Card className="grade-report__table-card">
              <Card.Section>
                <div
                  className={`grade-report__table-scroll${scrollable ? " is-scrollable" : ""}`}
                  {...scrollProps}
                >
                  <table className="grade-report__table" aria-labelledby={detailsHeadingId}>
                    <thead>
                      <tr>
                        <th scope="col">{intl.formatMessage(studentMessages.yourSelections)}</th>
                        <th scope="col">{intl.formatMessage(studentMessages.scoreColumn)}</th>
                      </tr>
                    </thead>
                    <tbody data-role="report-details">
                      {details.length === 0 ? (
                        <tr>
                          <td colSpan={2}>{intl.formatMessage(studentMessages.noScoredSelections)}</td>
                        </tr>
                      ) : (
                        details.map((entry, idx) => {
                          const text = (entry.choice_text || "").trim();
                          return (
                            <tr key={idx}>
                              <th scope="row">
                                {text || intl.formatMessage(studentMessages.untitledChoice)}
                              </th>
                              <td className="grade-report__details-score">
                                {signedPoints(entry.awarded_points ?? 0)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </Card.Section>
            </Card>
          </section>

          {showResetInReport && (
            <Button
              type="button"
              variant="outline-primary"
              className="grade-report__restart"
              data-role="reset-activity-report"
              onClick={onReset}
            >
              {intl.formatMessage(studentMessages.restart)}
              <Icon src={Replay} className="grade-report__restart-icon" />
            </Button>
          )}
        </div>
      </Card.Section>
    </Card>
  );
};

export default GradeReport;
