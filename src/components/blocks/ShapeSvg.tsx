import React from 'react';
import { ShapeConfig, ShapeKind } from '../../types';

interface ShapeSvgProps {
  shape?: ShapeConfig;
  // Backward compatibility props:
  kind?: ShapeKind;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
  width?: number | string;
  height?: number | string;
}

export const ShapeSvg: React.FC<ShapeSvgProps> = ({
  shape,
  kind: propKind,
  color: propColor,
  className = '',
  style = {},
  width,
  height,
}) => {
  // Normalize configuration from shape object or individual props
  const kind: ShapeKind = shape?.kind || propKind || 'rect';
  const rawStartColor = shape?.color || propColor || '#4A6D22';
  const isTransparent = Boolean(shape?.fillTransparent);
  const isGradient = Boolean(shape?.gradient && !isTransparent);
  const rawEndColor = shape?.gradientEndColor || '#88B04B';
  const gradientAngle = shape?.gradientAngle ?? 135; // degrees (0-360)

  const strokeColor = shape?.strokeColor || '#365314';
  const strokeWidth = shape?.strokeWidth !== undefined ? shape.strokeWidth : 2;
  const borderStyle = shape?.borderStyle || 'solid';
  const radius = shape?.radius !== undefined ? shape.radius : 12;

  // Pattern textures
  const patternType = shape?.pattern && shape.pattern !== 'none' ? shape.pattern : null;
  const patternColor = shape?.patternColor || '#FFFFFF70';
  const patternScale = Math.max(0.5, Math.min(3, shape?.patternScale || 1));
  
  // Opacity: if > 1 it's 0-100 scale, if <= 1 it's 0-1 scale
  const rawOpacity = shape?.opacity !== undefined ? shape.opacity : 1;
  const normalizedOpacity = rawOpacity > 1 ? rawOpacity / 100 : rawOpacity;
  const isVisible = shape?.visible !== false;

  // Shadow and 3D lighting
  const hasShadow = shape?.shadow !== false;
  const shadowType = shape?.shadowType || (hasShadow ? 'soft' : 'none');

  // Rotation in degrees
  const rotation = (shape?.rotation ?? 0) % 360;

  // Text inside shape
  const innerText = shape?.text || '';
  const textColor = shape?.textColor || '#FFFFFF';
  const textSize = shape?.textSize || 13;
  const isBold = shape?.textBold ?? true;
  const textAlign = shape?.textAlign || (kind === 'textbox' ? 'right' : 'center');

  // Stroke dasharray based on style
  let strokeDasharray: string | undefined = undefined;
  if (borderStyle === 'dashed') strokeDasharray = '6 4';
  if (borderStyle === 'dotted') strokeDasharray = '2 3';

  // Sizing
  const renderWidth = width ?? shape?.width ?? 220;
  const renderHeight = height ?? shape?.height ?? 110;

  // Viewbox coordinates (standard 200x120 aspect for standardizing paths)
  const viewBoxWidth = 200;
  const viewBoxHeight = 120;
  const pad = Math.max(4, strokeWidth);

  const filterId = React.useId().replace(/:/g, '');
  const gradientId = React.useId().replace(/:/g, '');
  const patternId = React.useId().replace(/:/g, '');

  if (!isVisible) {
    return null;
  }

  // Calculate linear gradient coordinates from angle
  const angleRad = ((gradientAngle - 90) * Math.PI) / 180;
  const x1 = `${Math.round(50 - 50 * Math.cos(angleRad))}%`;
  const y1 = `${Math.round(50 - 50 * Math.sin(angleRad))}%`;
  const x2 = `${Math.round(50 + 50 * Math.cos(angleRad))}%`;
  const y2 = `${Math.round(50 + 50 * Math.sin(angleRad))}%`;

  // Final fill color, gradient or pattern reference
  let baseFill = 'transparent';
  if (!isTransparent) {
    baseFill = isGradient ? `url(#${gradientId})` : rawStartColor;
  }

  let finalFill = baseFill;
  if (patternType) {
    finalFill = `url(#${patternId})`;
  }

  const activeFilterUrl =
    hasShadow && shadowType !== 'none' ? `url(#${filterId}-${shadowType})` : undefined;

  const commonProps = {
    fill: finalFill,
    stroke: strokeWidth > 0 ? strokeColor : 'none',
    strokeWidth,
    strokeDasharray,
    filter: activeFilterUrl,
  };

  const renderShapePath = () => {
    switch (kind) {
      case 'rect':
        return (
          <rect
            x={pad}
            y={pad}
            width={viewBoxWidth - pad * 2}
            height={viewBoxHeight - pad * 2}
            rx={radius}
            ry={radius}
            {...commonProps}
          />
        );

      case 'roundedRect':
        return (
          <rect
            x={pad}
            y={pad}
            width={viewBoxWidth - pad * 2}
            height={viewBoxHeight - pad * 2}
            rx={Math.max(18, radius)}
            ry={Math.max(18, radius)}
            {...commonProps}
          />
        );

      case 'circle':
        return (
          <ellipse
            cx={viewBoxWidth / 2}
            cy={viewBoxHeight / 2}
            rx={(viewBoxWidth - pad * 2) / 2}
            ry={(viewBoxHeight - pad * 2) / 2}
            {...commonProps}
          />
        );

      case 'triangle':
        return (
          <polygon
            points={`${viewBoxWidth / 2},${pad + 2} ${viewBoxWidth - pad},${viewBoxHeight - pad} ${pad},${viewBoxHeight - pad}`}
            strokeLinejoin="round"
            {...commonProps}
          />
        );

      case 'diamond':
        return (
          <polygon
            points={`${viewBoxWidth / 2},${pad + 2} ${viewBoxWidth - pad},${viewBoxHeight / 2} ${viewBoxWidth / 2},${viewBoxHeight - pad - 2} ${pad},${viewBoxHeight / 2}`}
            strokeLinejoin="round"
            {...commonProps}
          />
        );

      case 'hexagon': {
        const xOffset = 36;
        return (
          <polygon
            points={`${xOffset},${pad} ${viewBoxWidth - xOffset},${pad} ${viewBoxWidth - pad},${viewBoxHeight / 2} ${viewBoxWidth - xOffset},${viewBoxHeight - pad} ${xOffset},${viewBoxHeight - pad} ${pad},${viewBoxHeight / 2}`}
            strokeLinejoin="round"
            {...commonProps}
          />
        );
      }

      case 'arrow':
        return (
          <path
            d={`M ${pad + 8} ${viewBoxHeight * 0.35} H ${viewBoxWidth * 0.58} V ${pad + 8} L ${viewBoxWidth - pad - 4} ${viewBoxHeight / 2} L ${viewBoxWidth * 0.58} ${viewBoxHeight - pad - 8} V ${viewBoxHeight * 0.65} H ${pad + 8} Z`}
            strokeLinejoin="round"
            strokeLinecap="round"
            {...commonProps}
          />
        );

      case 'leftArrow':
        return (
          <path
            d={`M ${viewBoxWidth - pad - 8} ${viewBoxHeight * 0.35} H ${viewBoxWidth * 0.42} V ${pad + 8} L ${pad + 4} ${viewBoxHeight / 2} L ${viewBoxWidth * 0.42} ${viewBoxHeight - pad - 8} V ${viewBoxHeight * 0.65} H ${viewBoxWidth - pad - 8} Z`}
            strokeLinejoin="round"
            strokeLinecap="round"
            {...commonProps}
          />
        );

      case 'doubleArrow':
        return (
          <path
            d={`M ${viewBoxWidth * 0.3} ${pad + 10} L ${pad + 4} ${viewBoxHeight / 2} L ${viewBoxWidth * 0.3} ${viewBoxHeight - pad - 10} V ${viewBoxHeight * 0.65} H ${viewBoxWidth * 0.7} V ${viewBoxHeight - pad - 10} L ${viewBoxWidth - pad - 4} ${viewBoxHeight / 2} L ${viewBoxWidth * 0.7} ${pad + 10} V ${viewBoxHeight * 0.35} H ${viewBoxWidth * 0.3} Z`}
            strokeLinejoin="round"
            strokeLinecap="round"
            {...commonProps}
          />
        );

      case 'line':
        return (
          <line
            x1={pad + 8}
            y1={viewBoxHeight / 2}
            x2={viewBoxWidth - pad - 8}
            y2={viewBoxHeight / 2}
            stroke={finalFill !== 'transparent' && !isGradient ? finalFill : strokeColor}
            strokeWidth={Math.max(4, strokeWidth * 2)}
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
            filter={activeFilterUrl}
          />
        );

      case 'star': {
        // 5-point star
        const cx = viewBoxWidth / 2;
        const cy = viewBoxHeight / 2;
        const outerR = Math.min(viewBoxWidth, viewBoxHeight) / 2 - pad - 2;
        const innerR = outerR * 0.45;
        const points: string[] = [];
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? outerR : innerR;
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          const x = cx + r * Math.cos(angle) * 1.3;
          const y = cy + r * Math.sin(angle);
          points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
        }
        return <polygon points={points.join(' ')} strokeLinejoin="round" {...commonProps} />;
      }

      case 'callout':
        return (
          <path
            d={`M ${pad + 12} ${pad} H ${viewBoxWidth - pad - 12} A 12 12 0 0 1 ${viewBoxWidth - pad} ${pad + 12} V ${viewBoxHeight - 34} A 12 12 0 0 1 ${viewBoxWidth - pad - 12} ${viewBoxHeight - 22} H 70 L 40 ${viewBoxHeight - pad} L 46 ${viewBoxHeight - 22} H ${pad + 12} A 12 12 0 0 1 ${pad} ${viewBoxHeight - 34} V ${pad + 12} A 12 12 0 0 1 ${pad + 12} ${pad} Z`}
            strokeLinejoin="round"
            {...commonProps}
          />
        );

      case 'cloud':
        return (
          <path
            d={`M 40 85 A 25 25 0 0 1 45 42 A 36 36 0 0 1 100 28 A 38 38 0 0 1 160 42 A 28 28 0 0 1 165 85 A 20 20 0 0 1 145 100 H 55 A 20 20 0 0 1 40 85 Z`}
            strokeLinejoin="round"
            {...commonProps}
          />
        );

      case 'heart':
        return (
          <path
            d={`M ${viewBoxWidth / 2} ${viewBoxHeight - pad - 6} C ${viewBoxWidth / 2} ${viewBoxHeight - pad - 6}, ${pad + 8} ${viewBoxHeight * 0.65}, ${pad + 8} ${viewBoxHeight * 0.35} C ${pad + 8} ${pad}, ${viewBoxWidth * 0.42} ${pad}, ${viewBoxWidth / 2} ${viewBoxHeight * 0.3} C ${viewBoxWidth * 0.58} ${pad}, ${viewBoxWidth - pad - 8} ${pad}, ${viewBoxWidth - pad - 8} ${viewBoxHeight * 0.35} C ${viewBoxWidth - pad - 8} ${viewBoxHeight * 0.65}, ${viewBoxWidth / 2} ${viewBoxHeight - pad - 6}, ${viewBoxWidth / 2} ${viewBoxHeight - pad - 6} Z`}
            strokeLinejoin="round"
            {...commonProps}
          />
        );

      case 'badge':
        return (
          <path
            d={`M ${pad + 14} ${pad} H ${viewBoxWidth - pad - 14} L ${viewBoxWidth - pad} ${viewBoxHeight / 2} L ${viewBoxWidth - pad - 14} ${viewBoxHeight - pad} H ${pad + 14} L ${pad + 28} ${viewBoxHeight / 2} Z`}
            strokeLinejoin="round"
            {...commonProps}
          />
        );

      case 'textbox':
        return (
          <rect
            x={pad}
            y={pad}
            width={viewBoxWidth - pad * 2}
            height={viewBoxHeight - pad * 2}
            rx={radius !== undefined ? radius : 8}
            ry={radius !== undefined ? radius : 8}
            {...commonProps}
          />
        );

      default:
        return (
          <rect
            x={pad}
            y={pad}
            width={viewBoxWidth - pad * 2}
            height={viewBoxHeight - pad * 2}
            rx={radius}
            ry={radius}
            {...commonProps}
          />
        );
    }
  };

  // Adjust text center for shapes with asymmetric center of mass
  let textCenterY = viewBoxHeight / 2;
  if (kind === 'triangle') textCenterY = viewBoxHeight * 0.62;
  if (kind === 'callout') textCenterY = (viewBoxHeight - 22) / 2;
  if (kind === 'cloud') textCenterY = viewBoxHeight * 0.55;

  return (
    <svg
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      className={`select-none transition-transform ${className}`}
      style={{
        width: typeof renderWidth === 'number' ? `${renderWidth}px` : renderWidth,
        height: typeof renderHeight === 'number' ? `${renderHeight}px` : renderHeight,
        maxWidth: '100%',
        maxHeight: '100%',
        display: 'inline-block',
        verticalAlign: 'middle',
        opacity: normalizedOpacity,
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        transformOrigin: 'center center',
        overflow: 'visible',
        ...style,
      }}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        {/* Two-color linear gradient */}
        {isGradient && (
          <linearGradient id={gradientId} x1={x1} y1={y1} x2={x2} y2={y2}>
            <stop offset="0%" stopColor={rawStartColor} />
            <stop offset="100%" stopColor={rawEndColor} />
          </linearGradient>
        )}

        {/* 1. Soft Shadow filter */}
        <filter id={`${filterId}-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3.5" stdDeviation="3.5" floodOpacity="0.22" floodColor="#000000" />
        </filter>

        {/* 2. 3D Lighting Shadow filter */}
        <filter id={`${filterId}-3d`} x="-25%" y="-25%" width="150%" height="160%">
          <feDropShadow dx="3" dy="6" stdDeviation="2.5" floodOpacity="0.45" floodColor="#000000" />
          <feDropShadow dx="-1" dy="-1" stdDeviation="1.2" floodOpacity="0.25" floodColor="#FFFFFF" />
        </filter>

        {/* 3. Deep Floating Shadow filter */}
        <filter id={`${filterId}-deep`} x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="12" stdDeviation="10" floodOpacity="0.35" floodColor="#000000" />
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.22" floodColor="#000000" />
        </filter>

        {/* 4. Neon Glow Shadow filter */}
        <filter id={`${filterId}-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow
            dx="0"
            dy="0"
            stdDeviation="6"
            floodColor={rawStartColor !== 'transparent' ? rawStartColor : strokeColor}
            floodOpacity="0.8"
          />
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.2" floodColor="#000000" />
        </filter>

        {/* 5. Pattern Definitions */}
        {patternType === 'dots' && (
          <pattern
            id={patternId}
            width={12 * patternScale}
            height={12 * patternScale}
            patternUnits="userSpaceOnUse"
          >
            {!isTransparent && (
              <rect
                width={12 * patternScale}
                height={12 * patternScale}
                fill={isGradient ? `url(#${gradientId})` : rawStartColor}
              />
            )}
            <circle
              cx={6 * patternScale}
              cy={6 * patternScale}
              r={1.8 * patternScale}
              fill={patternColor}
            />
          </pattern>
        )}

        {patternType === 'grid' && (
          <pattern
            id={patternId}
            width={16 * patternScale}
            height={16 * patternScale}
            patternUnits="userSpaceOnUse"
          >
            {!isTransparent && (
              <rect
                width={16 * patternScale}
                height={16 * patternScale}
                fill={isGradient ? `url(#${gradientId})` : rawStartColor}
              />
            )}
            <path
              d={`M ${16 * patternScale} 0 L 0 0 0 ${16 * patternScale}`}
              fill="none"
              stroke={patternColor}
              strokeWidth={1.2 * patternScale}
            />
          </pattern>
        )}

        {patternType === 'stripes' && (
          <pattern
            id={patternId}
            width={12 * patternScale}
            height={12 * patternScale}
            patternUnits="userSpaceOnUse"
          >
            {!isTransparent && (
              <rect
                width={12 * patternScale}
                height={12 * patternScale}
                fill={isGradient ? `url(#${gradientId})` : rawStartColor}
              />
            )}
            <line
              x1="0"
              y1={6 * patternScale}
              x2={12 * patternScale}
              y2={6 * patternScale}
              stroke={patternColor}
              strokeWidth={2.4 * patternScale}
            />
          </pattern>
        )}

        {patternType === 'stripes-diagonal' && (
          <pattern
            id={patternId}
            width={14 * patternScale}
            height={14 * patternScale}
            patternUnits="userSpaceOnUse"
          >
            {!isTransparent && (
              <rect
                width={14 * patternScale}
                height={14 * patternScale}
                fill={isGradient ? `url(#${gradientId})` : rawStartColor}
              />
            )}
            <path
              d={`M -3,3 l 6,-6 M 0,${14 * patternScale} l ${14 * patternScale},-${14 * patternScale} M ${11 * patternScale},${17 * patternScale} l 6,-6`}
              stroke={patternColor}
              strokeWidth={1.8 * patternScale}
            />
          </pattern>
        )}

        {patternType === 'crosshatch' && (
          <pattern
            id={patternId}
            width={14 * patternScale}
            height={14 * patternScale}
            patternUnits="userSpaceOnUse"
          >
            {!isTransparent && (
              <rect
                width={14 * patternScale}
                height={14 * patternScale}
                fill={isGradient ? `url(#${gradientId})` : rawStartColor}
              />
            )}
            <path
              d={`M 0 0 L ${14 * patternScale} ${14 * patternScale} M ${14 * patternScale} 0 L 0 ${14 * patternScale}`}
              stroke={patternColor}
              strokeWidth={1.4 * patternScale}
            />
          </pattern>
        )}

        {patternType === 'blueprint' && (
          <pattern
            id={patternId}
            width={20 * patternScale}
            height={20 * patternScale}
            patternUnits="userSpaceOnUse"
          >
            {!isTransparent && (
              <rect
                width={20 * patternScale}
                height={20 * patternScale}
                fill={isGradient ? `url(#${gradientId})` : rawStartColor}
              />
            )}
            <path
              d={`M ${20 * patternScale} 0 L 0 0 0 ${20 * patternScale}`}
              fill="none"
              stroke={patternColor}
              strokeWidth={1.2 * patternScale}
              opacity="0.8"
            />
            <path
              d={`M ${10 * patternScale} 0 L ${10 * patternScale} ${20 * patternScale} M 0 ${10 * patternScale} L ${20 * patternScale} ${10 * patternScale}`}
              fill="none"
              stroke={patternColor}
              strokeWidth={0.6 * patternScale}
              strokeDasharray="2 2"
              opacity="0.5"
            />
          </pattern>
        )}

        {patternType === 'waves' && (
          <pattern
            id={patternId}
            width={20 * patternScale}
            height={12 * patternScale}
            patternUnits="userSpaceOnUse"
          >
            {!isTransparent && (
              <rect
                width={20 * patternScale}
                height={12 * patternScale}
                fill={isGradient ? `url(#${gradientId})` : rawStartColor}
              />
            )}
            <path
              d={`M 0 ${6 * patternScale} Q ${5 * patternScale} 0, ${10 * patternScale} ${6 * patternScale} T ${20 * patternScale} ${6 * patternScale}`}
              fill="none"
              stroke={patternColor}
              strokeWidth={1.6 * patternScale}
            />
          </pattern>
        )}
      </defs>

      {/* Shape vector path */}
      {renderShapePath()}

      {/* Optional embedded text (Word-like feature) */}
      {innerText.trim() !== '' ? (
        <text
          x={
            textAlign === 'right'
              ? viewBoxWidth - pad - 12
              : textAlign === 'left'
              ? pad + 12
              : viewBoxWidth / 2
          }
          y={textCenterY}
          fill={textColor}
          fontSize={textSize * 1.25}
          fontWeight={isBold ? 'bold' : 'normal'}
          fontFamily="system-ui, -apple-system, 'Vazirmatn', sans-serif"
          textAnchor={textAlign === 'right' ? 'end' : textAlign === 'left' ? 'start' : 'middle'}
          dominantBaseline="central"
          direction={textAlign === 'left' ? 'ltr' : 'rtl'}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {(() => {
            const lines = innerText.split('\n');
            const lineH = textSize * 1.45;
            const totalH = (lines.length - 1) * lineH;
            return lines.map((line, idx) => (
              <tspan
                key={idx}
                x={
                  textAlign === 'right'
                    ? viewBoxWidth - pad - 12
                    : textAlign === 'left'
                    ? pad + 12
                    : viewBoxWidth / 2
                }
                dy={idx === 0 ? -(totalH / 2) : lineH}
              >
                {line}
              </tspan>
            ));
          })()}
        </text>
      ) : (
        kind === 'textbox' && (
          <text
            x={viewBoxWidth / 2}
            y={textCenterY}
            fill={textColor}
            opacity={0.45}
            fontSize={textSize * 1.05}
            fontFamily="system-ui, -apple-system, 'Vazirmatn', sans-serif"
            textAnchor="middle"
            dominantBaseline="central"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            کادر متنی (برای نوشتن کلیک کنید)
          </text>
        )
      )}
    </svg>
  );
};
