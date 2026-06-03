import React, { useRef, useCallback } from "react";
import { useIntl } from "react-intl";
import { studioMessages } from "../../messages";
import { GradeRange } from "../../types";

interface GradeRangeSliderProps {
  gradeRanges: GradeRange[];
  onChange: (gradeRanges: GradeRange[]) => void;
}

function boundaryBounds(boundaryIndex: number, gradeRanges: GradeRange[]): { lower: number; upper: number } {
  const lower = boundaryIndex === 0 ? 0 : (gradeRanges[boundaryIndex - 1]?.end ?? 0) + 1;
  const upper = boundaryIndex === gradeRanges.length - 2 ? 99 : (gradeRanges[boundaryIndex + 1]?.end ?? 100) - 1;
  return { lower, upper };
}

const GradeRangeSlider: React.FC<GradeRangeSliderProps> = ({ gradeRanges, onChange }) => {
  const intl = useIntl();
  const trackRef = useRef<HTMLDivElement>(null);

  if (!Array.isArray(gradeRanges) || gradeRanges.length < 2) {
    return null;
  }

  const percentPerPoint = 100 / 101;

  const handleBoundaryChange = useCallback(
    (boundaryIndex: number, requestedValue: number) => {
      const ranges = gradeRanges.map((r) => ({ ...r }));
      const current = ranges[boundaryIndex];
      const next = ranges[boundaryIndex + 1];
      if (!current || !next) return;
      const { lower, upper } = boundaryBounds(boundaryIndex, ranges);
      const clamped = Math.max(lower, Math.min(upper, requestedValue));
      current.end = clamped;
      next.start = clamped + 1;
      onChange(ranges);
    },
    [gradeRanges, onChange],
  );

  const handleMouseDown = useCallback(
    (boundaryIndex: number, event: React.MouseEvent) => {
      event.preventDefault();

      const applyDrag = (clientX: number) => {
        const track = trackRef.current;
        if (!track) return;
        const bounds = track.getBoundingClientRect();
        if (bounds.width <= 0) return;
        const ratio = Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width));
        const requestedValue = Math.round(ratio * 100);
        handleBoundaryChange(boundaryIndex, requestedValue);
      };

      applyDrag(event.clientX);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        applyDrag(moveEvent.clientX);
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [handleBoundaryChange],
  );

  const handleKeyDown = useCallback(
    (boundaryIndex: number, event: React.KeyboardEvent) => {
      const ranges = gradeRanges;
      const currentBoundary = ranges[boundaryIndex]?.end;
      if (typeof currentBoundary !== "number") return;
      const bounds = boundaryBounds(boundaryIndex, ranges);
      let nextValue = currentBoundary;

      if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
        nextValue = currentBoundary - 1;
      } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
        nextValue = currentBoundary + 1;
      } else if (event.key === "Home") {
        nextValue = bounds.lower;
      } else if (event.key === "End") {
        nextValue = bounds.upper;
      } else {
        return;
      }
      event.preventDefault();
      handleBoundaryChange(boundaryIndex, nextValue);
    },
    [gradeRanges, handleBoundaryChange],
  );

  const tickValues: number[] = [];
  for (let value = 0; value <= 100; value += 10) {
    tickValues.push(value);
  }

  return (
    <div className="bx-grade-range__track-wrap">
      <div className="bx-grade-range__track" data-role="grade-track" ref={trackRef}>
        {gradeRanges.map((gradeRange, index) => {
          const start = gradeRange.start ?? 0;
          const end = gradeRange.end ?? 100;
          const width = end - start + 1;
          const isFail = index === 0;
          return (
            <div
              key={index}
              className={`bx-grade-range__segment${isFail ? " bx-grade-range__segment--fail" : " bx-grade-range__segment--pass"}`}
              style={{
                left: `${start * percentPerPoint}%`,
                width: `${width * percentPerPoint}%`,
              }}
            >
              <div className="bx-grade-range__segment-label">{gradeRange.label}</div>
              <div className="bx-grade-range__segment-range">{start}-{end}</div>
            </div>
          );
        })}

        {gradeRanges.slice(0, -1).map((gradeRange, boundaryIndex) => {
          const boundaryValue = gradeRange.end ?? 0;
          const bounds = boundaryBounds(boundaryIndex, gradeRanges);
          return (
            <button
              key={boundaryIndex}
              type="button"
              className="bx-grade-range__handle"
              data-role="grade-boundary-handle"
              data-boundary-index={boundaryIndex}
              role="slider"
              aria-label={intl.formatMessage(studioMessages.gradeBoundary, { index: boundaryIndex + 1 })}
              aria-valuemin={bounds.lower}
              aria-valuemax={bounds.upper}
              aria-valuenow={boundaryValue}
              style={{ left: `${(boundaryValue + 1) * percentPerPoint}%` }}
              onMouseDown={(e) => handleMouseDown(boundaryIndex, e)}
              onKeyDown={(e) => handleKeyDown(boundaryIndex, e)}
            />
          );
        })}
      </div>
      <div className="bx-grade-range__ticks">
        {tickValues.map((value) => (
          <span key={value} className="bx-grade-range__tick">{String(value)}</span>
        ))}
      </div>
    </div>
  );
};

export default GradeRangeSlider;
