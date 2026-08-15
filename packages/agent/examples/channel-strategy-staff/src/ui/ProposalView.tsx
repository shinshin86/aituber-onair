import type { ChannelStrategyProposal, ProposalEvidence } from '../proposal';
import { PLATFORM_LABELS } from './format';

const DIRECTION_LABELS = {
  increase: '増加',
  decrease: '減少',
  maintain: '維持',
} as const;

interface ProposalViewProps {
  readonly proposal: ChannelStrategyProposal;
  readonly onSelectEvidence: (evidence: ProposalEvidence) => void;
}

/** Renders the validated Artifact. Every evidence ID links to its record. */
export function ProposalView({
  proposal,
  onSelectEvidence,
}: ProposalViewProps): React.JSX.Element {
  return (
    <div className="proposal">
      <dl className="recommendation">
        <div>
          <dt>プラットフォーム</dt>
          <dd>
            <span
              className={`platform-dot ${proposal.recommendation.platform}`}
            />
            {PLATFORM_LABELS[proposal.recommendation.platform]}
          </dd>
        </div>
        <div>
          <dt>ゲーム</dt>
          <dd>{proposal.recommendation.gameId}</dd>
        </div>
        <div>
          <dt>形式</dt>
          <dd>{proposal.recommendation.format}</dd>
        </div>
        <div>
          <dt>タグ</dt>
          <dd className="muted">
            {proposal.recommendation.contentTags.join(' / ')}
          </dd>
        </div>
      </dl>

      <p className="proposal-summary">{proposal.summary}</p>

      <section className="proposal-section">
        <h3>観測された事実</h3>
        <ol className="facts">
          {proposal.observedFacts.map((fact, index) => (
            <li key={fact.statement}>
              <span className="fact-index">{index + 1}</span>
              <div>
                <p>{fact.statement}</p>
                <div className="chip-row">
                  {fact.evidence.map((evidence) => (
                    <button
                      key={`${evidence.platform}:${evidence.sourceType}:${evidence.sourceId}`}
                      type="button"
                      className={`chip ${evidence.platform}`}
                      onClick={() => onSelectEvidence(evidence)}
                    >
                      {evidence.sourceId}
                    </button>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="proposal-grid">
        <section className="proposal-section">
          <h3>推論</h3>
          <ul className="inferences">
            {proposal.inferences.map((inference) => (
              <li key={inference.statement}>
                <p>{inference.statement}</p>
                <span className="based-on">
                  事実 {inference.basedOn.map((index) => index + 1).join(', ')}{' '}
                  に基づく
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="proposal-section">
          <h3>次回の検証</h3>
          <p>{proposal.experiment.hypothesis}</p>
          <table className="data-table compact">
            <thead>
              <tr>
                <th scope="col">指標</th>
                <th scope="col">方向</th>
                <th scope="col" className="numeric">
                  目標
                </th>
              </tr>
            </thead>
            <tbody>
              {proposal.experiment.successMetrics.map((metric) => (
                <tr key={metric.metric}>
                  <td>
                    <code>{metric.metric}</code>
                  </td>
                  <td>{DIRECTION_LABELS[metric.direction]}</td>
                  <td className="numeric">{metric.targetPercent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <div className="proposal-grid">
        <section className="proposal-section warn">
          <h3>リスク</h3>
          <ul className="plain">
            {proposal.risks.map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
        </section>
        <section className="proposal-section warn">
          <h3>データの制約</h3>
          <ul className="plain">
            {proposal.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
