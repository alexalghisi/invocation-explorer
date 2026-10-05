import type { JournalEntry } from "../domain/types";
import { formatCount, formatDuration } from "./format";
import { layoutTimeline } from "./timeline";

const LANE_HEIGHT = 22;
const LABEL_WIDTH = 56;

interface TimelineProps {
    readonly journal: readonly JournalEntry[];
    readonly width: number;
}

export function Timeline({ journal, width }: TimelineProps) {
    const plotWidth = Math.max(0, width - LABEL_WIDTH);
    const layout = layoutTimeline(journal, plotWidth);
    const failures = journal.filter((e) => e.error !== undefined).length;
    const height = layout.lanes.length * LANE_HEIGHT;

    return (
        <figure className="timeline">
            <figcaption>
                {formatCount(journal.length)} journal entries over {formatDuration(layout.end - layout.start)}
                {failures > 0 ? `, ${failures} failed ${failures === 1 ? "attempt" : "attempts"}` : ""}
                {layout.aggregated ? " · entries sharing a pixel are merged; merged marks that contain a failure are red" : ""}
            </figcaption>
            <svg width={width} height={height} role="img" aria-label={`Execution timeline with ${journal.length} journal entries`}>
                {layout.lanes.map((lane, i) => (
                    <text key={lane} x={0} y={i * LANE_HEIGHT + 15} className="lane-label">
                        {lane}
                    </text>
                ))}
                {layout.marks.map((mark) => {
                    const lane = layout.lanes.indexOf(mark.lane);
                    const label =
                        mark.count > 1
                            ? `${mark.count} ${mark.lane} entries from #${mark.first.index}${mark.failed ? ", including a failure" : ""}`
                            : `#${mark.first.index} ${mark.first.name}, ${formatDuration(mark.first.durationMs)}${mark.first.attempt > 1 ? `, attempt ${mark.first.attempt}` : ""}${mark.first.error ? `: ${mark.first.error}` : ""}`;
                    return (
                        <rect
                            key={`${mark.lane}-${mark.first.index}`}
                            x={LABEL_WIDTH + mark.x}
                            y={lane * LANE_HEIGHT + 4}
                            width={mark.width}
                            height={LANE_HEIGHT - 8}
                            className={`mark mark-${mark.lane}${mark.failed ? " mark-failed" : ""}`}
                        >
                            <title>{label}</title>
                        </rect>
                    );
                })}
            </svg>
        </figure>
    );
}
