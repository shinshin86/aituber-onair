import type { PsdAvatarController } from '../hooks/usePsdAvatar';
import type { PsdModelNode } from '../lib/psdModel';
import { getNodeVisible, isEffectivelyVisible } from '../lib/psdVisibility';

interface LayerTreePanelProps {
  psdAvatar: PsdAvatarController;
  disabled: boolean;
}

function LayerRow({
  node,
  psdAvatar,
  disabled,
}: {
  node: PsdModelNode;
  psdAvatar: PsdAvatarController;
  disabled: boolean;
}) {
  const { model, visibility } = psdAvatar;
  if (!model) return null;

  const ownVisible = getNodeVisible(node, visibility);
  const effectiveVisible = isEffectivelyVisible(model, node.id, visibility);

  return (
    <div
      className="layer-tree-row"
      style={{ paddingLeft: `${node.depth * 16}px` }}
    >
      <span className="layer-tree-kind">
        {node.kind === 'group' ? '▾' : '•'}
      </span>
      {node.forcedVisible ? (
        <span className="layer-tree-forced">!</span>
      ) : node.radio ? (
        <input
          type="radio"
          checked={ownVisible}
          disabled={disabled}
          onChange={() => psdAvatar.setLayerVisible(node.id, true)}
        />
      ) : (
        <input
          type="checkbox"
          checked={ownVisible}
          disabled={disabled}
          onChange={(event) =>
            psdAvatar.setLayerVisible(node.id, event.target.checked)
          }
        />
      )}
      <span
        className={`layer-tree-name${effectiveVisible ? '' : ' is-muted'}`}
        title={node.rawName}
      >
        {node.displayName}
      </span>
      {node.flip !== 'none' && (
        <span className="layer-tree-badge">flip{node.flip}</span>
      )}
    </div>
  );
}

function LayerBranch({
  nodeId,
  psdAvatar,
  disabled,
}: {
  nodeId: string;
  psdAvatar: PsdAvatarController;
  disabled: boolean;
}) {
  const model = psdAvatar.model;
  if (!model) return null;

  const node = model.nodes[nodeId];
  if (!node) return null;

  return (
    <>
      <LayerRow node={node} psdAvatar={psdAvatar} disabled={disabled} />
      {node.kind === 'group' &&
        node.childIds.map((childId) => (
          <LayerBranch
            key={childId}
            nodeId={childId}
            psdAvatar={psdAvatar}
            disabled={disabled}
          />
        ))}
    </>
  );
}

export function LayerTreePanel({ psdAvatar, disabled }: LayerTreePanelProps) {
  if (!psdAvatar.model) {
    return <p className="settings-note">No PSD loaded.</p>;
  }

  return (
    <div className="layer-tree-panel">
      {psdAvatar.model.rootIds.map((nodeId) => (
        <LayerBranch
          key={nodeId}
          nodeId={nodeId}
          psdAvatar={psdAvatar}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
